"""Source-quorum confirmation logic (design §3 step 3).

CONFIRMED iff, within the rolling window and for the same normalised name:
  (a) any OFFICIAL source has a CONFIRMATION classification, or
  (b) sum of per-publisher weights >= threshold from >= 2 distinct
      TIER1/TIER2 publishers with CONFIRMATION classifications.
Wikipedia or a single aggregator can therefore never confirm alone.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from manager_watch.settings import settings


@dataclass(frozen=True)
class QuorumEvent:
    publisher: str
    tier: str  # OFFICIAL | TIER1 | TIER2 | TIER3
    weight: float
    classification: str
    extracted_name: str | None
    observed_at: datetime
    is_interim: bool = False


@dataclass
class QuorumResult:
    confirmed: bool
    name: str | None = None
    score: float = 0.0
    publishers: list[str] = field(default_factory=list)
    is_interim: bool = False
    # one TIER1 confirmation alone: not confirmed, but worth a heads-up alert
    candidate: bool = False


def evaluate(
    events: list[QuorumEvent],
    *,
    now: datetime | None = None,
    window_hours: int | None = None,
    threshold: float | None = None,
) -> QuorumResult:
    now = now or datetime.now(timezone.utc)
    window = timedelta(hours=window_hours or settings.quorum_window_hours)
    threshold = threshold if threshold is not None else settings.quorum_threshold

    in_window = [
        event for event in events
        if event.classification == "CONFIRMATION"
        and event.extracted_name
        and now - event.observed_at <= window
    ]

    by_name: dict[str, list[QuorumEvent]] = {}
    for event in in_window:
        by_name.setdefault(event.extracted_name, []).append(event)

    best = QuorumResult(confirmed=False)
    for name, group in by_name.items():
        interim = any(event.is_interim for event in group)

        official = [event for event in group if event.tier == "OFFICIAL"]
        if official:
            return QuorumResult(
                confirmed=True, name=name,
                score=max(event.weight for event in official),
                publishers=sorted({event.publisher for event in group}),
                is_interim=interim,
            )

        # max weight per distinct publisher, TIER1/TIER2 only
        per_publisher: dict[str, float] = {}
        for event in group:
            if event.tier in ("TIER1", "TIER2"):
                per_publisher[event.publisher] = max(
                    per_publisher.get(event.publisher, 0.0), event.weight
                )
        score = sum(per_publisher.values())
        if len(per_publisher) >= 2 and score >= threshold:
            return QuorumResult(
                confirmed=True, name=name, score=round(score, 2),
                publishers=sorted(per_publisher), is_interim=interim,
            )

        has_tier1 = any(event.tier == "TIER1" for event in group)
        if has_tier1 and score > best.score:
            best = QuorumResult(
                confirmed=False, name=name, score=round(score, 2),
                publishers=sorted(per_publisher), is_interim=interim, candidate=True,
            )
    return best
