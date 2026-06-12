"""SQLAlchemy models — schema per docs/manager-watch-system-design.md §4.

JSONB columns carry a SQLite variant so unit tests can run against
sqlite:///:memory: while production uses PostgreSQL.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    Numeric,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

JSONVariant = JSONB().with_variant(JSON(), "sqlite")
TextArray = ARRAY(Text).with_variant(JSON(), "sqlite")
PKType = BigInteger().with_variant(Integer(), "sqlite")


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Source(TimestampMixin, Base):
    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(PKType, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True)
    publisher: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(Text)
    tier: Mapped[str] = mapped_column(Text)
    weight: Mapped[float] = mapped_column(Numeric(3, 2))
    poll_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parser: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, default="ACTIVE", server_default="ACTIVE")
    # conditional-GET state
    etag: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_modified: Mapped[str | None] = mapped_column(Text, nullable=True)
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    __table_args__ = (
        CheckConstraint("kind IN ('html','rss','api','social')", name="sources_kind_check"),
        CheckConstraint(
            "tier IN ('OFFICIAL','TIER1','TIER2','TIER3')", name="sources_tier_check"
        ),
    )


class RawDocument(TimestampMixin, Base):
    __tablename__ = "raw_documents"

    id: Mapped[int] = mapped_column(PKType, primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("sources.id"))
    url: Mapped[str] = mapped_column(Text)
    fetched_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    http_status: Mapped[int] = mapped_column(Integer)
    content_sha256: Mapped[str] = mapped_column(Text)
    content_gz: Mapped[bytes] = mapped_column(LargeBinary)

    __table_args__ = (
        UniqueConstraint("source_id", "url", "content_sha256", name="raw_documents_dedup"),
    )


class DetectionEvent(TimestampMixin, Base):
    __tablename__ = "detection_events"

    id: Mapped[int] = mapped_column(PKType, primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("sources.id"))
    raw_document_id: Mapped[int] = mapped_column(ForeignKey("raw_documents.id"))
    url: Mapped[str] = mapped_column(Text)
    headline: Mapped[str] = mapped_column(Text)
    published_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    dedup_hash: Mapped[str] = mapped_column(Text, unique=True)
    classification: Mapped[str] = mapped_column(Text)
    extracted_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_interim: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    matched_patterns: Mapped[list | None] = mapped_column(TextArray, nullable=True)

    source: Mapped[Source] = relationship()

    __table_args__ = (
        CheckConstraint(
            "classification IN ('IRRELEVANT','SPECULATION','CANDIDATE','CONFIRMATION','DUPLICATE')",
            name="detection_events_classification_check",
        ),
    )


class Manager(TimestampMixin, Base):
    __tablename__ = "managers"

    id: Mapped[int] = mapped_column(PKType, primary_key=True)
    canonical_name: Mapped[str] = mapped_column(Text)
    full_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    birth_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    nationality: Mapped[str | None] = mapped_column(Text, nullable=True)
    transfermarkt_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    wikipedia_title: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    fbref_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)

    __table_args__ = (
        UniqueConstraint("canonical_name", "birth_date", name="managers_identity"),
    )


class Club(TimestampMixin, Base):
    __tablename__ = "clubs"

    id: Mapped[int] = mapped_column(PKType, primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    country: Mapped[str | None] = mapped_column(Text, nullable=True)
    league: Mapped[str | None] = mapped_column(Text, nullable=True)
    transfermarkt_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)

    __table_args__ = (UniqueConstraint("name", "country", name="clubs_identity"),)


class ManagerStint(TimestampMixin, Base):
    __tablename__ = "manager_stints"

    id: Mapped[int] = mapped_column(PKType, primary_key=True)
    manager_id: Mapped[int] = mapped_column(ForeignKey("managers.id"))
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"))
    role: Mapped[str] = mapped_column(Text, default="manager", server_default="manager")
    start_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    matches: Mapped[int | None] = mapped_column(Integer, nullable=True)
    wins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    draws: Mapped[int | None] = mapped_column(Integer, nullable=True)
    losses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    points_per_game: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    honours: Mapped[list | None] = mapped_column(JSONVariant, nullable=True)

    manager: Mapped[Manager] = relationship()
    club: Mapped[Club] = relationship()

    __table_args__ = (
        UniqueConstraint("manager_id", "club_id", "start_date", name="manager_stints_identity"),
    )


class Match(TimestampMixin, Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(PKType, primary_key=True)
    stint_id: Mapped[int] = mapped_column(ForeignKey("manager_stints.id"))
    match_date: Mapped[dt.date] = mapped_column(Date)
    competition: Mapped[str | None] = mapped_column(Text, nullable=True)
    opponent: Mapped[str | None] = mapped_column(Text, nullable=True)
    home: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    goals_for: Mapped[int | None] = mapped_column(Integer, nullable=True)
    goals_against: Mapped[int | None] = mapped_column(Integer, nullable=True)
    formation: Mapped[str | None] = mapped_column(Text, nullable=True)
    lineup: Mapped[list | None] = mapped_column(JSONVariant, nullable=True)
    source_url: Mapped[str] = mapped_column(Text)
    raw_document_id: Mapped[int | None] = mapped_column(
        ForeignKey("raw_documents.id"), nullable=True
    )

    stint: Mapped[ManagerStint] = relationship()

    __table_args__ = (
        UniqueConstraint("stint_id", "match_date", "opponent", name="matches_identity"),
    )


class Appointment(TimestampMixin, Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(PKType, primary_key=True)
    manager_id: Mapped[int] = mapped_column(ForeignKey("managers.id"))
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"))
    announced_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    # stored date column so the per-day duplicate guard is a plain unique constraint
    announced_on: Mapped[dt.date] = mapped_column(Date)
    is_interim: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    confirmation_score: Mapped[float] = mapped_column(Numeric(4, 2))
    status: Mapped[str] = mapped_column(Text, default="ACTIVE", server_default="ACTIVE")
    research_state: Mapped[str] = mapped_column(
        Text, default="PENDING", server_default="PENDING"
    )

    manager: Mapped[Manager] = relationship()
    club: Mapped[Club] = relationship()

    __table_args__ = (
        UniqueConstraint("manager_id", "club_id", "announced_on", name="appointments_dedup"),
        CheckConstraint(
            "research_state IN ('PENDING','RUNNING','COMPLETE','FAILED')",
            name="appointments_research_state_check",
        ),
        Index(
            "one_active_per_club",
            "club_id",
            unique=True,
            postgresql_where=text("status = 'ACTIVE'"),
            sqlite_where=text("status = 'ACTIVE'"),
        ),
    )


class Claim(TimestampMixin, Base):
    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(PKType, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"))
    manager_id: Mapped[int] = mapped_column(ForeignKey("managers.id"))
    category: Mapped[str] = mapped_column(Text)
    predicate: Mapped[str] = mapped_column(Text)
    value: Mapped[dict] = mapped_column(JSONVariant)
    confidence: Mapped[float] = mapped_column(Numeric(3, 2))
    status: Mapped[str] = mapped_column(Text, default="ACCEPTED", server_default="ACCEPTED")

    evidence: Mapped[list["Evidence"]] = relationship(back_populates="claim")

    __table_args__ = (
        CheckConstraint(
            "category IN ('tactical','youth','career','biographical')",
            name="claims_category_check",
        ),
    )


class Evidence(TimestampMixin, Base):
    __tablename__ = "evidence"

    id: Mapped[int] = mapped_column(PKType, primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"))
    source_id: Mapped[int] = mapped_column(ForeignKey("sources.id"))
    raw_document_id: Mapped[int] = mapped_column(ForeignKey("raw_documents.id"))
    url: Mapped[str] = mapped_column(Text)
    locator: Mapped[str | None] = mapped_column(Text, nullable=True)
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    retrieved_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))

    claim: Mapped[Claim] = relationship(back_populates="evidence")


class ResearchTask(TimestampMixin, Base):
    __tablename__ = "research_tasks"

    id: Mapped[int] = mapped_column(PKType, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"))
    task_name: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, default="PENDING", server_default="PENDING")
    attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("appointment_id", "task_name", name="research_tasks_identity"),
    )


class Report(TimestampMixin, Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(PKType, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), unique=True)
    dossier_json: Mapped[dict] = mapped_column(JSONVariant)
    report_markdown: Mapped[str] = mapped_column(Text)
    overall_confidence: Mapped[float] = mapped_column(Numeric(3, 2))


class WatchState(Base):
    __tablename__ = "watch_state"

    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), primary_key=True)
    state: Mapped[str] = mapped_column(Text, default="MONITORING", server_default="MONITORING")
    candidate_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
