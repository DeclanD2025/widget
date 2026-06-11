"""Shared helpers for HTML listing-page parsers."""
from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup

from manager_watch.types import NewsItem


def soup(text: str) -> BeautifulSoup:
    return BeautifulSoup(text, "lxml")


def items_from_links(
    anchors, *, base_url: str, source_name: str, publisher: str, min_headline_words: int = 3
) -> list[NewsItem]:
    """Build deduped NewsItems from <a> elements, skipping nav/short links."""
    seen: set[str] = set()
    items: list[NewsItem] = []
    for a in anchors:
        href = a.get("href")
        headline = a.get_text(" ", strip=True)
        if not href or not headline or len(headline.split()) < min_headline_words:
            continue
        url = urljoin(base_url, href)
        if url in seen:
            continue
        seen.add(url)
        items.append(
            NewsItem(source_name=source_name, publisher=publisher, url=url, headline=headline)
        )
    return items
