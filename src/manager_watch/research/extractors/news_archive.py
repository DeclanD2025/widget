"""News-archive quote harvester (design §5).

Pulls paragraphs matching the style/academy keyword rules from article
pages. Quotes are supporting evidence only (confidence cap 0.5) and are
never standalone facts.
"""
from __future__ import annotations

import re

import yaml
from bs4 import BeautifulSoup

from manager_watch.settings import settings

_pattern_cache: dict[str, re.Pattern] = {}


def _keyword_pattern(key: str) -> re.Pattern:
    if key not in _pattern_cache:
        config = yaml.safe_load(settings.patterns_file.read_text())
        _pattern_cache[key] = re.compile(config[key]["pattern"], re.I)
    return _pattern_cache[key]


def extract_quote_paragraphs(html: str, manager_name: str, key: str = "style_keywords") -> list[str]:
    """Paragraphs that mention the manager AND match the keyword rule set."""
    pattern = _keyword_pattern(key)
    soup = BeautifulSoup(html, "lxml")
    name_lower = manager_name.lower()
    surname = name_lower.split()[-1]
    paragraphs = []
    for p in soup.find_all(["p", "blockquote"]):
        text = p.get_text(" ", strip=True)
        if len(text) < 40:
            continue
        if (name_lower in text.lower() or surname in text.lower()) and pattern.search(text):
            paragraphs.append(text)
    return paragraphs
