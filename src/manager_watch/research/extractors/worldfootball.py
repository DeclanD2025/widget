"""WorldFootball.net extractor: club season match list pages.

Parses `table.standard_tabelle` schedule tables into MatchRecords.
Lineup detail pages (for youth analysis) are a follow-up fetch per match —
see orchestrator TODO; this module parses both page types.
"""
from __future__ import annotations

import re
from datetime import datetime

from bs4 import BeautifulSoup

from manager_watch.types import LineupPlayer, MatchRecord

SCORE = re.compile(r"(\d+):(\d+)")
DATE = re.compile(r"(\d{2})/(\d{2})/(\d{4})")


def parse_season_matches(html: str, club_name: str, source_url: str = "") -> list[MatchRecord]:
    soup = BeautifulSoup(html, "lxml")
    records: list[MatchRecord] = []
    for table in soup.select("table.standard_tabelle"):
        current_date = None
        for row in table.select("tr"):
            cells = [cell.get_text(" ", strip=True) for cell in row.find_all("td")]
            if not cells:
                continue
            date_match = DATE.search(cells[0]) if cells[0] else None
            if date_match:
                day, month, year = date_match.groups()
                current_date = datetime(int(year), int(month), int(day)).date()
            score_match = next((SCORE.search(cell) for cell in cells if SCORE.search(cell)), None)
            if not current_date or not score_match:
                continue
            teams = [cell for cell in cells if cell and not SCORE.search(cell) and not DATE.search(cell)]
            home_team = teams[0] if teams else ""
            away_team = teams[1] if len(teams) > 1 else ""
            is_home = club_name.lower() in home_team.lower()
            opponent = away_team if is_home else home_team
            goals_home, goals_away = int(score_match.group(1)), int(score_match.group(2))
            records.append(
                MatchRecord(
                    match_date=current_date,
                    opponent=opponent,
                    home=is_home,
                    goals_for=goals_home if is_home else goals_away,
                    goals_against=goals_away if is_home else goals_home,
                    source_url=source_url,
                )
            )
    return records


def parse_match_lineup(html: str, club_name: str) -> list[LineupPlayer]:
    """Best-effort lineup extraction from a match detail page. Ages must be
    joined from cached player pages by the orchestrator (age_on_date left
    None here)."""
    soup = BeautifulSoup(html, "lxml")
    players: list[LineupPlayer] = []
    for table in soup.select("table.standard_tabelle"):
        heading = table.find_previous(["h2", "h3"])
        if heading and club_name.lower() not in heading.get_text(strip=True).lower():
            continue
        for anchor in table.select("a[href*='/player_summary/'], a[href*='/spieler_profil/']"):
            name = anchor.get_text(strip=True)
            if name and all(player.name != name for player in players):
                players.append(LineupPlayer(name=name, minutes=90))
    return players
