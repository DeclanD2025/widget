"""Deterministic conflict resolution between claims for the same predicate
(design §6):

  1. compatible values (dates within 7 days; numbers within 5%) -> merge,
     keep the higher-confidence claim's value, pool all evidence
  2. incompatible -> higher confidence wins; loser kept as DISPUTED
  3. tie within 0.05 -> both DISPUTED, neither used as a headline fact
  4. an official-source claim always beats non-official for biographical
     predicates regardless of arithmetic
"""
from __future__ import annotations

from datetime import date
from typing import Iterable

from manager_watch.types import ClaimDraft

TIE_MARGIN = 0.05
DATE_TOLERANCE_DAYS = 7
NUMBER_TOLERANCE = 0.05

OFFICIAL_PUBLISHER_HINTS = ("motherwellfc.co.uk",)


def _is_official(claim: ClaimDraft) -> bool:
    return any(
        any(hint in evidence.url for hint in OFFICIAL_PUBLISHER_HINTS)
        for evidence in claim.evidence
    )


def _values_compatible(a, b) -> bool:
    if isinstance(a, date) and isinstance(b, date):
        return abs((a - b).days) <= DATE_TOLERANCE_DAYS
    if isinstance(a, str) and isinstance(b, str):
        try:
            a, b = date.fromisoformat(a), date.fromisoformat(b)
            return abs((a - b).days) <= DATE_TOLERANCE_DAYS
        except ValueError:
            return a.strip().lower() == b.strip().lower()
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if a == b:
            return True
        denominator = max(abs(a), abs(b))
        return denominator > 0 and abs(a - b) / denominator <= NUMBER_TOLERANCE
    return a == b


def _comparable(claim: ClaimDraft):
    """The scalar inside claim.value used for compatibility checks."""
    return claim.value.get("value", claim.value)


def resolve(claims: Iterable[ClaimDraft]) -> list[ClaimDraft]:
    """Resolve conflicts within each (category, predicate) group.

    Returns all claims; winners ACCEPTED, losers DISPUTED.
    """
    groups: dict[tuple[str, str], list[ClaimDraft]] = {}
    for claim in claims:
        groups.setdefault((claim.category, claim.predicate), []).append(claim)

    resolved: list[ClaimDraft] = []
    for (category, _), group in groups.items():
        if len(group) == 1:
            resolved.append(group[0])
            continue

        # rule 4: official trumps for biographical facts
        if category == "biographical":
            official = [claim for claim in group if _is_official(claim)]
            if official:
                winner = max(official, key=lambda claim: claim.confidence)
                for claim in group:
                    claim.status = "ACCEPTED" if claim is winner else "DISPUTED"
                resolved.extend(group)
                continue

        ordered = sorted(group, key=lambda claim: claim.confidence, reverse=True)
        winner, runner_up = ordered[0], ordered[1]

        if _values_compatible(_comparable(winner), _comparable(runner_up)):
            # rule 1: merge — winner keeps value, pools evidence
            for claim in ordered[1:]:
                if _values_compatible(_comparable(winner), _comparable(claim)):
                    winner.evidence.extend(claim.evidence)
                    claim.status = "REJECTED"  # merged into winner
                else:
                    claim.status = "DISPUTED"
            winner.status = "ACCEPTED"
        elif winner.confidence - runner_up.confidence <= TIE_MARGIN:
            # rule 3: tie -> both disputed
            winner.status = "DISPUTED"
            runner_up.status = "DISPUTED"
            for claim in ordered[2:]:
                claim.status = "DISPUTED"
        else:
            # rule 2: winner takes it, losers disputed
            winner.status = "ACCEPTED"
            for claim in ordered[1:]:
                claim.status = "DISPUTED"
        resolved.extend(group)
    return resolved
