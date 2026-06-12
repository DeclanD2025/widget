from datetime import date, timedelta

from manager_watch.research.youth import derive_youth, u21_minutes_share
from manager_watch.types import LineupPlayer, MatchRecord


def match(i: int, lineup: list[LineupPlayer]) -> MatchRecord:
    return MatchRecord(match_date=date(2024, 1, 1) + timedelta(days=i * 7),
                       opponent=f"Opp{i}", home=True, goals_for=1, goals_against=0,
                       lineup=lineup, source_url=f"http://m/{i}")


def test_u21_minutes_share():
    matches = [
        match(0, [LineupPlayer("Old Pro", 90, age_on_date=28.0),
                  LineupPlayer("Young Gun", 90, age_on_date=18.5)]),
        match(1, [LineupPlayer("Old Pro", 90, age_on_date=28.0),
                  LineupPlayer("Other Vet", 90, age_on_date=30.0)]),
    ]
    share, n = u21_minutes_share(matches)
    assert share == 90 / 360
    assert n == 2


def test_no_lineups_returns_none():
    matches = [match(0, [])]
    assert u21_minutes_share(matches) is None


def test_derive_youth_claims():
    lineup_young = [LineupPlayer("Young Gun", 90, age_on_date=18.5, academy=True),
                    LineupPlayer("Old Pro", 90, age_on_date=28.0)]
    matches = {"Example FC": [match(i, lineup_young) for i in range(10)]}
    claims = derive_youth(matches)
    predicates = {c.predicate for c in claims}
    assert {"u21_minutes_share", "debuts_u21", "case_study"} <= predicates

    debuts = next(c for c in claims if c.predicate == "debuts_u21")
    assert debuts.value["value"] == 1
    assert debuts.value["players"] == ["Young Gun"]

    case = next(c for c in claims if c.predicate == "case_study")
    assert case.value["player"] == "Young Gun"
    assert case.value["academy_graduate"] is True
    assert case.value["minutes_under_manager"] == 900
