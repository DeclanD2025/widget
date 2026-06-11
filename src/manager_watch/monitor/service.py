"""Poll cycle for one source: fetch -> snapshot -> parse -> dedup ->
classify -> store detection events -> quorum -> (maybe) trigger research.

Design §3 steps 1-3.
"""
from __future__ import annotations

import gzip
import hashlib
from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from manager_watch import alerts
from manager_watch.db.models import (
    Appointment,
    Club,
    DetectionEvent,
    Manager,
    RawDocument,
    Source,
)
from manager_watch.monitor import dedup, fetcher
from manager_watch.monitor.parsers import get_parser
from manager_watch.settings import settings
from manager_watch.trigger import quorum, rules, state_machine
from manager_watch.types import NewsItem

log = structlog.get_logger(__name__)

CIRCUIT_BREAKER_THRESHOLD = 5
RECENT_HEADLINE_HOURS = 72


async def poll_source(session: Session, source: Source) -> list[DetectionEvent]:
    client = fetcher.build_client()
    try:
        result = await fetcher.fetch(
            client, source.url, etag=source.etag, last_modified=source.last_modified
        )
    except Exception as exc:
        source.consecutive_failures += 1
        if source.consecutive_failures == CIRCUIT_BREAKER_THRESHOLD:
            source.status = "DEGRADED"
            alerts.send_alert(f"Source degraded: {source.name}", str(exc), level="warning")
        log.warning("poll.failed", source=source.name, error=str(exc))
        return []
    finally:
        await client.aclose()

    source.consecutive_failures = 0
    if source.status == "DEGRADED":
        source.status = "ACTIVE"
    source.etag = result.etag
    source.last_modified = result.last_modified
    if result.not_modified or result.content is None:
        return []

    doc = RawDocument(
        source_id=source.id, url=source.url,
        fetched_at=result.fetched_at or datetime.now(timezone.utc),
        http_status=result.status, content_sha256=result.sha256,
        content_gz=result.content_gz,
    )
    session.add(doc)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()  # identical snapshot already stored
        return []

    parse = get_parser(source.parser or "rss")
    items = parse(result.text, base_url=source.url,
                  source_name=source.name, publisher=source.publisher)
    return store_events(session, source, doc, items)


def store_events(session: Session, source: Source, doc: RawDocument,
                 items: list[NewsItem]) -> list[DetectionEvent]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=RECENT_HEADLINE_HOURS)
    recent_headlines = list(session.scalars(
        select(DetectionEvent.headline)
        .where(DetectionEvent.created_at >= cutoff,
               DetectionEvent.classification != "DUPLICATE")
    ))

    stored: list[DetectionEvent] = []
    for item in items:
        item_hash = dedup.dedup_hash(item.url, item.headline)
        exists = session.scalar(
            select(DetectionEvent.id).where(DetectionEvent.dedup_hash == item_hash)
        )
        if exists:
            continue
        result = rules.classify(item)
        classification = result.classification
        if classification in ("CANDIDATE", "CONFIRMATION") and dedup.is_fuzzy_duplicate(
            item.headline, recent_headlines
        ):
            # same story from the same publisher re-worded; keep cross-publisher
            # corroboration (quorum needs it) but flag same-publisher repeats
            same_publisher = session.scalar(
                select(DetectionEvent.id)
                .join(Source, Source.id == DetectionEvent.source_id)
                .where(Source.publisher == item.publisher,
                       DetectionEvent.extracted_name == result.extracted_name,
                       DetectionEvent.created_at >= cutoff)
            )
            if same_publisher:
                classification = "DUPLICATE"
        event = DetectionEvent(
            source_id=source.id, raw_document_id=doc.id, url=item.url,
            headline=item.headline, published_at=item.published_at,
            dedup_hash=item_hash, classification=classification,
            extracted_name=result.extracted_name, is_interim=result.is_interim,
            matched_patterns=result.matched_patterns or None,
        )
        session.add(event)
        try:
            session.flush()
        except IntegrityError:
            session.rollback()
            continue
        stored.append(event)
        recent_headlines.append(item.headline)
        if classification in ("CANDIDATE", "CONFIRMATION", "SPECULATION"):
            log.info("detection", classification=classification,
                     headline=item.headline, name=result.extracted_name,
                     source=source.name)
    return stored


def check_quorum(session: Session, club: Club) -> Appointment | None:
    """Evaluate the rolling-window quorum; create the appointment row on
    confirmation. Returns the new Appointment or None."""
    window_start = datetime.now(timezone.utc) - timedelta(
        hours=settings.quorum_window_hours
    )
    recent = session.execute(
        select(DetectionEvent, Source)
        .join(Source, Source.id == DetectionEvent.source_id)
        .where(DetectionEvent.created_at >= window_start)
    ).all()
    events = [
        quorum.QuorumEvent(
            publisher=source.publisher, tier=source.tier, weight=float(source.weight),
            classification=event.classification, extracted_name=event.extracted_name,
            observed_at=event.created_at.replace(tzinfo=timezone.utc)
            if event.created_at.tzinfo is None else event.created_at,
            is_interim=event.is_interim,
        )
        for event, source in recent
    ]
    result = quorum.evaluate(events)

    if result.candidate and not result.confirmed:
        try:
            state_machine.advance(session, club.id, "CANDIDATE", result.name)
            alerts.send_alert(
                f"Candidate manager detected: {result.name}",
                f"score={result.score} publishers={result.publishers}",
            )
        except state_machine.InvalidTransition:
            pass
        return None
    if not result.confirmed:
        return None

    manager = session.scalar(
        select(Manager).where(Manager.canonical_name == result.name)
    )
    if manager is None:
        manager = Manager(canonical_name=result.name)
        session.add(manager)
        session.flush()

    now = datetime.now(timezone.utc)
    appointment = Appointment(
        manager_id=manager.id, club_id=club.id,
        announced_at=now, announced_on=now.date(),
        is_interim=result.is_interim,
        confirmation_score=result.score, status="ACTIVE",
    )
    # supersede any previous active appointment before the partial unique
    # index would reject the insert
    previous = session.scalar(
        select(Appointment).where(Appointment.club_id == club.id,
                                  Appointment.status == "ACTIVE")
    )
    if previous is not None:
        if previous.manager_id == manager.id:
            return None  # duplicate confirmation for the current manager
        previous.status = "SUPERSEDED"
        session.flush()
    session.add(appointment)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()  # duplicate-run guard fired
        return None

    state_machine.advance(session, club.id, "CONFIRMED", result.name)
    alerts.send_alert(
        f"CONFIRMED: {result.name} appointed at {club.name}",
        f"score={result.score} publishers={result.publishers}",
        level="critical",
    )
    return appointment
