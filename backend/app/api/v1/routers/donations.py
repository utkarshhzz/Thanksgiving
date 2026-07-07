# endpoint for donations
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.donation import Donation  # Donation is in donation.py, not crowdfunding.py
from app.schemas.donation import DonationCreate, DonationRead, DonationSummary
from app.services.donation_service import create_donation, get_campaign_donations

# ── Per-campaign donations ──────────────────────────────────────────────────
router = APIRouter(
    prefix="/campaigns/{campaign_id}/donations",
    tags=["Donations"],
)


@router.post(
    "",
    response_model=DonationRead,
    status_code=201,
    summary="Donate to a campaign",
)
async def donate_to_campaign(
    campaign_id:uuid.UUID,
    donation_data:DonationCreate,
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user),
):

    return await create_donation(db,campaign_id,donation_data,current_user)


@router.get(
    "",
    response_model=list[DonationSummary],
    summary="List donations for a campaign",
)
async def list_donations(
    campaign_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint — no auth required.
    Returns completed donations, newest first.
    Anonymous donor identities are hidden automatically by the schema.
    """
    donations = await get_campaign_donations(db, campaign_id, skip=skip, limit=limit)
    result = []
    for donation in donations:
        summary = DonationSummary.model_validate(donation)
        result.append(summary)
    return result