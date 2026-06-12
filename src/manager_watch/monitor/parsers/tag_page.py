"""Generic parser for newspaper tag/topic pages (Daily Record, Herald).

These sites share a common pattern: headline links inside <article> teasers.
Kept deliberately generic; fixture tests pin exact behaviour per site.
"""
from __future__ import annotations

from manager_watch.monitor.parsers._html import items_from_links, soup
from manager_watch.types import NewsItem


def parse(text: str, *, base_url: str, source_name: str, publisher: str) -> list[NewsItem]:
    doc = soup(text)
    anchors = doc.select("article h2 a, article h3 a, article a[class*='headline']")
    if not anchors:
        anchors = doc.select("[class*='teaser'] a, [class*='listing'] h3 a")
    return items_from_links(
        anchors, base_url=base_url, source_name=source_name, publisher=publisher
    )
