# volunteering oppurtunity and volunteering application

import uuid
from datetime import datetime,date
from decimal import Decimal
from enum import Enum as PyEnum
from sqlalchemy import (
    String, Text, Date, DateTime, Enum, ForeignKey,
    Numeric, Integer, Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.base import Base

class LocationType(str,PyEnum):
    REMOTE="remote"
    ONSITE="onsite"
    HYBRID="hybrid"

class UrgencyLevel(str,PyEnum):
    NORMAL="normal"
    HIGH="high"
    CRITICAL="critical"

class OpportunityStatus(str,PyEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"         # Filled or manually closed
    CANCELLED = "cancelled"

class VolunteerOpportunity(Base):
    __tablename__="volunteer_opportunities"

    id:Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title:Mapped[str]=mapped_column(String(255),nullable=False)
    description:Mapped[str | None]= mapped_column(Text,nullable=True)
    required_skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_type: Mapped[LocationType] = mapped_column(
        Enum(LocationType), default=LocationType.ONSITE, nullable=False
    )
    location_address:Mapped[str | None]=mapped_column(String(500),nullable=True)
    city:Mapped[str |None]=mapped_column(String(100),nullable=True)
    commitment_hours_per_week:Mapped[Decimal | None]=mapped_column(Numeric(5,2),nullable=True)

    start_date:Mapped[date | None]=mapped_column(Date,nullable=True)
    end_date:Mapped[date | None]=mapped_column(Date,nullable=True)

    # Slot tracking — how many volunteers are needed vs filled
    available_slots: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    filled_slots: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    urgency_level: Mapped[UrgencyLevel] = mapped_column(
        Enum(UrgencyLevel), default=UrgencyLevel.NORMAL, nullable=False
    )
    status: Mapped[OpportunityStatus] = mapped_column(
        Enum(OpportunityStatus), default=OpportunityStatus.DRAFT, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # relationships
    organization:Mapped["Organization"]=relationship("Organization")
    applications:Mapped[list["VolunteerApplication"]]= relationship(
        "VolunteerApplication", back_populates="opportunity"

    )

    def __repr__(self) -> str:
        return f"<VolunteerOpportunity id={self.id} title={self.title}>"

        