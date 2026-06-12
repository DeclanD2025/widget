from manager_watch.evidence.conflicts import resolve
from manager_watch.types import ClaimDraft, EvidenceDraft


def claim(predicate, value, confidence, url="http://x/", category="career"):
    return ClaimDraft(category=category, predicate=predicate, value=value,
                      confidence=confidence,
                      evidence=[EvidenceDraft(source_name="s", url=url)])


def test_compatible_values_merge():
    a = claim("stint_start", {"value": "2021-06-01"}, 0.9, url="http://tm/")
    b = claim("stint_start", {"value": "2021-06-05"}, 0.7, url="http://wp/")
    resolved = resolve([a, b])
    winner = next(c for c in resolved if c.status == "ACCEPTED")
    assert winner.value["value"] == "2021-06-01"
    assert len(winner.evidence) == 2  # pooled


def test_incompatible_higher_confidence_wins():
    a = claim("stint_start", {"value": "2021-06-01"}, 0.9)
    b = claim("stint_start", {"value": "2022-03-01"}, 0.6)
    resolved = resolve([a, b])
    assert a.status == "ACCEPTED"
    assert b.status == "DISPUTED"
    assert b in resolved  # never deleted


def test_tie_disputes_both():
    a = claim("stint_start", {"value": "2021-06-01"}, 0.80)
    b = claim("stint_start", {"value": "2022-03-01"}, 0.78)
    resolve([a, b])
    assert a.status == "DISPUTED" and b.status == "DISPUTED"


def test_numbers_within_5pct_compatible():
    a = claim("matches", {"value": 100}, 0.9)
    b = claim("matches", {"value": 103}, 0.7)
    resolve([a, b])
    assert a.status == "ACCEPTED" and b.status == "REJECTED"


def test_official_beats_arithmetic_for_biographical():
    official = claim("birth_date", {"value": "1975-03-14"}, 0.5,
                     url="https://www.motherwellfc.co.uk/news/x", category="biographical")
    other = claim("birth_date", {"value": "1976-01-01"}, 0.95,
                  url="http://blog/", category="biographical")
    resolve([official, other])
    assert official.status == "ACCEPTED"
    assert other.status == "DISPUTED"


def test_single_claim_passes_through():
    a = claim("stint", {"value": "x"}, 0.8)
    assert resolve([a]) == [a]
    assert a.status == "ACCEPTED"
