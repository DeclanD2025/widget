"""Wikipedia extractor via the MediaWiki API + mwparserfromhell.

Wikitext is far more stable than rendered HTML (design §5). Extracts the
infobox (birth date, nationality, managerial career) and the Honours
section.
"""
from __future__ import annotations

import re
from datetime import date

import mwparserfromhell

API_URL = (
    "https://en.wikipedia.org/w/api.php?action=parse&page={title}"
    "&prop=wikitext&format=json&formatversion=2"
)
SEARCH_URL = (
    "https://en.wikipedia.org/w/api.php?action=query&list=search"
    "&srsearch={query}&format=json&formatversion=2"
)

BIRTH_DATE_TEMPLATE = re.compile(
    r"(?:birth date(?: and age)?)\s*\|\s*(?:df=\w+\s*\|\s*)?(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})",
    re.I,
)
HONOUR_LINE = re.compile(r"^\*+\s*(?P<title>[^:–\n]+?)\s*[:–]\s*(?P<seasons>.+)$", re.M)
YEAR_RANGE = re.compile(r"(\d{4})\s*[-–]\s*(\d{4}|present)?", re.I)


def _strip_markup(text: str) -> str:
    return mwparserfromhell.parse(text).strip_code().strip()


def parse_infobox(wikitext: str) -> dict:
    """Returns {birth_date, nationality, manager_career: [{club, years}]}."""
    parsed = mwparserfromhell.parse(wikitext)
    result: dict = {"birth_date": None, "nationality": None, "manager_career": []}

    for template in parsed.filter_templates():
        name = str(template.name).strip().lower()
        if not name.startswith("infobox"):
            continue
        if template.has("birth_date"):
            match = BIRTH_DATE_TEMPLATE.search(str(template.get("birth_date").value))
            if match:
                year, month, day = (int(group) for group in match.groups())
                result["birth_date"] = date(year, month, day)
        for param in ("nationality", "birth_place"):
            if template.has(param) and not result["nationality"]:
                result["nationality"] = _strip_markup(str(template.get(param).value))

        clubs, years = [], []
        for param in template.params:
            param_name = str(param.name).strip().lower()
            if re.fullmatch(r"managerclubs\d+", param_name):
                clubs.append((param_name, _strip_markup(str(param.value))))
            elif re.fullmatch(r"manageryears\d+", param_name):
                years.append((param_name, _strip_markup(str(param.value))))
        clubs.sort()
        years.sort()
        year_map = {name.replace("manageryears", ""): value for name, value in years}
        for name, club in clubs:
            index = name.replace("managerclubs", "")
            result["manager_career"].append({"club": club, "years": year_map.get(index, "")})
        break
    return result


def parse_honours(wikitext: str) -> list[dict]:
    """Honours section list items -> [{"name": ..., "seasons": ...}]."""
    section_match = re.search(
        r"==+\s*Honours\s*==+(?P<body>.*?)(?:\n==[^=]|\Z)", wikitext, re.S | re.I
    )
    if not section_match:
        return []
    honours = []
    for match in HONOUR_LINE.finditer(section_match.group("body")):
        honours.append({
            "name": _strip_markup(match.group("title")),
            "seasons": _strip_markup(match.group("seasons")),
        })
    return honours


def career_years_to_dates(years: str) -> tuple[date | None, date | None]:
    """'2021–2024' -> (2021-07-01, 2024-06-30); 'present' end -> None."""
    match = YEAR_RANGE.search(years)
    if not match:
        return None, None
    start = date(int(match.group(1)), 7, 1)
    end_group = match.group(2)
    if not end_group or end_group.lower() == "present":
        return start, None
    return start, date(int(end_group), 6, 30)
