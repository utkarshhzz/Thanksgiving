"""
app/models/donation.py
=======================
Donation model — records every financial contribution to a campaign.

For MVP we mock payments (no real Stripe yet).
TransactionStatus defaults to COMPLETED — simulating a successful payment.
In Phase 4, we'll integrate Stripe and use PENDING → COMPLETED/FAILED flow.

BUGS FIXED:
  - Removed 'from sqlalchemy import true' (junk import — never used)
  - Fixed donor_id type: Mapped[uuid.UUID] → Mapped[uuid.UUID | None]
    because ondelete="SET NULL" means the DB will set this to NULL if the user
    deletes their account. The Python type MUST allow None to match this.
    Mapped[uuid.UUID] says "never None" but the DB can make it None = mismatch.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import String, Text, Boolean, DateTime, Enum, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class TransactionStatus(str, PyEnum):
    PENDING = "pending"       # Payment initiated but not confirmed
    COMPLETED = "completed"   # Payment successful
    FAILED = "failed"         # Payment failed
    REFUNDED = "refunded"     # Payment was reversed


class Donation(Base):
    __tablename__ = "donations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # FIX: was Mapped[uuid.UUID] (non-nullable type) but ondelete="SET NULL"
    # means PostgreSQL WILL set this to NULL when the user deletes their account.
    # Python type must match: Mapped[uuid.UUID | None] allows None.
    donor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,   # nullable=True in DB to match SET NULL behaviour
        index=True,
    )

    # Always use Numeric for money — Float has rounding errors
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    # is_anonymous: donor chose to hide their name on the public campaign page
    # We still store donor_id for internal records (tax purposes)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    donor_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Payment tracking — mock transaction ID for MVP, real Stripe ID in Phase 4
    transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    transaction_status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus),
        default=TransactionStatus.COMPLETED,  # MVP: mock all as successful
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="donations")

    def __repr__(self) -> str:
        return f"<Donation id={self.id} amount={self.amount} campaign={self.campaign_id}>"