"""RSS/Atom parser (official club feed, Google News query feed, X bridge)."""
from __future__ import annotations

from datetime import datetime, timezone
from time import mktime
from urllib.parse import urlsplit

import feedparser

from manager_watch.types import NewsItem


def parse(text: str, *, base_url: str, source_name: str, publisher: str) -> list[NewsItem]:
    feed = feedparser.parse(text)
    items: list[NewsItem] = []
    for entry in feed.entries:
        url = entry.get("link") or ""
        headline = (entry.get("title") or "").strip()
        if not url or not headline:
            continue
        published_at = None
        if entry.get("published_parsed"):
            published_at = datetime.fromtimestamp(
                mktime(entry.published_parsed), tz=timezone.utc
            )
        # Google News items: attribute to the underlying publisher so the
        # quorum counts distinct outlets, not news.google.com repeatedly.
        item_publisher = publisher
        if publisher == "news.google.com":
            source_detail = entry.get("source", {})
            origin = source_detail.get("href") or source_detail.get("title") or ""
            if origin.startswith("http"):
                item_publisher = urlsplit(origin).netloc.removeprefix("www.")
            elif origin:
                item_publisher = origin.lower()
        items.append(
            NewsItem(
                source_name=source_name,
                publisher=item_publisher,
                url=url,
                headline=headline,
                body_text=(entry.get("summary") or "")[:1000],
                published_at=published_at,
            )
        )
    return items
