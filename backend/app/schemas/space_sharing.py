import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator

from app.models.space_sharing import SpaceType, SpaceStatus, BookingStatus


# ─── Space Schemas ────────────────────────────────────────────────────────────

class SpaceCreate(BaseModel):
    """Payload to create a new space listing. Starts as DRAFT."""
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    address: Optional[str] = None
    city: str = Field(..., min_length=2, max_length=100)
    space_type: SpaceType = SpaceType.OTHER
    capacity: int = Field(..., gt=0)              # must be at least 1 person
    price_per_hour: Optional[Decimal] = Field(None, ge=0)  # 0 = free, None = not specified
    amenities: Optional[str] = None               # e.g. "wifi,projector,parking"


class SpaceStatusUpdate(BaseModel):
    """Host publishes (DRAFT→ACTIVE) or deactivates (ACTIVE→INACTIVE) their listing."""
    status: SpaceStatus


class SpaceRead(BaseModel):
    id: uuid.UUID
    host_id: uuid.UUID
    name: str
    description: Optional[str]
    address: Optional[str]
    city: str
    space_type: SpaceType
    capacity: int
    price_per_hour: Optional[Decimal]
    amenities: Optional[str]
    status: SpaceStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Booking Schemas ──────────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    """Requester submits a booking request for a space."""
    start_datetime: datetime
    end_datetime: datetime
    purpose: str = Field(..., min_length=10, max_length=500)
    attendee_count: int = Field(..., gt=0)

    # Validate end is after start — caught at schema level, before hitting DB
    @model_validator(mode="after")
    def end_must_be_after_start(self) -> "BookingCreate":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime")
        return self


class BookingStatusUpdate(BaseModel):
    """Host approves/rejects/completes. Requester can cancel."""
    status: BookingStatus
    host_notes: Optional[str] = Field(None, max_length=500)


class BookingRead(BaseModel):
    id: uuid.UUID
    space_id: uuid.UUID
    requester_id: uuid.UUID
    start_datetime: datetime
    end_datetime: datetime
    purpose: str
    attendee_count: int
    status: BookingStatus
    host_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
