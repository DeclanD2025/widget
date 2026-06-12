"""Operator CLI: init-db, run, classify, force-trigger, render, backfill."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import structlog
import typer
from sqlalchemy import select

import manager_watch.logging_config  # noqa: F401  (configures structlog on import)
from manager_watch.settings import settings

app = typer.Typer(help="Motherwell manager-watch & research system")
log = structlog.get_logger(__name__)


@app.command()
def init_db() -> None:
    """Create all tables (dev quick-start; use alembic for production)."""
    from manager_watch.db.models import Base
    from manager_watch.db.seed import ensure_watched_club, sync_sources
    from manager_watch.db.session import get_engine, get_session

    Base.metadata.create_all(get_engine())
    with get_session() as session:
        sync_sources(session)
        ensure_watched_club(session)
    typer.echo("database initialised and sources synced")


@app.command()
def run() -> None:
    """Start the monitoring scheduler (blocks)."""
    from manager_watch.scheduler import run_forever

    asyncio.run(run_forever())


@app.command()
def classify(headline: str, body: str = "") -> None:
    """Debug: classify a headline through the trigger rule engine."""
    from manager_watch.trigger.rules import classify as do_classify
    from manager_watch.types import NewsItem

    result = do_classify(NewsItem(source_name="cli", publisher="cli",
                                  url="cli://", headline=headline, body_text=body))
    typer.echo(f"classification : {result.classification}")
    typer.echo(f"extracted_name : {result.extracted_name}")
    typer.echo(f"is_interim     : {result.is_interim}")
    typer.echo(f"patterns       : {result.matched_patterns}")


@app.command()
def force_trigger(
    name: str = typer.Option(..., help="Manager name, e.g. 'Jane Doe'"),
    transfermarkt_id: str = typer.Option(None, help="Bind a known Transfermarkt trainer id"),
    interim: bool = typer.Option(False),
) -> None:
    """Manually create a CONFIRMED appointment and run the research pipeline
    (staging dry-runs, or resolving IDENTITY_AMBIGUOUS failures)."""
    from manager_watch.db.models import Appointment, Manager
    from manager_watch.db.seed import ensure_watched_club
    from manager_watch.db.session import get_session
    from manager_watch.research.orchestrator import run_research
    from manager_watch.trigger.rules import normalize_name

    canonical = normalize_name(name)
    with get_session() as session:
        club = ensure_watched_club(session)
        manager = session.scalar(
            select(Manager).where(Manager.canonical_name == canonical)
        )
        if manager is None:
            manager = Manager(canonical_name=canonical, full_name=name)
            session.add(manager)
            session.flush()
        if transfermarkt_id:
            manager.transfermarkt_id = transfermarkt_id
        now = datetime.now(timezone.utc)
        appointment = session.scalar(
            select(Appointment).where(Appointment.manager_id == manager.id,
                                      Appointment.club_id == club.id)
        )
        if appointment is None:
            previous = session.scalar(
                select(Appointment).where(Appointment.club_id == club.id,
                                          Appointment.status == "ACTIVE")
            )
            if previous:
                previous.status = "SUPERSEDED"
                session.flush()
            appointment = Appointment(
                manager_id=manager.id, club_id=club.id,
                announced_at=now, announced_on=now.date(),
                is_interim=interim, confirmation_score=1.0,
            )
            session.add(appointment)
            session.flush()
        typer.echo(f"running research for appointment {appointment.id} ({canonical})")
        asyncio.run(run_research(session, appointment))
        typer.echo("research complete; see reports table and output/ directory")


@app.command()
def render(appointment_id: int) -> None:
    """Re-render the dossier + report for an appointment from stored claims."""
    from manager_watch.db.models import Appointment
    from manager_watch.db.session import get_session
    from manager_watch.output.json_builder import build_dossier
    from manager_watch.output.report import render_report, save_report

    with get_session() as session:
        appointment = session.get(Appointment, appointment_id)
        if appointment is None:
            raise typer.BadParameter(f"no appointment {appointment_id}")
        dossier = build_dossier(session, appointment)
        markdown = render_report(dossier)
        save_report(session, appointment, dossier, markdown)
        typer.echo(markdown)


@app.command()
def backfill(from_ts: str = typer.Option(..., help="ISO timestamp")) -> None:
    """Re-parse stored raw_documents through current parsers (after a parser
    fix). TODO: implement replay loop over raw_documents."""
    raise typer.Exit("backfill not implemented yet — see HANDOFF.md")


if __name__ == "__main__":
    app()
