"""Youth development derivation (design §5) over match lineup data."""
from __future__ import annotations

from manager_watch.evidence.ranking import claim_confidence, sample_factor, source_score
from manager_watch.types import ClaimDraft, EvidenceDraft, MatchRecord

U21_AGE = 21.0


def _evidence(matches: list[MatchRecord], note: str, limit: int = 3) -> list[EvidenceDraft]:
    drafts = []
    seen: set[str] = set()
    for match in matches:
        if match.source_url and match.source_url not in seen:
            seen.add(match.source_url)
            drafts.append(EvidenceDraft(source_name="match-data", url=match.source_url,
                                        locator="lineup table", excerpt=note))
        if len(drafts) >= limit:
            break
    return drafts


def u21_minutes_share(matches: list[MatchRecord]) -> tuple[float, int] | None:
    """Returns (share, matches_with_lineups) or None when no lineup data."""
    total = 0
    u21 = 0
    with_lineups = 0
    for match in matches:
        if not match.lineup:
            continue
        with_lineups += 1
        for player in match.lineup:
            total += player.minutes
            if player.age_on_date is not None and player.age_on_date < U21_AGE:
                u21 += player.minutes
    if total == 0:
        return None
    return u21 / total, with_lineups


def derive_youth(matches_by_club: dict[str, list[MatchRecord]]) -> list[ClaimDraft]:
    base_score = source_score(0.90, 0.0, "primary_table")
    claims: list[ClaimDraft] = []
    all_matches = [match for group in matches_by_club.values() for match in group]

    overall = u21_minutes_share(all_matches)
    if overall:
        share, n = overall
        per_stint = []
        for club, group in matches_by_club.items():
            stint_share = u21_minutes_share(group)
            if stint_share:
                per_stint.append({"club": club, "value": round(stint_share[0], 3)})
        claims.append(
            ClaimDraft(
                category="youth",
                predicate="u21_minutes_share",
                value={"value": round(share, 3), "stints": per_stint, "sample_matches": n},
                confidence=claim_confidence([base_score], 1, sample_factor(n)),
                evidence=_evidence(all_matches, f"U21 minutes share {share:.1%} over {n} matches"),
            )
        )

    # debuts: first appearance in the data while < 21
    first_seen: dict[str, MatchRecord] = {}
    for match in sorted(all_matches, key=lambda match: match.match_date):
        for player in match.lineup:
            if player.name not in first_seen:
                first_seen[player.name] = match
    debutants = []
    for name, match in first_seen.items():
        player = next(p for p in match.lineup if p.name == name)
        if player.age_on_date is not None and player.age_on_date < U21_AGE:
            debutants.append((name, match, player))
    if first_seen:
        claims.append(
            ClaimDraft(
                category="youth",
                predicate="debuts_u21",
                value={"value": len(debutants),
                       "players": [name for name, _, _ in debutants]},
                confidence=claim_confidence(
                    [base_score], 1, sample_factor(len(first_seen), full_sample=100)
                ),
                evidence=_evidence(
                    [match for _, match, _ in debutants] or all_matches,
                    f"{len(debutants)} players first appeared while under 21",
                ),
            )
        )

    # case studies: top 3 by U21 minutes
    minutes_by_player: dict[str, int] = {}
    academy_flags: dict[str, bool] = {}
    debut_dates: dict[str, str] = {}
    for match in sorted(all_matches, key=lambda match: match.match_date):
        for player in match.lineup:
            if player.age_on_date is not None and player.age_on_date < U21_AGE:
                minutes_by_player[player.name] = (
                    minutes_by_player.get(player.name, 0) + player.minutes
                )
                if player.academy:
                    academy_flags[player.name] = True
                debut_dates.setdefault(player.name, match.match_date.isoformat())
    for name, minutes in sorted(minutes_by_player.items(), key=lambda kv: -kv[1])[:3]:
        claims.append(
            ClaimDraft(
                category="youth",
                predicate="case_study",
                value={
                    "player": name,
                    "debut_date": debut_dates.get(name),
                    "minutes_under_manager": minutes,
                    "academy_graduate": academy_flags.get(name, False),
                },
                confidence=claim_confidence([base_score], 1, 0.8),
                evidence=_evidence(all_matches, f"{name}: {minutes} U21 minutes"),
            )
        )
    return claims
