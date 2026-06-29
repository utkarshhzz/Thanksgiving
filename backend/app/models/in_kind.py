# model for in kind physical item donations
# FIX: Removed 'from app.models.organization import Organization'
#      and 'from app.models.user import User' from top of file.
# WHY: SQLAlchemy relationships use STRING references like relationship("Organization")
#      which are resolved LAZILY at runtime — you don't need to import the class.
#      Direct imports here risk circular imports:
#      in_kind → organization → (if organization ever imports in_kind) → loop crash.
import uuid
from datetime import datetime, date
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    String, Text, Date, DateTime, Enum,
    ForeignKey, Numeric, Integer, Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.base import Base

class ItemCategory(str,PyEnum):
    CLOTHING = "clothing"
    FOOD = "food"
    ELECTRONICS = "electronics"
    FURNITURE = "furniture"
    BOOKS = "books"
    MEDICAL = "medical"
    TOYS = "toys"
    TOOLS = "tools"
    OTHER = "other"

class ItemCondition(str,PyEnum):
    NEW = "new"
    GENTLY_USED = "gently_used"
    FAIR = "fair"
    POOR = "poor"

class InKindStatus(str,PyEnum):
    OFFERED = "offered"         # Donor submitted offer
    ACCEPTED = "accepted"       # Org accepted — pickup to be scheduled
    REJECTED = "rejected"       # Org doesn't need this
    PICKED_UP = "picked_up"     # Item collected from donor
    RECEIVED = "received"       # Item confirmed at org facility
    DISTRIBUTED = "distributed" # Item handed to beneficiary
    CANCELLED = "cancelled"     # Either party cancelled

class InKindDonation(Base):
    __tablename__="in_kind_donations"

    id:Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    donor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Which organization receives this donation
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_name:Mapped[str]=mapped_column(String(255),nullable=False)
    item_description:Mapped[str| None]=mapped_column(Text,nullable=True)
    category:Mapped[ItemCategory]=mapped_column(Enum(ItemCategory),default=ItemCategory.OTHER,nullable=False,index=True)
    condition: Mapped[ItemCondition] = mapped_column(
        Enum(ItemCondition), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_of_measure: Mapped[str] = mapped_column(String(50), default="items", nullable=False)
    # Donor's estimate of item value — used for tax receipt generation (Phase 4)
    estimated_value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    # ── Pickup Logistics ──────────────────────────────────────────────────────
    pickup_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    pickup_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Date window the donor is available for pickup
    pickup_available_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    pickup_available_until: Mapped[date | None] = mapped_column(Date, nullable=True)

    status:Mapped[InKindStatus]=mapped_column(Enum(InKindStatus),default=InKindStatus.OFFERED,
    nullable=False,
    index=True,
    )


    # Notes from the org coordinator — visible to both parties
    coordinator_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Confirmed pickup date — set when org schedules collection
    confirmed_pickup_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    # Relationships
    donor: Mapped["User"] = relationship("User", foreign_keys=[donor_id])
    organization: Mapped["Organization"] = relationship("Organization")
    def __repr__(self) -> str:
        return f"<InKindDonation id={self.id} item={self.item_name} status={self.status}>"