import uuid
from typing import Optional
from fastapi import APIRouter,Depends,Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user,get_db
from app.models.user import User
from app.models.space_sharing import SpaceType
from app.schemas.space_sharing import (
    SpaceCreate, SpaceRead, SpaceStatusUpdate,
    BookingCreate, BookingRead, BookingStatusUpdate,
)
from app.services.space_service import (
    create_space, list_spaces, get_space, update_space_status,
    list_my_spaces, request_booking, handle_booking_status, list_my_bookings,
)


router=APIRouter(prefix="/spaces",tags=["Space Sharing"])

# Space endpoints
@router.post("",response_model=SpaceRead,status_code=201)
async def create_space_listing(
    data:SpaceCreate,
    db:AsyncSession=Depends(get_db),
    current_user: User=Depends(get_current_active_user),
):
    # Host creates a space lsiting started as DRAFT
    return await create_space(db,data,current_user)

@router.get("",response_model=list[SpaceRead])
async def browse_spaces(
    city:Optional[str]=Query(None,description="Filter by city name"),
    space_type: Optional[SpaceType] = Query(None, description="Filter by space type"),
    min_capacity: Optional[int] = Query(None, gt=0, description="Minimum people capacity"),
    db: AsyncSession = Depends(get_db),
):
    return await list_spaces(db,city,space_type,min_capacity)

@router.get("/mine", response_model=list[SpaceRead])
async def my_spaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Host sees all their own listings (any status, including drafts)."""
    return await list_my_spaces(db, current_user)
@router.get("/{space_id}", response_model=SpaceRead)
async def space_detail(
    space_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Public — get full details of any space by ID."""
    return await get_space(db, space_id)
@router.patch("/{space_id}/status", response_model=SpaceRead)
async def update_space_listing_status(
    space_id: uuid.UUID,
    data: SpaceStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Host publishes (DRAFT→ACTIVE) or deactivates (ACTIVE→INACTIVE) their space."""
    return await update_space_status(db, space_id, data, current_user)
# ─── Booking Endpoints ────────────────────────────────────────────────────────
@router.post("/{space_id}/book", response_model=BookingRead, status_code=201)
async def book_space(
    space_id: uuid.UUID,
    data: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Authenticated user requests to book a space."""
    return await request_booking(db, space_id, data, current_user)
@router.patch("/bookings/{booking_id}/status", response_model=BookingRead)
async def update_booking_status(
    booking_id: uuid.UUID,
    data: BookingStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Host approves/rejects/completes. Requester can cancel."""
    return await handle_booking_status(db, booking_id, data, current_user)
@router.get("/bookings/mine", response_model=list[BookingRead])
async def my_bookings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Requester sees all bookings they've made."""
    return await list_my_bookings(db, current_user)