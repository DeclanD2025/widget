"""Career history derivation (design §5).

Merges stint records from multiple sources (Transfermarkt primary,
Wikipedia secondary), computes per-stint metrics, applies the failure rule
(relegation or sacked with PPG < 1.0), and derives a league-tier trajectory.
"""
from __future__ import annotations

import re
from functools import lru_cache

import yaml

from manager_watch.evidence.ranking import claim_confidence, source_score
from manager_watch.settings import settings
from manager_watch.types import ClaimDraft, EvidenceDraft, StintRecord

DEPARTURE_PATTERNS = [
    ("sacked", re.compile(r"\b(sacked|dismissed|relieved of (his|her|their) duties)\b", re.I)),
    ("mutual_consent", re.compile(r"\b(parted company|mutual consent)\b", re.I)),
    ("resigned", re.compile(r"\bresign(s|ed)?\b", re.I)),
]


@lru_cache(maxsize=1)
def league_tiers() -> dict[str, int]:
    config = yaml.safe_load(settings.league_tiers_file.read_text())
    return config["leagues"]


def departure_reason(text: str) -> str | None:
    for reason, pattern in DEPARTURE_PATTERNS:
        if pattern.search(text):
            return reason
    return None


def merge_stints(
    primary: list[StintRecord], secondary: list[StintRecord]
) -> list[tuple[StintRecord, list[StintRecord]]]:
    """Pair each primary (Transfermarkt) stint with corroborating secondary
    (Wikipedia) stints by club name + overlapping period. Secondary stints
    with no primary counterpart are appended on their own."""
    paired: list[tuple[StintRecord, list[StintRecord]]] = []
    matched_secondary: set[int] = set()
    for stint in primary:
        corroborating = []
        for index, other in enumerate(secondary):
            if other.club.strip().lower() != stint.club.strip().lower():
                continue
            if stint.start_date and other.start_date:
                if abs((stint.start_date - other.start_date).days) > 90:
                    continue
            corroborating.append(other)
            matched_secondary.add(index)
        paired.append((stint, corroborating))
    for index, other in enumerate(secondary):
        if index not in matched_secondary:
            paired.append((other, []))
    return paired


def derive_career(
    primary: list[StintRecord],
    secondary: list[StintRecord] | None = None,
    departure_texts: dict[str, str] | None = None,
) -> list[ClaimDraft]:
    """departure_texts: club name -> news text mentioning the departure."""
    secondary = secondary or []
    departure_texts = departure_texts or {}
    tiers = league_tiers()
    claims: list[ClaimDraft] = []
    trajectory: list[dict] = []

    for stint, corroborating in merge_stints(primary, secondary):
        evidence = [
            EvidenceDraft(source_name="career-source", url=stint.source_url or "",
                          locator="career table",
                          excerpt=f"{stint.club} {stint.start_date}–{stint.end_date or 'present'}")
        ]
        evidence += [
            EvidenceDraft(source_name="career-source", url=other.source_url or "",
                          locator="career table", excerpt=f"corroborates {stint.club}")
            for other in corroborating
        ]
        publishers = 1 + len(corroborating)
        score = source_score(0.90, 0.0, "primary_table")

        ppg = stint.points_per_game
        if ppg is None and stint.matches and stint.wins is not None and stint.draws is not None:
            ppg = round((stint.wins * 3 + stint.draws) / stint.matches, 2)
        win_pct = (
            round(stint.wins / stint.matches, 3)
            if stint.matches and stint.wins is not None
            else None
        )
        tenure_days = (
            (stint.end_date - stint.start_date).days
            if stint.start_date and stint.end_date
            else None
        )
        departure = departure_reason(departure_texts.get(stint.club, ""))

        failure = bool(
            departure == "sacked" and ppg is not None and ppg < 1.0
        ) or any("relegat" in str(honour).lower() for honour in stint.honours)

        claims.append(
            ClaimDraft(
                category="career",
                predicate="stint",
                value={
                    "club": stint.club,
                    "role": stint.role,
                    "start": stint.start_date.isoformat() if stint.start_date else None,
                    "end": stint.end_date.isoformat() if stint.end_date else None,
                    "record": {
                        "P": stint.matches, "W": stint.wins,
                        "D": stint.draws, "L": stint.losses, "ppg": ppg,
                    },
                    "win_pct": win_pct,
                    "tenure_days": tenure_days,
                    "honours": stint.honours,
                    "departure": departure,
                    "flagged_failure": failure,
                },
                confidence=claim_confidence([score], publishers),
                evidence=evidence,
            )
        )
        if stint.league and stint.league in tiers:
            trajectory.append({
                "club": stint.club, "league": stint.league,
                "tier": tiers[stint.league],
                "start": stint.start_date.isoformat() if stint.start_date else None,
            })

    if trajectory:
        trajectory.sort(key=lambda entry: entry["start"] or "")
        claims.append(
            ClaimDraft(
                category="career",
                predicate="trajectory",
                value={"value": trajectory},
                confidence=claim_confidence(
                    [source_score(0.90, 0.0, "secondary_summary")], 1
                ),
                evidence=[
                    EvidenceDraft(source_name="career-source",
                                  url=primary[0].source_url if primary else "",
                                  locator="career table", excerpt="league tiers per stint")
                ],
            )
        )
    return claims
