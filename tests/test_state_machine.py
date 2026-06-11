import pytest

from manager_watch.db.models import Club, WatchState
from manager_watch.trigger.state_machine import InvalidTransition, advance


def make_club(session) -> Club:
    club = Club(name="Motherwell", country="Scotland")
    session.add(club)
    session.flush()
    return club


def test_full_cycle(session):
    club = make_club(session)
    advance(session, club.id, "CANDIDATE", "jane doe")
    advance(session, club.id, "CONFIRMED", "jane doe")
    advance(session, club.id, "RESEARCHING", "jane doe")
    state = advance(session, club.id, "COMPLETE")
    assert state.state == "COMPLETE"
    # next cycle can start
    advance(session, club.id, "CONFIRMED", "john smith")


def test_invalid_transition_rejected(session):
    club = make_club(session)
    with pytest.raises(InvalidTransition):
        advance(session, club.id, "RESEARCHING")


def test_same_state_noop(session):
    club = make_club(session)
    state = advance(session, club.id, "MONITORING")
    assert state.state == "MONITORING"


def test_research_failure_returns_to_confirmed(session):
    club = make_club(session)
    advance(session, club.id, "CONFIRMED", "jane doe")
    advance(session, club.id, "RESEARCHING", "jane doe")
    state = advance(session, club.id, "CONFIRMED", "jane doe")  # retry path
    assert state.state == "CONFIRMED"
