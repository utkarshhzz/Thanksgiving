# Crowdfunding model


from email.policy import default
from sqlalchemy import false
import uuid
from datetime import datetime, date
from decimal import Decimal
from enum import Enum as PyEnum
from sqlalchemy import String, Text, DateTime, Date, Enum, ForeignKey, Numeric, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.base import Base

class CampaignStatus(str,PyEnum):
    DRAFT = "draft"          # Created but not yet public
    ACTIVE = "active"        # Live, accepting donations
    COMPLETED = "completed"  # Goal reached or end date passed
    CANCELLED = "cancelled"  # Cancelled by the organization
    ARCHIVED = "archived"    # Hidden from public

class CampaignCategory(str,PyEnum):
    EDUCATION = "education"
    HEALTH = "health"
    ENVIRONMENT = "environment"
    DISASTER_RELIEF = "disaster_relief"
    COMMUNITY = "community"
    ARTS = "arts"
    OTHER = "other"

class Campaign(Base):
    __tablename__="campaigns"

    id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True), primary_key=True,default=uuid.uuid4
    )

    # Campaigns will be owned by organisation
    organization_id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id",ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[CampaignCategory] = mapped_column(
        Enum(CampaignCategory),
        default=CampaignCategory.OTHER,
        nullable=False,
    )

    # money

    target_amount:Mapped[Decimal]=mapped_column(
        Numeric(12,2),nullable=False
    )
    raised_amount:Mapped[Decimal]=mapped_column(
        Numeric(12,2),nullable=False,default=0
    )

    currency_code:Mapped[str]=mapped_column(String(3),default="INR",nullable=False)

    start_date:Mapped[str]=mapped_column(Date,nullable=True)
    end_date:Mapped[str]=mapped_column(Date,nullable=True)

    status:Mapped[CampaignStatus]=mapped_column(
        Enum(CampaignStatus),
        default=CampaignStatus.DRAFT,
        nullable=False,
        index=True,
    )

    backer_count:Mapped[int]=mapped_column(Integer,default=0,nullable=False)
    is_flexible_funding:Mapped[bool]=mapped_column(Boolean,default=True,nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
        

    # relationship

    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="campaigns"
    )
    donations: Mapped[list["Donation"]] = relationship(
    "Donation", back_populates="campaign"
)
    def __repr__(self) -> str:
        return f"<Campaign id={self.id} title={self.title} status={self.status}>"