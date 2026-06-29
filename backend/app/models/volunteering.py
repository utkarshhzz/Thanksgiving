"""
app/models/volunteering.py
===========================
Models for the volunteering module.

Contains:
  - VolunteerOpportunity : What the organization needs
  - VolunteerApplication : Who applied
  - HourLog              : Hours volunteered (manual or QR-based)
"""

import uuid
from datetime import datetime, date
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    String, Text, Date, DateTime, Enum, ForeignKey,
    Numeric, Integer, Boolean, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


# ── Enums ─────────────────────────────────────────────────────────────────────

class LocationType(str, PyEnum):
    REMOTE = "remote"
    ONSITE = "onsite"
    HYBRID = "hybrid"


class UrgencyLevel(str, PyEnum):
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class OpportunityStatus(str, PyEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"           # Filled or manually closed
    CANCELLED = "cancelled"     # BUG FIX: was missing — services use this


class ApplicationStatus(str, PyEnum):
    PENDING = "pending"         # Submitted, awaiting org review
    APPROVED = "approved"       # Org accepted this volunteer
    REJECTED = "rejected"       # Org declined
    WITHDRAWN = "withdrawn"     # Volunteer withdrew their application


class LogMethod(str, PyEnum):
    MANUAL = "manual"           # Volunteer self-reported hours
    QR_CHECKIN = "qr_checkin"   # Automatic via QR scan


class VerificationStatus(str, PyEnum):
    PENDING = "pending"         # Not yet reviewed
    VERIFIED = "verified"       # Org confirmed the hours
    REJECTED = "rejected"       # Org disputed the hours


# ── Models ────────────────────────────────────────────────────────────────────

class VolunteerOpportunity(Base):
    """
    Represents a volunteering role posted by an organization.
    Think of it as a job posting — but for volunteers.
    """
    __tablename__ = "volunteer_opportunities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Skills stored as comma-separated string for MVP.
    # e.g. "Python, Teaching, Driving"
    # Phase 4: migrate to a skills junction table (many-to-many)
    required_skills: Mapped[str | None] = mapped_column(Text, nullable=True)

    location_type: Mapped[LocationType] = mapped_column(
        Enum(LocationType), default=LocationType.ONSITE, nullable=False
    )
    location_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)

    commitment_hours_per_week: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    commitment_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)

    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Slot tracking — how many volunteers needed vs filled
    available_slots: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    filled_slots: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    urgency_level: Mapped[UrgencyLevel] = mapped_column(
        Enum(UrgencyLevel), default=UrgencyLevel.NORMAL, nullable=False
    )
    status: Mapped[OpportunityStatus] = mapped_column(
        Enum(OpportunityStatus),
        default=OpportunityStatus.DRAFT,
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    applications: Mapped[list["VolunteerApplication"]] = relationship(
        "VolunteerApplication", back_populates="opportunity"
    )

    def __repr__(self) -> str:
        return f"<VolunteerOpportunity id={self.id} title={self.title}>"


class VolunteerApplication(Base):
    """
    A volunteer's application to a specific opportunity.
    One row = one person applying to one role.

    BUG FIX: Was named 'VolunteeringApplication' (wrong — extra 'ing').
    env.py imports 'VolunteerApplication', so name must match exactly.
    """
    __tablename__ = "volunteer_applications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("volunteer_opportunities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    volunteer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus),
        default=ApplicationStatus.PENDING,
        nullable=False,
        index=True,
    )

    # Why the volunteer wants to join — shown to org coordinator
    cover_letter: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Internal notes from org coordinator — NOT shown to the volunteer
    coordinator_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    opportunity: Mapped["VolunteerOpportunity"] = relationship(
        "VolunteerOpportunity", back_populates="applications"
    )
    volunteer: Mapped["User"] = relationship("User")

    # DB-level uniqueness: one volunteer cannot apply to the same opportunity twice.
    # BUG FIX: UniqueConstraint is now imported at the top of the file (not inside class body).
    # __table_args__ must be a tuple — note the trailing comma: (constraint,)
    __table_args__ = (
        UniqueConstraint("opportunity_id", "volunteer_id", name="uq_application"),
    )


class HourLog(Base):
    """
    Records volunteer hours for one session.

    Each row = one volunteering session (could be one afternoon, one day, etc.)
    A volunteer can have multiple logs for the same opportunity
    (e.g., they show up every Saturday = one log per Saturday).

    Two ways to create a log:
      MANUAL:    Volunteer types in their hours → starts PENDING → org verifies
      QR_CHECKIN: Volunteer scans QR → system records timestamps → auto VERIFIED
    """
    __tablename__ = "volunteer_hour_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    volunteer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("volunteer_opportunities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Denormalized FK to org for fast impact queries ("total hours for org X")
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Time tracking ─────────────────────────────────────────────────────────
    hours_logged: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)

    # BUG FIX: was "log_date=Mapped[Date]=mapped_column(...)"
    # CORRECT syntax: variable_name: Mapped[python_type] = mapped_column(sqlalchemy_type)
    # - The colon (:) introduces the TYPE ANNOTATION
    # - Mapped[date] uses Python's `date` (lowercase, from datetime module)
    # - mapped_column(Date) uses SQLAlchemy's `Date` (uppercase, from sqlalchemy)
    log_date: Mapped[date] = mapped_column(Date, nullable=False)

    # QR timestamps — None for manual logs, set by system for QR logs
    check_in_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    check_out_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    log_method: Mapped[LogMethod] = mapped_column(
        Enum(LogMethod),
        default=LogMethod.MANUAL,
        nullable=False,
    )

    # ── Verification ──────────────────────────────────────────────────────────
    # Manual logs: PENDING until org coordinator verifies
    # QR logs: automatically VERIFIED (system recorded timestamps — objective)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus),
        default=VerificationStatus.PENDING,
        nullable=False,
        index=True,
    )

    # Two columns point to users.id — we need foreign_keys= on the relationship
    # to tell SQLAlchemy which FK the relationship uses
    verified_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    verification_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    # foreign_keys=[volunteer_id] disambiguates from verified_by (both point to users)
    volunteer: Mapped["User"] = relationship("User", foreign_keys=[volunteer_id])
    opportunity: Mapped["VolunteerOpportunity"] = relationship("VolunteerOpportunity")

    def __repr__(self) -> str:
        return f"<HourLog id={self.id} hours={self.hours_logged} volunteer={self.volunteer_id}>"
