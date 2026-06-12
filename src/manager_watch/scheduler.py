"""APScheduler wiring: per-source polling jobs (with jitter), quorum check
after each poll, watchdog, and research kickoff."""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from manager_watch import alerts
from manager_watch.db.models import Appointment, Source
from manager_watch.db.seed import ensure_watched_club, sync_sources
from manager_watch.db.session import get_session
from manager_watch.monitor.service import check_quorum, poll_source
from manager_watch.research.orchestrator import run_research
from manager_watch.trigger import state_machine

log = structlog.get_logger(__name__)

WATCHDOG_MINUTES = 30
_last_success: dict[str, datetime] = {}


async def poll_job(source_name: str) -> None:
    with get_session() as session:
        source = session.scalar(select(Source).where(Source.name == source_name))
        if source is None or source.status == "DISABLED":
            return
        events = await poll_source(session, source)
        _last_success[source_name] = datetime.now(timezone.utc)
        if not events:
            return
        club = ensure_watched_club(session)
        appointment = check_quorum(session, club)
        if appointment is not None:
            session.flush()
            asyncio.get_event_loop().create_task(research_job(appointment.id))


async def research_job(appointment_id: int) -> None:
    with get_session() as session:
        appointment = session.get(Appointment, appointment_id)
        if appointment is None or appointment.research_state in ("RUNNING", "COMPLETE"):
            return
        club_id = appointment.club_id
        state_machine.advance(session, club_id, "RESEARCHING",
                              appointment.manager.canonical_name)
        try:
            await run_research(session, appointment)
            state_machine.advance(session, club_id, "COMPLETE")
            alerts.send_alert(
                f"Research complete: {appointment.manager.canonical_name}",
                level="info",
            )
        except Exception as exc:
            log.exception("research.failed", appointment_id=appointment_id)
            state_machine.advance(session, club_id, "CONFIRMED")  # allow retry
            alerts.send_alert(
                f"Research FAILED for {appointment.manager.canonical_name}",
                str(exc), level="critical",
            )


async def watchdog_job() -> None:
    if not _last_success:
        return
    threshold = datetime.now(timezone.utc) - timedelta(minutes=WATCHDOG_MINUTES)
    with get_session() as session:
        critical = session.scalars(
            select(Source).where(Source.tier.in_(["OFFICIAL", "TIER1"]),
                                 Source.status != "DISABLED")
        )
        stale = [
            source.name for source in critical
            if _last_success.get(source.name, datetime.min.replace(tzinfo=timezone.utc))
            < threshold
        ]
    if stale and len(stale) == len(set(stale)):
        alerts.send_alert(
            "Watchdog: no successful polls on critical sources",
            ", ".join(stale), level="critical",
        )


def build_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    with get_session() as session:
        sources = sync_sources(session)
        ensure_watched_club(session)
        for source in sources:
            if not source.poll_seconds:
                continue
            scheduler.add_job(
                poll_job, "interval",
                seconds=source.poll_seconds,
                jitter=max(1, source.poll_seconds // 10),
                args=[source.name],
                id=f"poll:{source.name}",
                max_instances=1, coalesce=True,
            )
        # resume any research interrupted by a crash
        pending = session.scalars(
            select(Appointment).where(Appointment.research_state.in_(["PENDING", "FAILED"]),
                                      Appointment.status == "ACTIVE")
        )
        for appointment in pending:
            scheduler.add_job(research_job, args=[appointment.id],
                              id=f"research:{appointment.id}")
    scheduler.add_job(watchdog_job, "interval", minutes=5, id="watchdog")
    return scheduler


async def run_forever() -> None:
    scheduler = build_scheduler()
    scheduler.start()
    log.info("scheduler.started", jobs=[job.id for job in scheduler.get_jobs()])
    try:
        await asyncio.Event().wait()
    finally:
        scheduler.shutdown()
