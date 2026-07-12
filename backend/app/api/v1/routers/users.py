# Standalone user-centric donation endpoints
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.donation import Donation  # Donation is in donation.py, not crowdfunding.py
from app.schemas.donation import DonationRead
from app.services.upload_service import upload_image
from app.schemas.user import UserUpdate, UserRead


router_me = APIRouter(prefix="/users", tags=["User Donations"])



@router_me.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload or replace the current user's profile picture."""
    image_url = await upload_image(
        file=file,
        folder="avatars",
        public_id=str(current_user.id),   # same UUID = overwrites old photo
    )
    current_user.avatar_url = image_url
    await db.flush()
    return {"avatar_url": image_url}



@router_me.patch("/me", response_model=UserRead, summary="Update your profile")
async def update_me(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update first_name, last_name, phone, bio."""
    update_data = data.model_dump(exclude_unset=True)  # only fields the user sent
    for field, value in update_data.items():
        setattr(current_user, field, value)
    await db.flush()
    await db.refresh(current_user)
    return current_user

    
@router_me.get("/me/donations", response_model=list[DonationRead], summary="List all my donations")
async def my_donations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Returns all donations made by the currently authenticated user, newest first."""
    result = await db.execute(
        select(Donation)
        .where(Donation.donor_id == current_user.id)
        .order_by(desc(Donation.created_at))
    )
    return result.scalars().all()
