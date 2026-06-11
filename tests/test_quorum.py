from datetime import datetime, timedelta, timezone

from manager_watch.trigger.quorum import QuorumEvent, evaluate

NOW = datetime(2026, 6, 11, 12, 0, tzinfo=timezone.utc)


def event(publisher, tier, weight, name="jane doe", classification="CONFIRMATION",
          age_hours=1, interim=False):
    return QuorumEvent(publisher=publisher, tier=tier, weight=weight,
                       classification=classification, extracted_name=name,
                       observed_at=NOW - timedelta(hours=age_hours), is_interim=interim)


def test_official_alone_confirms():
    result = evaluate([event("motherwellfc.co.uk", "OFFICIAL", 1.0)], now=NOW)
    assert result.confirmed and result.name == "jane doe" and result.score == 1.0


def test_two_tier1_confirm():
    result = evaluate([
        event("bbc.co.uk", "TIER1", 0.90),
        event("skysports.com", "TIER1", 0.85),
    ], now=NOW)
    assert result.confirmed
    assert result.score == 1.75
    assert result.publishers == ["bbc.co.uk", "skysports.com"]


def test_single_tier1_is_candidate_not_confirmed():
    result = evaluate([event("bbc.co.uk", "TIER1", 0.90)], now=NOW)
    assert not result.confirmed
    assert result.candidate


def test_wikipedia_alone_never_confirms():
    result = evaluate([event("en.wikipedia.org", "TIER2", 0.60)], now=NOW)
    assert not result.confirmed and not result.candidate


def test_two_tier2_below_threshold_not_confirmed():
    result = evaluate([
        event("en.wikipedia.org", "TIER2", 0.60),
        event("dailyrecord.co.uk", "TIER2", 0.70),
    ], now=NOW)
    assert not result.confirmed


def test_same_publisher_counted_once():
    result = evaluate([
        event("bbc.co.uk", "TIER1", 0.90),
        event("bbc.co.uk", "TIER1", 0.90),
    ], now=NOW)
    assert not result.confirmed


def test_events_outside_window_ignored():
    result = evaluate([
        event("bbc.co.uk", "TIER1", 0.90, age_hours=10),
        event("skysports.com", "TIER1", 0.85, age_hours=10),
    ], now=NOW)
    assert not result.confirmed


def test_names_not_mixed():
    result = evaluate([
        event("bbc.co.uk", "TIER1", 0.90, name="jane doe"),
        event("skysports.com", "TIER1", 0.85, name="john smith"),
    ], now=NOW)
    assert not result.confirmed


def test_interim_flag_propagates():
    result = evaluate([event("motherwellfc.co.uk", "OFFICIAL", 1.0, interim=True)], now=NOW)
    assert result.confirmed and result.is_interim
