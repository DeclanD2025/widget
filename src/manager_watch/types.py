"""Shared in-memory record types passed between pipeline stages.

These deliberately mirror (but are decoupled from) the DB models so that
parsers and derivation modules stay pure functions, testable without a
database or network.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime


@dataclass(frozen=True)
class NewsItem:
    source_name: str
    publisher: str
    url: str
    headline: str
    body_text: str = ""
    published_at: datetime | None = None


@dataclass
class LineupPlayer:
    name: str
    minutes: int
    age_on_date: float | None = None
    academy: bool | None = None


@dataclass
class MatchRecord:
    match_date: date
    opponent: str
    home: bool
    goals_for: int
    goals_against: int
    competition: str | None = None
    formation: str | None = None
    lineup: list[LineupPlayer] = field(default_factory=list)
    source_url: str = ""


@dataclass
class StintRecord:
    club: str
    role: str = "manager"
    start_date: date | None = None
    end_date: date | None = None
    matches: int | None = None
    wins: int | None = None
    draws: int | None = None
    losses: int | None = None
    points_per_game: float | None = None
    league: str | None = None
    honours: list[dict] = field(default_factory=list)
    source_url: str = ""


@dataclass
class EvidenceDraft:
    source_name: str
    url: str
    locator: str = ""
    excerpt: str = ""
    # populated by the persistence layer when the snapshot is stored
    raw_document_id: int | None = None


@dataclass
class ClaimDraft:
    category: str  # tactical | youth | career | biographical
    predicate: str
    value: dict
    confidence: float
    evidence: list[EvidenceDraft] = field(default_factory=list)
    status: str = "ACCEPTED"  # ACCEPTED | DISPUTED | REJECTED
