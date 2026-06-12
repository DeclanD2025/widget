"""Parser for skysports.com/motherwell-news listing pages."""
from __future__ import annotations

from manager_watch.monitor.parsers._html import items_from_links, soup
from manager_watch.types import NewsItem


def parse(text: str, *, base_url: str, source_name: str, publisher: str) -> list[NewsItem]:
    doc = soup(text)
    anchors = doc.select(
        "a.news-list__headline-link, h3.news-list__headline a, a[class*='headline']"
    )
    return items_from_links(
        anchors, base_url=base_url, source_name=source_name, publisher=publisher
    )
