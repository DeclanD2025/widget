"""End-to-end (offline): persist claims for a synthetic appointment into
SQLite, build the dossier (validated against the JSON schema), render the
Markdown report."""
from datetime import date, datetime, timezone

from manager_watch.db.models import Appointment, Club, Manager
from manager_watch.output.json_builder import build_dossier
from manager_watch.output.report import confidence_band, render_report
from manager_watch.research.orchestrator import persist_claims
from manager_watch.types import ClaimDraft, EvidenceDraft


def make_appointment(session) -> Appointment:
    club = Club(name="Motherwell", country="Scotland", league="Scottish Premiership")
    manager = Manager(canonical_name="jane doe", full_name="Jane Doe",
                      birth_date=date(1975, 3, 14), nationality="Scotland")
    session.add_all([club, manager])
    session.flush()
    appointment = Appointment(
        manager_id=manager.id, club_id=club.id,
        announced_at=datetime(2026, 6, 11, 9, 2, tzinfo=timezone.utc),
        announced_on=date(2026, 6, 11),
        confirmation_score=1.90,
    )
    session.add(appointment)
    session.flush()
    return appointment


def sample_claims() -> list[ClaimDraft]:
    evidence = [EvidenceDraft(source_name="Transfermarkt", url="http://tm/x",
                              locator="table", excerpt="4-3-3 (62%)")]
    return [
        ClaimDraft("tactical", "primary_formation",
                   {"value": "4-3-3", "share": 0.62, "sample_matches": 120}, 0.86,
                   evidence=list(evidence)),
        ClaimDraft("youth", "u21_minutes_share",
                   {"value": 0.14, "stints": [], "sample_matches": 120}, 0.74,
                   evidence=list(evidence)),
        ClaimDraft("career", "stint",
                   {"club": "Example FC", "role": "manager",
                    "start": "2021-06-01", "end": "2024-05-30",
                    "record": {"P": 128, "W": 61, "D": 30, "L": 37, "ppg": 1.65},
                    "win_pct": 0.477, "tenure_days": 1094, "honours": [],
                    "departure": "resigned", "flagged_failure": False}, 0.92,
                   evidence=list(evidence)),
        ClaimDraft("career", "stint_start", {"value": "2021-07-01"}, 0.6,
                   evidence=list(evidence), status="DISPUTED"),
    ]


def test_dossier_builds_and_validates(session):
    appointment = make_appointment(session)
    persist_claims(session, appointment, sample_claims())

    dossier = build_dossier(session, appointment)  # raises if schema-invalid
    assert dossier["appointment"]["manager"]["full_name"] == "Jane Doe"
    assert dossier["tactical_profile"]["primary_formation"]["value"] == "4-3-3"
    assert dossier["career_history"]["stints"][0]["record"]["ppg"] == 1.65
    assert dossier["disputed_claims"][0]["predicate"] == "stint_start"
    assert 0 < dossier["overall_confidence"] <= 1
    assert dossier["evidence_index"]


def test_report_renders(session):
    appointment = make_appointment(session)
    persist_claims(session, appointment, sample_claims())
    dossier = build_dossier(session, appointment)
    markdown = render_report(dossier)
    assert "# Manager Dossier: Jane Doe — Motherwell F.C." in markdown
    assert "Primary formation: 4-3-3" in markdown
    assert "Example FC" in markdown
    assert "Conflicting evidence" in markdown
    assert "[E" in markdown  # citations present


def test_confidence_bands():
    assert confidence_band(0.81) == "High"
    assert confidence_band(0.6) == "Medium"
    assert confidence_band(0.2) == "Low"
