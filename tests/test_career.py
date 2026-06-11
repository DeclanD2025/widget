from datetime import date

from manager_watch.research.career import departure_reason, derive_career, merge_stints
from manager_watch.types import StintRecord


def test_departure_reason():
    assert departure_reason("Doe was sacked on Monday") == "sacked"
    assert departure_reason("club and manager parted company") == "mutual_consent"
    assert departure_reason("Doe resigned last night") == "resigned"
    assert departure_reason("Doe celebrated promotion") is None


def test_merge_pairs_by_club_and_period():
    primary = [StintRecord(club="Example FC", start_date=date(2021, 6, 1),
                           source_url="http://tm/")]
    secondary = [StintRecord(club="example fc", start_date=date(2021, 7, 1),
                             source_url="http://wp/"),
                 StintRecord(club="Other FC", start_date=date(2018, 1, 1),
                             source_url="http://wp/")]
    pairs = merge_stints(primary, secondary)
    assert len(pairs) == 2
    assert len(pairs[0][1]) == 1  # corroborated
    assert pairs[1][0].club == "Other FC"  # secondary-only appended


def test_derive_career_metrics_and_failure_rule():
    primary = [StintRecord(club="Example FC", start_date=date(2021, 6, 1),
                           end_date=date(2024, 5, 30), matches=128, wins=61,
                           draws=30, losses=37, league="Scottish Championship",
                           source_url="http://tm/")]
    claims = derive_career(primary, [], {"Example FC": "Doe was sacked after a poor run"})
    stint = next(c for c in claims if c.predicate == "stint")
    assert stint.value["record"]["ppg"] == round((61 * 3 + 30) / 128, 2)  # 1.66
    assert stint.value["departure"] == "sacked"
    assert stint.value["flagged_failure"] is False  # ppg >= 1.0
    assert stint.value["tenure_days"] == (date(2024, 5, 30) - date(2021, 6, 1)).days

    trajectory = next(c for c in claims if c.predicate == "trajectory")
    assert trajectory.value["value"][0]["tier"] == 2


def test_sacked_with_low_ppg_flagged():
    primary = [StintRecord(club="Bad FC", matches=40, wins=8, draws=8, losses=24,
                           start_date=date(2020, 1, 1), end_date=date(2021, 1, 1),
                           source_url="http://tm/")]
    claims = derive_career(primary, [], {"Bad FC": "he was dismissed"})
    stint = next(c for c in claims if c.predicate == "stint")
    assert stint.value["record"]["ppg"] < 1.0
    assert stint.value["flagged_failure"] is True


def test_corroboration_raises_confidence():
    primary = [StintRecord(club="Example FC", start_date=date(2021, 6, 1),
                           matches=10, wins=5, draws=2, losses=3, source_url="http://tm/")]
    secondary = [StintRecord(club="Example FC", start_date=date(2021, 6, 15),
                             source_url="http://wp/")]
    solo = derive_career(primary, [])[0]
    corroborated = derive_career(primary, secondary)[0]
    assert corroborated.confidence > solo.confidence
