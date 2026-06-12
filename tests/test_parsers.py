import json
from pathlib import Path

from manager_watch.monitor.parsers import bbc, official_site, rss, wikipedia_rev

FIXTURES = Path(__file__).parent / "fixtures" / "html"


def read(name: str) -> str:
    return (FIXTURES / name).read_text()


def test_official_site_parser():
    items = official_site.parse(
        read("official_site.html"),
        base_url="https://www.motherwellfc.co.uk/news/",
        source_name="Motherwell FC Official", publisher="motherwellfc.co.uk",
    )
    headlines = [item.headline for item in items]
    assert "Motherwell appoint Jane Doe as new manager" in headlines
    assert len(items) == 3
    assert all(item.url.startswith("https://www.motherwellfc.co.uk/") for item in items)


def test_bbc_parser_filters_non_articles():
    items = bbc.parse(
        read("bbc_team_page.html"),
        base_url="https://www.bbc.co.uk/sport/football/teams/motherwell",
        source_name="BBC Sport Motherwell", publisher="bbc.co.uk",
    )
    assert len(items) == 2  # iplayer link filtered out
    assert items[0].headline == "Motherwell appoint Jane Doe as new manager"
    assert items[0].url == "https://www.bbc.co.uk/sport/football/articles/abc123"


def test_rss_parser():
    items = rss.parse(
        read("club_feed.xml"),
        base_url="https://www.motherwellfc.co.uk/feed/",
        source_name="Motherwell FC RSS", publisher="motherwellfc.co.uk",
    )
    assert len(items) == 2
    assert items[0].published_at is not None
    assert "appoint Jane Doe" in items[0].headline


def test_wikipedia_rev_parser():
    payload = {
        "query": {"pages": {"123": {
            "title": "Motherwell F.C.",
            "revisions": [
                {"revid": 999, "timestamp": "2026-06-11T09:30:00Z",
                 "comment": "Updated manager: appointed Jane Doe as manager"},
                {"revid": 998, "timestamp": "2026-06-10T08:00:00Z", "comment": ""},
            ],
        }}}
    }
    items = wikipedia_rev.parse(
        json.dumps(payload), base_url="", source_name="Wikipedia",
        publisher="en.wikipedia.org",
    )
    assert len(items) == 1  # empty comment skipped
    assert "appointed Jane Doe" in items[0].headline
    assert "diff=999" in items[0].url
