"""Deduplication of parsed news items (design §2, Dedup component).

Exact dedup: sha256(canonical_url + normalized_headline).
Fuzzy dedup: rapidfuzz token_sort_ratio >= 92 against recent headlines.
"""
from __future__ import annotations

import hashlib
import re
import string
import unicodedata
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from rapidfuzz import fuzz

FUZZY_THRESHOLD = 92

TRACKING_PARAMS = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
                   "fbclid", "gclid", "at_medium", "at_campaign", "ns_mchannel", "ns_source"}

_PUNCT_TABLE = str.maketrans("", "", string.punctuation)


def normalize_headline(headline: str) -> str:
    text = unicodedata.normalize("NFKD", headline)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower().translate(_PUNCT_TABLE)
    return re.sub(r"\s+", " ", text).strip()


def canonical_url(url: str) -> str:
    parts = urlsplit(url.strip())
    query = urlencode(
        [(k, v) for k, v in parse_qsl(parts.query) if k.lower() not in TRACKING_PARAMS]
    )
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, query, ""))


def dedup_hash(url: str, headline: str) -> str:
    payload = canonical_url(url) + "|" + normalize_headline(headline)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def is_fuzzy_duplicate(headline: str, recent_headlines: list[str]) -> bool:
    norm = normalize_headline(headline)
    return any(
        fuzz.token_sort_ratio(norm, normalize_headline(other)) >= FUZZY_THRESHOLD
        for other in recent_headlines
    )
