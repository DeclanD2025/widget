"""Sync the sources table and the watched club row from config files."""
from __future__ import annotations

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from manager_watch.db.models import Club, Source, WatchState
from manager_watch.settings import settings


def sync_sources(session: Session) -> list[Source]:
    config = yaml.safe_load(settings.sources_file.read_text())
    synced: list[Source] = []
    for entry in config["sources"]:
        if not entry.get("url"):
            continue  # optional sources (e.g. X bridge) disabled via empty url
        source = session.scalar(select(Source).where(Source.name == entry["name"]))
        if source is None:
            source = Source(name=entry["name"])
            session.add(source)
        source.publisher = entry["publisher"]
        source.url = entry["url"]
        source.kind = entry["kind"]
        source.tier = entry["tier"]
        source.weight = entry["weight"]
        source.poll_seconds = entry.get("poll_seconds")
        source.parser = entry.get("parser")
        synced.append(source)
    session.flush()
    return synced


def ensure_watched_club(session: Session) -> Club:
    club = session.scalar(select(Club).where(Club.name == settings.watched_club))
    if club is None:
        club = Club(name=settings.watched_club, country="Scotland", league="Scottish Premiership")
        session.add(club)
        session.flush()
    state = session.get(WatchState, club.id)
    if state is None:
        session.add(WatchState(club_id=club.id, state="MONITORING"))
        session.flush()
    return club
