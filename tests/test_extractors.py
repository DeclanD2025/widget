from datetime import date
from pathlib import Path

from manager_watch.research.extractors import transfermarkt, wikipedia

FIXTURES = Path(__file__).parent / "fixtures" / "html"


def test_transfermarkt_stations():
    html = (FIXTURES / "transfermarkt_profile.html").read_text()
    stints = transfermarkt.parse_stations(html, source_url="http://tm/profile")
    assert len(stints) == 2
    first = stints[0]
    assert first.club == "Example FC"
    assert first.start_date == date(2021, 6, 1)
    assert first.end_date == date(2024, 5, 30)
    assert first.matches == 128
    assert first.points_per_game == 1.65


def test_transfermarkt_preferred_formation():
    html = (FIXTURES / "transfermarkt_profile.html").read_text()
    assert transfermarkt.parse_preferred_formation(html) == "4-3-3"


WIKITEXT = """
{{Infobox football biography
| name = Jane Doe
| birth_date = {{birth date and age|1975|3|14|df=y}}
| birth_place = Motherwell, Scotland
| manageryears1 = 2018–2021 | managerclubs1 = Other FC
| manageryears2 = 2021–2024 | managerclubs2 = Example FC
}}
Career text here.

== Honours ==
Example FC
* Scottish Championship: 2022–23
* Challenge Cup: 2023

== References ==
"""


def test_wikipedia_infobox():
    info = wikipedia.parse_infobox(WIKITEXT)
    assert info["birth_date"] == date(1975, 3, 14)
    assert "Motherwell" in info["nationality"]
    assert info["manager_career"] == [
        {"club": "Other FC", "years": "2018–2021"},
        {"club": "Example FC", "years": "2021–2024"},
    ]


def test_wikipedia_honours():
    honours = wikipedia.parse_honours(WIKITEXT)
    assert {"name": "Scottish Championship", "seasons": "2022–23"} in honours


def test_career_years_to_dates():
    start, end = wikipedia.career_years_to_dates("2021–2024")
    assert start == date(2021, 7, 1) and end == date(2024, 6, 30)
    start, end = wikipedia.career_years_to_dates("2024–present")
    assert start == date(2024, 7, 1) and end is None
