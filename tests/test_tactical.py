from datetime import date, timedelta

from manager_watch.research.tactical import (
    derive_exemplar_matches,
    derive_formations,
    derive_style,
)
from manager_watch.types import MatchRecord


def make_matches(formations: list[str], gf=1, ga=1) -> list[MatchRecord]:
    return [
        MatchRecord(match_date=date(2024, 1, 1) + timedelta(days=i * 7),
                    opponent=f"Opp{i}", home=True, goals_for=gf, goals_against=ga,
                    formation=formation, source_url=f"http://m/{i}")
        for i, formation in enumerate(formations)
    ]


def test_primary_and_secondary_formations():
    matches = make_matches(["4-3-3"] * 60 + ["4-2-3-1"] * 30 + ["3-5-2"] * 10)
    claims = derive_formations(matches)
    primary = next(c for c in claims if c.predicate == "primary_formation")
    assert primary.value["value"] == "4-3-3"
    assert primary.value["share"] == 0.6
    assert primary.value["sample_matches"] == 100
    secondaries = [c for c in claims if c.predicate == "secondary_formation"]
    assert [c.value["value"] for c in secondaries] == ["4-2-3-1"]  # 10% one dropped
    assert primary.evidence  # every claim carries evidence


def test_small_sample_lowers_confidence():
    few = derive_formations(make_matches(["4-3-3"] * 5))
    many = derive_formations(make_matches(["4-3-3"] * 100))
    assert few[0].confidence < many[0].confidence


def test_no_formation_data_no_claims():
    matches = make_matches([None] * 20)
    assert derive_formations(matches) == []


def test_style_requires_league_median():
    matches = make_matches(["4-3-3"] * 50, gf=2, ga=0)
    assert derive_style(matches, league_medians=None) == []
    claims = derive_style(matches, {"gf_per_match": 1.3, "ga_per_match": 1.3})
    attacking = next(c for c in claims if c.predicate == "attacking_output")
    defensive = next(c for c in claims if c.predicate == "defensive_solidity")
    assert attacking.value["value"] == "high"
    assert defensive.value["value"] == "high"  # 0 conceded = high solidity


def test_possession_claim_only_with_metric():
    matches = make_matches(["4-3-3"] * 50)
    claims = derive_style(matches, possession_pct=55.0)
    possession = next(c for c in claims if c.predicate == "possession_oriented")
    assert possession.value["value"] is True


def test_exemplar_matches_capped():
    matches = make_matches(["4-3-3"] * 10 + ["3-5-2"] * 10)
    claims = derive_exemplar_matches(matches)
    assert 1 <= len(claims) <= 5
    assert all(c.predicate == "exemplar_match" for c in claims)
