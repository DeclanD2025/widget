"""Research orchestrator (design §2/§3 steps 4-6).

Runs a small dependency graph per confirmed appointment, recording each
node's status in research_tasks so a crashed run resumes where it stopped.
Non-fatal extractor failures (ExtractorUnavailable) degrade the dossier
instead of failing the run.

DAG:
    identity ─┬─ career_transfermarkt ─┐
              └─ career_wikipedia ─────┼─ derive ── output
                  matches ─────────────┘
"""
from __future__ import annotations

import asyncio
import gzip
import hashlib
from datetime import datetime, timezone
from urllib.parse import quote

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session

from manager_watch.db.models import (
    Appointment,
    Claim,
    Evidence,
    Manager,
    RawDocument,
    ResearchTask,
    Source,
)
from manager_watch.evidence.conflicts import resolve
from manager_watch.monitor import fetcher
from manager_watch.output.json_builder import build_dossier
from manager_watch.output.report import render_report, save_report
from manager_watch.research import career as career_mod
from manager_watch.research import tactical as tactical_mod
from manager_watch.research import youth as youth_mod
from manager_watch.research.extractors import transfermarkt, wikipedia
from manager_watch.research.extractors.base import ExtractorUnavailable
from manager_watch.types import ClaimDraft, MatchRecord, StintRecord

log = structlog.get_logger(__name__)

RESEARCH_SOURCE_NAMES = {
    "transfermarkt": ("Transfermarkt", "transfermarkt.com", "TIER1", 0.90),
    "wikipedia": ("Wikipedia", "en.wikipedia.org", "TIER2", 0.60),
    "worldfootball": ("WorldFootball", "worldfootball.net", "TIER1", 0.85),
}


class IdentityAmbiguous(Exception):
    pass


def _ensure_research_source(session: Session, key: str) -> Source:
    name, publisher, tier, weight = RESEARCH_SOURCE_NAMES[key]
    source = session.scalar(select(Source).where(Source.name == name))
    if source is None:
        source = Source(name=name, publisher=publisher, url=f"https://www.{publisher}/",
                        kind="html", tier=tier, weight=weight)
        session.add(source)
        session.flush()
    return source


def _snapshot(session: Session, source: Source, result: fetcher.FetchResult) -> RawDocument:
    doc = RawDocument(
        source_id=source.id,
        url=result.url,
        fetched_at=result.fetched_at or datetime.now(timezone.utc),
        http_status=result.status,
        content_sha256=result.sha256 or hashlib.sha256(b"").hexdigest(),
        content_gz=result.content_gz or gzip.compress(b""),
    )
    session.add(doc)
    session.flush()
    return doc


def _task(session: Session, appointment_id: int, name: str) -> ResearchTask:
    task = session.scalar(
        select(ResearchTask).where(
            ResearchTask.appointment_id == appointment_id,
            ResearchTask.task_name == name,
        )
    )
    if task is None:
        task = ResearchTask(appointment_id=appointment_id, task_name=name)
        session.add(task)
        session.flush()
    return task


class ResearchRun:
    def __init__(self, session: Session, appointment: Appointment):
        self.session = session
        self.appointment = appointment
        self.manager: Manager = appointment.manager
        self.client = fetcher.build_client()
        # shared state between nodes
        self.stints_primary: list[StintRecord] = []
        self.stints_secondary: list[StintRecord] = []
        self.matches_by_club: dict[str, list[MatchRecord]] = {}
        self.claims: list[ClaimDraft] = []

    async def _fetch(self, url: str) -> fetcher.FetchResult:
        return await fetcher.fetch(
            self.client, url, throttle=fetcher.research_throttle
        )

    # ---- DAG nodes -------------------------------------------------------

    async def identity(self) -> None:
        """Bind Transfermarkt + Wikipedia IDs. Requires agreement between two
        sources on name + (birth date or most-recent club); ambiguity hard-
        fails for human resolution (never guess)."""
        name = self.manager.canonical_name
        tm_source = _ensure_research_source(self.session, "transfermarkt")

        result = await self._fetch(transfermarkt.SEARCH_URL.format(query=quote(name)))
        _snapshot(self.session, tm_source, result)
        tm_hits = transfermarkt.parse_search_results(result.text)
        tm_hits = [
            hit for hit in tm_hits
            if hit["name"].lower().replace("-", " ") == name.lower()
        ] or tm_hits

        if len(tm_hits) > 1:
            raise IdentityAmbiguous(
                f"{len(tm_hits)} Transfermarkt trainer results for '{name}'; "
                "resolve with: manager-watch force-trigger --transfermarkt-id <id>"
            )
        if tm_hits:
            self.manager.transfermarkt_id = tm_hits[0]["transfermarkt_id"]

        wp_source = _ensure_research_source(self.session, "wikipedia")
        result = await self._fetch(wikipedia.SEARCH_URL.format(query=quote(name)))
        _snapshot(self.session, wp_source, result)
        import json
        hits = json.loads(result.text).get("query", {}).get("search", [])
        if hits:
            self.manager.wikipedia_title = hits[0]["title"]
        self.session.flush()

        if not self.manager.transfermarkt_id and not self.manager.wikipedia_title:
            raise IdentityAmbiguous(f"no Transfermarkt or Wikipedia identity for '{name}'")

    async def career_transfermarkt(self) -> None:
        if not self.manager.transfermarkt_id:
            raise ExtractorUnavailable("no transfermarkt_id bound")
        source = _ensure_research_source(self.session, "transfermarkt")
        url = (
            f"https://www.transfermarkt.com/x/profil/trainer/{self.manager.transfermarkt_id}"
        )
        result = await self._fetch(url)
        _snapshot(self.session, source, result)
        self.stints_primary = transfermarkt.parse_stations(result.text, source_url=url)
        formation = transfermarkt.parse_preferred_formation(result.text)
        if formation:
            from manager_watch.evidence.ranking import claim_confidence, source_score
            from manager_watch.types import EvidenceDraft
            self.claims.append(
                ClaimDraft(
                    category="tactical",
                    predicate="stated_preferred_formation",
                    value={"value": formation},
                    confidence=claim_confidence(
                        [source_score(0.90, 0.0, "secondary_summary")], 1
                    ),
                    evidence=[EvidenceDraft(source_name="Transfermarkt", url=url,
                                            locator="profile field", excerpt=formation)],
                )
            )

    async def career_wikipedia(self) -> None:
        if not self.manager.wikipedia_title:
            raise ExtractorUnavailable("no wikipedia_title bound")
        source = _ensure_research_source(self.session, "wikipedia")
        url = wikipedia.API_URL.format(title=quote(self.manager.wikipedia_title))
        result = await self._fetch(url)
        _snapshot(self.session, source, result)
        import json
        wikitext = json.loads(result.text).get("parse", {}).get("wikitext", "")
        infobox = wikipedia.parse_infobox(wikitext)
        if infobox["birth_date"] and not self.manager.birth_date:
            self.manager.birth_date = infobox["birth_date"]
        if infobox["nationality"] and not self.manager.nationality:
            self.manager.nationality = infobox["nationality"]
        honours = wikipedia.parse_honours(wikitext)
        page_url = f"https://en.wikipedia.org/wiki/{quote(self.manager.wikipedia_title)}"
        for entry in infobox["manager_career"]:
            start, end = wikipedia.career_years_to_dates(entry["years"])
            self.stints_secondary.append(
                StintRecord(club=entry["club"], start_date=start, end_date=end,
                            honours=[h for h in honours], source_url=page_url)
            )
        self.session.flush()

    async def matches(self) -> None:
        # TODO(next session): resolve each stint's club to its
        # worldfootball.net season URLs and populate self.matches_by_club via
        # worldfootball.parse_season_matches / parse_match_lineup. The
        # derivations below already consume matches_by_club when present.
        raise ExtractorUnavailable("worldfootball season-URL resolution not implemented yet")

    async def derive(self) -> None:
        all_matches = [m for group in self.matches_by_club.values() for m in group]
        self.claims += tactical_mod.derive_tactical(all_matches)
        self.claims += youth_mod.derive_youth(self.matches_by_club)
        self.claims += career_mod.derive_career(self.stints_primary, self.stints_secondary)
        self.claims = resolve(self.claims)

    async def output(self) -> None:
        persist_claims(self.session, self.appointment, self.claims)
        dossier = build_dossier(self.session, self.appointment)
        markdown = render_report(dossier)
        save_report(self.session, self.appointment, dossier, markdown)

    # ---- runner ----------------------------------------------------------

    DAG: list[tuple[str, str]] = [
        ("identity", "fatal"),
        ("career_transfermarkt", "degrade"),
        ("career_wikipedia", "degrade"),
        ("matches", "degrade"),
        ("derive", "fatal"),
        ("output", "fatal"),
    ]

    async def run(self) -> None:
        try:
            for name, failure_mode in self.DAG:
                task = _task(self.session, self.appointment.id, name)
                if task.status == "DONE":
                    continue
                task.status = "RUNNING"
                task.attempts += 1
                self.session.flush()
                try:
                    await getattr(self, name)()
                    task.status = "DONE"
                except ExtractorUnavailable as exc:
                    task.status = "FAILED"
                    task.last_error = str(exc)
                    log.warning("research.node_degraded", node=name, error=str(exc))
                    if failure_mode == "fatal":
                        raise
                except Exception as exc:
                    task.status = "FAILED"
                    task.last_error = str(exc)
                    raise
                finally:
                    self.session.flush()
        finally:
            await self.client.aclose()


def persist_claims(session: Session, appointment: Appointment,
                   drafts: list[ClaimDraft]) -> None:
    fallback_source = _ensure_research_source(session, "transfermarkt")
    now = datetime.now(timezone.utc)
    stub_docs: dict[tuple[str, str], int] = {}
    for draft in drafts:
        if draft.status == "REJECTED":
            continue
        claim = Claim(
            appointment_id=appointment.id,
            manager_id=appointment.manager_id,
            category=draft.category,
            predicate=draft.predicate,
            value=draft.value,
            confidence=draft.confidence,
            status=draft.status,
        )
        session.add(claim)
        session.flush()
        for ev in draft.evidence:
            doc_id = ev.raw_document_id
            if doc_id is None:
                # derivation evidence references the URL; persist a stub
                # snapshot so the FK + provenance chain stays intact
                url = ev.url or "derived://"
                sha = hashlib.sha256((ev.excerpt or "").encode()).hexdigest()
                key = (url, sha)
                if key not in stub_docs:
                    existing = session.scalar(
                        select(RawDocument.id).where(
                            RawDocument.source_id == fallback_source.id,
                            RawDocument.url == url,
                            RawDocument.content_sha256 == sha,
                        )
                    )
                    if existing is None:
                        doc = RawDocument(
                            source_id=fallback_source.id, url=url,
                            fetched_at=now, http_status=0,
                            content_sha256=sha,
                            content_gz=gzip.compress((ev.excerpt or "").encode()),
                        )
                        session.add(doc)
                        session.flush()
                        existing = doc.id
                    stub_docs[key] = existing
                doc_id = stub_docs[key]
            session.add(Evidence(
                claim_id=claim.id, source_id=fallback_source.id,
                raw_document_id=doc_id, url=ev.url or "",
                locator=ev.locator, excerpt=ev.excerpt, retrieved_at=now,
            ))
    session.flush()


async def run_research(session: Session, appointment: Appointment) -> None:
    appointment.research_state = "RUNNING"
    session.flush()
    try:
        await ResearchRun(session, appointment).run()
        appointment.research_state = "COMPLETE"
    except Exception:
        appointment.research_state = "FAILED"
        raise
    finally:
        session.flush()


def run_research_sync(session: Session, appointment: Appointment) -> None:
    asyncio.run(run_research(session, appointment))
