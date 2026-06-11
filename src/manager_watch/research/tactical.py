"""Tactical profile derivation (design §5) — rule tables over match data only.

Claims are never emitted when the underlying metric is missing.
"""
from __future__ import annotations

from collections import Counter

from manager_watch.evidence.ranking import claim_confidence, sample_factor, source_score
from manager_watch.types import ClaimDraft, EvidenceDraft, MatchRecord

SECONDARY_FORMATION_MIN_SHARE = 0.15
MAX_SAMPLE = 150
STYLE_BANDS = (1.10, 0.90)  # vs league median: >=110% high, <=90% low


def _match_evidence(matches: list[MatchRecord], limit: int = 3) -> list[EvidenceDraft]:
    seen: set[str] = set()
    drafts: list[EvidenceDraft] = []
    for match in matches:
        if match.source_url and match.source_url not in seen:
            seen.add(match.source_url)
            drafts.append(
                EvidenceDraft(
                    source_name="match-data",
                    url=match.source_url,
                    locator="match table",
                    excerpt=f"{match.match_date} vs {match.opponent}: "
                            f"{match.goals_for}-{match.goals_against} ({match.formation or 'n/a'})",
                )
            )
        if len(drafts) >= limit:
            break
    return drafts


def derive_formations(matches: list[MatchRecord]) -> list[ClaimDraft]:
    sample = [match for match in matches[-MAX_SAMPLE:] if match.formation]
    if not sample:
        return []
    counts = Counter(match.formation for match in sample)
    n = len(sample)
    factor = sample_factor(n)
    base_score = source_score(0.90, 0.0, "primary_table")

    claims: list[ClaimDraft] = []
    primary, primary_count = counts.most_common(1)[0]
    claims.append(
        ClaimDraft(
            category="tactical",
            predicate="primary_formation",
            value={"value": primary, "share": round(primary_count / n, 2), "sample_matches": n},
            confidence=claim_confidence([base_score], 1, factor),
            evidence=_match_evidence([match for match in sample if match.formation == primary]),
        )
    )
    for formation, count in counts.most_common()[1:]:
        share = count / n
        if share >= SECONDARY_FORMATION_MIN_SHARE:
            claims.append(
                ClaimDraft(
                    category="tactical",
                    predicate="secondary_formation",
                    value={"value": formation, "share": round(share, 2), "sample_matches": n},
                    confidence=claim_confidence([base_score], 1, factor),
                    evidence=_match_evidence(
                        [match for match in sample if match.formation == formation]
                    ),
                )
            )
    return claims


def _band(value: float, median: float) -> str:
    ratio = value / median if median else 0
    if ratio >= STYLE_BANDS[0]:
        return "high"
    if ratio <= STYLE_BANDS[1]:
        return "low"
    return "medium"


def derive_style(
    matches: list[MatchRecord],
    league_medians: dict[str, float] | None = None,
    possession_pct: float | None = None,
) -> list[ClaimDraft]:
    """league_medians keys: gf_per_match, ga_per_match (omit -> claim omitted)."""
    sample = matches[-MAX_SAMPLE:]
    if not sample:
        return []
    n = len(sample)
    factor = sample_factor(n)
    base_score = source_score(0.90, 0.0, "primary_table")
    claims: list[ClaimDraft] = []

    gf = sum(match.goals_for for match in sample) / n
    ga = sum(match.goals_against for match in sample) / n

    if league_medians and league_medians.get("gf_per_match"):
        median = league_medians["gf_per_match"]
        claims.append(
            ClaimDraft(
                category="tactical",
                predicate="attacking_output",
                value={"value": _band(gf, median),
                       "metric": {"gf_per_match": round(gf, 2), "league_median": median}},
                confidence=claim_confidence([base_score], 1, factor),
                evidence=_match_evidence(sample),
            )
        )
    if league_medians and league_medians.get("ga_per_match"):
        median = league_medians["ga_per_match"]
        # for goals against, lower is better: invert the band label
        band = {"high": "low", "low": "high", "medium": "medium"}[_band(ga, median)]
        claims.append(
            ClaimDraft(
                category="tactical",
                predicate="defensive_solidity",
                value={"value": band,
                       "metric": {"ga_per_match": round(ga, 2), "league_median": median}},
                confidence=claim_confidence([base_score], 1, factor),
                evidence=_match_evidence(sample),
            )
        )
    if possession_pct is not None:
        claims.append(
            ClaimDraft(
                category="tactical",
                predicate="possession_oriented",
                value={"value": possession_pct >= 52.0,
                       "metric": {"possession_pct": possession_pct}},
                confidence=claim_confidence([base_score], 1, factor),
                evidence=_match_evidence(sample),
            )
        )
    return claims


def derive_exemplar_matches(matches: list[MatchRecord], limit: int = 5) -> list[ClaimDraft]:
    sample = [match for match in matches[-MAX_SAMPLE:]]
    if not sample:
        return []
    scored = sorted(sample, key=lambda match: match.goals_for + match.goals_against)
    picks: list[MatchRecord] = []
    for match in (scored[-1], scored[0]):  # highest- and lowest-scoring
        if match not in picks:
            picks.append(match)
    previous_formation = None
    for match in sample:  # formation-change games
        if match.formation and previous_formation and match.formation != previous_formation:
            if match not in picks:
                picks.append(match)
        if match.formation:
            previous_formation = match.formation
        if len(picks) >= limit:
            break
    base_score = source_score(0.90, 0.0, "primary_table")
    return [
        ClaimDraft(
            category="tactical",
            predicate="exemplar_match",
            value={
                "date": pick.match_date.isoformat(),
                "opponent": pick.opponent,
                "score": f"{pick.goals_for}-{pick.goals_against}",
                "formation": pick.formation,
            },
            confidence=claim_confidence([base_score], 1),
            evidence=_match_evidence([pick]),
        )
        for pick in picks[:limit]
    ]


def derive_tactical(
    matches: list[MatchRecord],
    league_medians: dict[str, float] | None = None,
    possession_pct: float | None = None,
) -> list[ClaimDraft]:
    return (
        derive_formations(matches)
        + derive_style(matches, league_medians, possession_pct)
        + derive_exemplar_matches(matches)
    )
