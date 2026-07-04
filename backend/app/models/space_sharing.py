import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum
from sqlalchemy import (
    String, Text, DateTime, Enum,
    ForeignKey, Numeric, Integer, Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

class SpaceType(str,PyEnum):
    MEETING_ROOM      = "meeting_room"
    EVENT_HALL        = "event_hall"
    WAREHOUSE         = "warehouse"
    KITCHEN           = "kitchen"
    OUTDOOR           = "outdoor"
    OFFICE            = "office"
    COMMUNITY_CENTER  = "community_center"
    OTHER             = "other"

class SpaceStatus(str, PyEnum):
    DRAFT    = "draft"     # Created but not yet visible to public
    ACTIVE   = "active"    # Listed and accepting bookings
    INACTIVE = "inactive"  # Temporarily not accepting bookings
class BookingStatus(str, PyEnum):
    PENDING   = "pending"    # Requester submitted, waiting for host
    APPROVED  = "approved"   # Host confirmed the booking
    REJECTED  = "rejected"   # Host declined
    COMPLETED = "completed"  # Space was used, booking closed
    CANCELLED = "cancelled"  # Either party cancelled before use

class Space(Base):
    __tablename__="spaces"

    id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True),primary_key=True,default=uuid.uuid4
    )
    host_id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id",ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    space_type: Mapped[SpaceType] = mapped_column(
        Enum(SpaceType), nullable=False, default=SpaceType.OTHER, index=True
    )
    # Maximum number of people the space can hold
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Price per hour in INR. NULL = free (nonprofits often list for free)
    price_per_hour: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    # Comma-separated list e.g. "wifi,projector,whiteboard,parking"
    amenities: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[SpaceStatus] = mapped_column(
        Enum(SpaceStatus), nullable=False, default=SpaceStatus.DRAFT, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    host: Mapped["User"] = relationship("User", foreign_keys=[host_id])
    bookings: Mapped[list["SpaceBooking"]] = relationship(
        "SpaceBooking", back_populates="space", cascade="all, delete-orphan"
    )
    def __repr__(self) -> str:
        return f"<Space id={self.id} name={self.name} city={self.city}>"


class SpaceBooking(Base):
    __tablename__="space_bookings"
    id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True),primary_key=True,default=uuid.uuid4
    )
    space_id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id",ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # person requesting the space
    requester_id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id",ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # ISO datetime — full timestamp so partial-day bookings work
    start_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    end_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    purpose: Mapped[str] = mapped_column(String(500), nullable=False)
    attendee_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus), nullable=False, default=BookingStatus.PENDING, index=True
    )
    host_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    space: Mapped["Space"] = relationship("Space", back_populates="bookings")
    requester: Mapped["User"] = relationship("User", foreign_keys=[requester_id])
    def __repr__(self) -> str:
        return f"<SpaceBooking id={self.id} space={self.space_id} status={self.status}>"