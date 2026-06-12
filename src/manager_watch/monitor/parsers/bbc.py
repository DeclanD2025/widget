"""Parser for the BBC Sport team page (bbc.co.uk/sport/football/teams/motherwell).

BBC markup shifts between data-testid promo components and legacy gs-c-promo
classes; try both selector families.
"""
from __future__ import annotations

from manager_watch.monitor.parsers._html import items_from_links, soup
from manager_watch.types import NewsItem


def parse(text: str, *, base_url: str, source_name: str, publisher: str) -> list[NewsItem]:
    doc = soup(text)
    anchors = doc.select(
        "a[data-testid='internal-link'], a[class*='PromoLink'], a.gs-c-promo-heading"
    )
    # keep only article-shaped links
    anchors = [
        a for a in anchors
        if "/sport/" in (a.get("href") or "") or "/news/" in (a.get("href") or "")
    ]
    return items_from_links(
        anchors, base_url=base_url, source_name=source_name, publisher=publisher
    )
