"""Per-source parsers: pure functions, HTML/feed text in -> list[NewsItem] out.

Each module exposes `parse(text: str, *, base_url: str, source_name: str,
publisher: str) -> list[NewsItem]`. Resolve a parser by the `parser` field of
a sources.yaml entry via `get_parser(name)`.
"""
from __future__ import annotations

from importlib import import_module
from typing import Callable

from manager_watch.types import NewsItem

ParseFn = Callable[..., list[NewsItem]]

_PARSERS = {
    "official_site": "manager_watch.monitor.parsers.official_site",
    "bbc": "manager_watch.monitor.parsers.bbc",
    "sky": "manager_watch.monitor.parsers.sky",
    "tag_page": "manager_watch.monitor.parsers.tag_page",
    "rss": "manager_watch.monitor.parsers.rss",
    "wikipedia_rev": "manager_watch.monitor.parsers.wikipedia_rev",
}


def get_parser(name: str) -> ParseFn:
    module = import_module(_PARSERS[name])
    return module.parse
