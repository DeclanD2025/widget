"""Source ranking and claim confidence (design §6).

score(source) = tier_weight * recency_factor * specificity_factor
confidence(claim) = min(0.99, max_evidence_score
                              * (1 + 0.15 * (distinct_publishers - 1))
                              * sample_factor)
"""
from __future__ import annotations

TIER_WEIGHTS = {
    "OFFICIAL": 1.00,
    "TIER1": 0.90,
    "TIER2": 0.70,
    "TIER3": 0.40,
}

SPECIFICITY = {
    "primary_table": 1.0,    # e.g. Transfermarkt match logs / stint tables
    "secondary_summary": 0.9,  # e.g. Wikipedia career table
    "journalistic": 0.6,     # match reports, characterisations
    "quote": 0.4,            # interviews/opinion — supporting only
}

MAX_CONFIDENCE = 0.99
QUOTE_CONFIDENCE_CAP = 0.5


def recency_factor(doc_age_years: float) -> float:
    if doc_age_years <= 2:
        return 1.0
    return max(0.7, 1.0 - 0.05 * (doc_age_years - 2))


def source_score(tier_weight: float, doc_age_years: float, specificity: str) -> float:
    return tier_weight * recency_factor(doc_age_years) * SPECIFICITY[specificity]


def claim_confidence(
    evidence_scores: list[float],
    distinct_publishers: int,
    sample_factor: float = 1.0,
    *,
    is_quote: bool = False,
) -> float:
    if not evidence_scores:
        return 0.0
    base = max(evidence_scores)
    corroboration = 1 + 0.15 * max(0, distinct_publishers - 1)
    confidence = min(MAX_CONFIDENCE, base * corroboration * sample_factor)
    if is_quote:
        confidence = min(confidence, QUOTE_CONFIDENCE_CAP)
    return round(confidence, 2)


def sample_factor(n: int, full_sample: int = 50) -> float:
    """Statistical claims scale with sample size: min(1, n/full_sample)."""
    if n <= 0:
        return 0.0
    return min(1.0, n / full_sample)
