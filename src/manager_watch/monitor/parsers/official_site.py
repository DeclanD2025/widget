"""Parser for motherwellfc.co.uk news listing (WordPress-style markup).

Strategy: prefer headline links inside <article> elements; fall back to any
heading links within containers whose class mentions 'news' or 'post'.
"""
from __future__ import annotations

from manager_watch.monitor.parsers._html import items_from_links, soup
from manager_watch.types import NewsItem


def parse(text: str, *, base_url: str, source_name: str, publisher: str) -> list[NewsItem]:
    doc = soup(text)
    anchors = doc.select("article h1 a, article h2 a, article h3 a, article a[rel='bookmark']")
    if not anchors:
        anchors = doc.select(
            "[class*='news'] h2 a, [class*='news'] h3 a, [class*='post'] h2 a, [class*='post'] h3 a"
        )
    return items_from_links(
        anchors, base_url=base_url, source_name=source_name, publisher=publisher
    )
