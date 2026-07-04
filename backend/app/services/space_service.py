import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.space_sharing import (
    Space, SpaceBooking, SpaceStatus, BookingStatus
)
from app.models.user import User
from app.schemas.space_sharing import (
    SpaceCreate, SpaceStatusUpdate, BookingCreate, BookingStatusUpdate
)

# ─── Valid booking status transitions and who can trigger each ────────────────
# Format: {current_status: {new_status: "who"}}
# "host"      = the space owner
# "requester" = the person who booked
# "both"      = either party
VALID_BOOKING_TRANSITIONS: dict[BookingStatus, dict[BookingStatus, str]] = {
    BookingStatus.PENDING: {
        BookingStatus.APPROVED:  "host",
        BookingStatus.REJECTED:  "host",
        BookingStatus.CANCELLED: "requester",
    },
    BookingStatus.APPROVED: {
        BookingStatus.COMPLETED: "host",
        BookingStatus.CANCELLED: "both",
    },
    BookingStatus.REJECTED:  {},   # Terminal — no further transitions
    BookingStatus.COMPLETED: {},   # Terminal
    BookingStatus.CANCELLED: {},   # Terminal
}

async def create_space(
    db:AsyncSession,
    data:SpaceCreate,
    current_user:User,
) -> Space:
    # Host creates a space listing,always starts as a draft
    space=Space(
        host_id=current_user.id,
        name=data.name,
        description=data.description,
        address=data.address,
        city=data.city,
        space_type=data.space_type,
        capacity=data.capacity,
        price_per_hour=data.price_per_hour,
        amenities=data.amenities,
        status=SpaceStatus.DRAFT,       # must be explicitly published
    )
    db.add(space)
    await db.flush()
    await db.refresh(space)
    return space

async def list_spaces(
    db: AsyncSession,
    city: str | None = None,
    space_type: str | None = None,
    min_capacity: int | None = None,
) -> list[Space]:
    """Public endpoint — anyone can browse active spaces. Supports filters."""
    query = select(Space).where(Space.status == SpaceStatus.ACTIVE)
    if city:
        # ilike = case-insensitive LIKE. Allows "mumbai", "Mumbai", "MUMBAI" to all match.
        query = query.where(Space.city.ilike(f"%{city}%"))
    if space_type:
        query = query.where(Space.space_type == space_type)
    if min_capacity:
        query = query.where(Space.capacity >= min_capacity)
    query = query.order_by(Space.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

async def get_space(db:AsyncSession,space_id:uuid.UUID)-> Space:
    space=await db.get(Space,space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return space

async def update_space_status(
    db:AsyncSession,
    space_id:uuid.UUID,
    data:SpaceStatusUpdate,
    current_user:User,
) ->Space:
    space=await db.get(Space,space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    if space.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can update this space")
    space.status=data.status
    await db.flush()
    await db.refresh(space)
    return space

async def list_my_spaces(
    db:AsyncSession,
    current_user:User,
)->list[Space]:
    result=await db.execute(select(Space).where(Space.host_id==current_user.id)
    .order_by(Space.created_at.desc()))
    return result.scalars().all()

async def request_booking(
    db:AsyncSession,
    space_id:uuid.UUID,
    data:BookingCreate,
    current_user:User,
) -> SpaceBooking:
    space=await db.get(Space,space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    if space.status != SpaceStatus.ACTIVE:
        raise HTTPException(
            status_code=422,
            detail="Cannot book a space that is not active"
        )
    if space.host_id == current_user.id:
        raise HTTPException(
            status_code=422,
            detail="You cannot book your own space"
        )
    if data.attendee_count > space.capacity:
         raise HTTPException(
            status_code=422,
            detail=f"Attendee count ({data.attendee_count}) exceeds space capacity ({space.capacity})"
        )
    booking=SpaceBooking(
        space_id=space_id,
        requester_id=current_user.id,
        start_datetime=data.start_datetime,
        end_datetime=data.end_datetime,
        purpose=data.purpose,
        attendee_count=data.attendee_count,
        status=BookingStatus.PENDING,
    )
    db.add(booking)
    await db.flush()
    await db.refresh(booking)
    return booking

async def handle_booking_status(
    db: AsyncSession,
    booking_id: uuid.UUID,
    data: BookingStatusUpdate,
    current_user: User,
) -> SpaceBooking:
    """Move a booking through its lifecycle. Validates who can make each transition."""
    booking = await db.get(SpaceBooking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    # Load the space to determine who the host is
    space = await db.get(Space, booking.space_id)
    is_host = space.host_id == current_user.id
    is_requester = booking.requester_id == current_user.id
    if not is_host and not is_requester:
        raise HTTPException(status_code=403, detail="Permission denied")
    allowed = VALID_BOOKING_TRANSITIONS.get(booking.status, {})
    if data.status not in allowed:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Cannot transition from '{booking.status.value}' to '{data.status.value}'. "
                f"Allowed transitions: {[s.value for s in allowed.keys()]}"
            ),
        )
    actor = allowed[data.status]
    if actor == "host" and not is_host:
        raise HTTPException(status_code=403, detail="Only the host can make this change")
    if actor == "requester" and not is_requester:
        raise HTTPException(status_code=403, detail="Only the requester can cancel")
    # actor == "both" → either is fine (already validated above)
    booking.status = data.status
    if data.host_notes:
        booking.host_notes = data.host_notes
    await db.flush()
    await db.refresh(booking)
    return booking
async def list_my_bookings(
    db: AsyncSession,
    current_user: User,
) -> list[SpaceBooking]:
    """Requester sees all bookings they've made."""
    result = await db.execute(
        select(SpaceBooking)
        .where(SpaceBooking.requester_id == current_user.id)
        .order_by(SpaceBooking.created_at.desc())
    )
    return result.scalars().all()



