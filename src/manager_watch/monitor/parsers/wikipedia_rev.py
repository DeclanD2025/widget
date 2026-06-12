"""Parser for the MediaWiki revisions API response (JSON).

Each revision becomes a NewsItem whose headline is the edit comment, so the
trigger rule engine can classify comments like "appointed Jane Doe as
manager". Wikipedia is TIER2: corroboration only, never a sole trigger.
"""
from __future__ import annotations

import json
from datetime import datetime

from manager_watch.types import NewsItem


def parse(text: str, *, base_url: str, source_name: str, publisher: str) -> list[NewsItem]:
    data = json.loads(text)
    items: list[NewsItem] = []
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        title = page.get("title", "")
        for rev in page.get("revisions", []):
            comment = (rev.get("comment") or "").strip()
            if not comment:
                continue
            revid = rev.get("revid")
            published_at = None
            if rev.get("timestamp"):
                published_at = datetime.fromisoformat(rev["timestamp"].replace("Z", "+00:00"))
            items.append(
                NewsItem(
                    source_name=source_name,
                    publisher=publisher,
                    url=f"https://en.wikipedia.org/w/index.php?diff={revid}",
                    headline=f"{title}: {comment}",
                    published_at=published_at,
                )
            )
    return items
