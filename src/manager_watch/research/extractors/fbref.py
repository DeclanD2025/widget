"""FBref extractor — NOT YET IMPLEMENTED.

Design §5: squad minutes by age, possession %, style proxies. FBref wraps
tables in HTML comments; the implementation must strip `<!-- -->` before
parsing, then join rows on player name + birth year.

Raises ExtractorUnavailable so the orchestrator degrades gracefully: the
dossier omits possession/long-pass style claims (rules never invent labels
without the metric) instead of failing.
"""
from __future__ import annotations

from manager_watch.research.extractors.base import ExtractorUnavailable


def strip_comment_tables(html: str) -> str:
    """FBref hides tables inside HTML comments; expose them for parsing."""
    return html.replace("<!--", "").replace("-->", "")


def parse_squad_stats(html: str) -> dict:
    raise ExtractorUnavailable("fbref extractor not implemented yet")
