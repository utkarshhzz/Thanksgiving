# Organization model represents ngo's non profits and community groups that run campaigns,
# post volunteering opurtunities,etc

import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import String,Text,Boolean,DateTime,Enum,ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped,mapped_column,relationship
from sqlalchemy.sql import func

from app.db.base import Base

class OrgType(str,PyEnum):
    NGO="ngo"
    NONPROFIT="nonprofit"
    COMMUNITY = "community"
    SOCIAL_ENTERPRISE = "social_enterprise"
    EDUCATIONAL = "educational"


class VerificationStatus(str,PyEnum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"

class Organization(Base):
    __tablename__="organizations"

    id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True),primary_key=True,default=uuid.uuid4
    )
    owner_id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id",ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    org_type: Mapped[OrgType] = mapped_column(Enum(OrgType), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Location

    city: Mapped[str | None]= mapped_column(String(100),nullable=True)
    country_code:Mapped[str | None]=mapped_column(String(2),nullable=True)

    verification_status:Mapped[VerificationStatus]=mapped_column(
        Enum(VerificationStatus),
        default=VerificationStatus.UNVERIFIED,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    campaigns: Mapped[list["Campaign"]]=relationship(
        "Campaign",back_popultes="organiztion")

    
    def __repr__(self) -> str:
        return f"<Organization id={self.id} name={self.name}>"