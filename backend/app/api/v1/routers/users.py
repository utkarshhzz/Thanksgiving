# Standalone user-centric donation endpoints
from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.donation import Donation  # Donation is in donation.py, not crowdfunding.py
from app.schemas.donation import DonationRead

router_me = APIRouter(prefix="/users", tags=["User Donations"])


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
