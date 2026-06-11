"""Transfermarkt extractor: manager profile + station history table.

Parse functions are pure (HTML in -> records out) so they are fixture-
testable; fetch glue lives in the orchestrator. Columns are mapped by
header text, never by position (design §5/§9).
"""
from __future__ import annotations

import re
from datetime import datetime

from bs4 import BeautifulSoup

from manager_watch.research.extractors.base import header_indexed_columns
from manager_watch.types import StintRecord

SEARCH_URL = "https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query={query}"

STATION_COLUMNS = {
    "club": ["club", "verein"],
    "role": ["role", "position", "funktion"],
    "appointed": ["appointed", "from", "amtsantritt"],
    "until": ["in charge until", "until", "contract", "bis"],
    "matches": ["matches", "spiele"],
    "ppg": ["ppm", "pts", "punkte"],
}

DATE_FORMATS = ("%d.%m.%Y", "%b %d, %Y", "%d/%m/%Y")


def _parse_date(raw: str):
    raw = raw.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def _parse_number(raw: str):
    cleaned = raw.strip().replace(".", "").replace(",", ".")
    try:
        value = float(cleaned)
    except ValueError:
        return None
    return int(value) if value.is_integer() else value


def parse_search_results(html: str) -> list[dict]:
    """Returns [{"name": ..., "transfermarkt_id": ..., "club": ...}] for
    manager/coach rows in quick-search results."""
    soup = BeautifulSoup(html, "lxml")
    results = []
    for anchor in soup.select("table.items a[href*='/profil/trainer/']"):
        match = re.search(r"/profil/trainer/(\d+)", anchor["href"])
        if not match:
            continue
        row = anchor.find_parent("tr")
        club_cell = row.select_one("td a[href*='/verein/']") if row else None
        results.append({
            "name": anchor.get_text(strip=True),
            "transfermarkt_id": match.group(1),
            "club": club_cell.get_text(strip=True) if club_cell else None,
        })
    return results


def parse_stations(html: str, source_url: str = "") -> list[StintRecord]:
    """Parse the 'Stations as coach/manager' history table on a trainer
    profile page into StintRecords."""
    soup = BeautifulSoup(html, "lxml")
    stints: list[StintRecord] = []
    for table in soup.select("table.items"):
        header_cells = [th.get_text(" ", strip=True) for th in table.select("thead th")]
        columns = header_indexed_columns(header_cells, STATION_COLUMNS)
        if "club" not in columns or "appointed" not in columns:
            continue  # not the stations table
        for row in table.select("tbody > tr"):
            cells = row.find_all("td", recursive=False)
            if len(cells) <= max(columns.values()):
                continue

            def cell(logical: str) -> str:
                index = columns.get(logical)
                return cells[index].get_text(" ", strip=True) if index is not None else ""

            club = cell("club")
            if not club:
                continue
            ppg = _parse_number(cell("ppg")) if "ppg" in columns else None
            matches = _parse_number(cell("matches")) if "matches" in columns else None
            stints.append(
                StintRecord(
                    club=club,
                    role=cell("role").lower() or "manager",
                    start_date=_parse_date(cell("appointed")),
                    end_date=_parse_date(cell("until")),
                    matches=int(matches) if isinstance(matches, (int, float)) else None,
                    points_per_game=float(ppg) if ppg is not None else None,
                    source_url=source_url,
                )
            )
    return stints


def parse_preferred_formation(html: str) -> str | None:
    soup = BeautifulSoup(html, "lxml")
    for item in soup.select("li, tr, div"):
        text = item.get_text(" ", strip=True)
        match = re.search(r"preferred formation\s*:?\s*([0-9](?:-[0-9]){2,4})", text, re.I)
        if match:
            return match.group(1)
    return None
