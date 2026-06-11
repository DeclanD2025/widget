from manager_watch.evidence.ranking import (
    claim_confidence,
    recency_factor,
    sample_factor,
    source_score,
)


def test_recency_factor_floor():
    assert recency_factor(1) == 1.0
    assert recency_factor(4) == 0.9
    assert recency_factor(30) == 0.7  # floor


def test_source_score_composition():
    assert source_score(1.0, 0, "primary_table") == 1.0
    assert source_score(0.9, 0, "quote") == 0.9 * 0.4


def test_corroboration_boost():
    solo = claim_confidence([0.6], 1)
    pair = claim_confidence([0.6, 0.5], 2)
    assert pair > solo
    assert pair == round(min(0.99, 0.6 * 1.15), 2)


def test_confidence_capped():
    assert claim_confidence([0.99], 5) == 0.99


def test_quote_cap():
    assert claim_confidence([0.9], 3, is_quote=True) == 0.5


def test_sample_factor():
    assert sample_factor(25) == 0.5
    assert sample_factor(200) == 1.0
    assert sample_factor(0) == 0.0
