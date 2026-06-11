"""Per-club watch state machine: MONITORING -> CANDIDATE -> CONFIRMED ->
RESEARCHING -> COMPLETE -> (back to) MONITORING."""
from __future__ import annotations

from datetime import datetime, timezone

import structlog
from sqlalchemy.orm import Session

from manager_watch.db.models import WatchState

log = structlog.get_logger(__name__)

TRANSITIONS: dict[str, set[str]] = {
    "MONITORING": {"CANDIDATE", "CONFIRMED"},
    "CANDIDATE": {"MONITORING", "CONFIRMED"},
    "CONFIRMED": {"RESEARCHING"},
    "RESEARCHING": {"COMPLETE", "CONFIRMED"},  # CONFIRMED = retry after failure
    "COMPLETE": {"MONITORING", "CANDIDATE", "CONFIRMED"},
}


class InvalidTransition(Exception):
    pass


def advance(session: Session, club_id: int, new_state: str,
            candidate_name: str | None = None) -> WatchState:
    state = session.get(WatchState, club_id)
    if state is None:
        state = WatchState(club_id=club_id, state="MONITORING")
        session.add(state)
        session.flush()
    if new_state == state.state:
        return state
    if new_state not in TRANSITIONS.get(state.state, set()):
        raise InvalidTransition(f"{state.state} -> {new_state} (club_id={club_id})")
    log.info("watch_state.transition", club_id=club_id,
             from_state=state.state, to_state=new_state, candidate=candidate_name)
    state.state = new_state
    state.candidate_name = candidate_name
    state.updated_at = datetime.now(timezone.utc)
    session.flush()
    return state
