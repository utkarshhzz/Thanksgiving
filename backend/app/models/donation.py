#app/models/donation.property
# Donation model — records every financial contribution to a campaign.
# currenty phase 3 so using mock payments 

from sqlalchemy import true
import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import String, Text, Boolean, DateTime, Enum, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.base import Base

class TransactionStatus(str,PyEnum):
    PENDING = "pending"       # Payment initiated but not confirmed
    COMPLETED = "completed"   # Payment successful
    FAILED = "failed"         # Payment failed
    REFUNDED = "refunded"    #Payemnt was reversed

class Donation(Base):
    __tablename__= "donations"

    id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True),primary_key=True,default=uuid.uuid4
    )

    campaign_id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    donor_id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id",ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    amount: Mapped[Decimal]=mapped_column(Numeric(12,2),nullable=False)
    currency_code:Mapped[str]=mapped_column(String(3),default="USD",nullable=False)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Optional message from donor shown on the campaign page
    donor_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    transaction_status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus),
        default=TransactionStatus.COMPLETED,  # MVP: mock all payments as successful
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

    