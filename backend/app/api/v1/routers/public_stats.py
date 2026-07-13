"""
app/api/v1/routers/public_stats.py
====================================
Public (no-auth) platform statistics for the landing page.
Returns aggregate counts and totals anyone can see.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models.user import User
from app.models.crowdfunding import Campaign, CampaignStatus
from app.models.donation import Donation, TransactionStatus
from app.models.volunteering import VolunteerOpportunity, HourLog, VerificationStatus

router = APIRouter(prefix="/stats", tags=["Public Stats"])


@router.get("", summary="Public platform statistics for landing page")
async def public_stats(db: AsyncSession = Depends(get_db)):
    """
    Returns live aggregate counts shown on the landing page.
    No authentication required.
    """

    async def count(model):
        result = await db.execute(select(func.count()).select_from(model))
        return result.scalar() or 0

    # Total verified users
    total_users = await count(User)

    # Total raised from completed donations
    funds_result = await db.execute(
        select(func.sum(Donation.amount))
        .where(Donation.transaction_status == TransactionStatus.COMPLETED)
    )
    total_raised = float(funds_result.scalar() or 0)

    # Active campaigns
    active_camps = await db.execute(
        select(func.count()).select_from(Campaign)
        .where(Campaign.status == CampaignStatus.ACTIVE)
    )
    active_campaigns = active_camps.scalar() or 0

    # Total campaigns ever
    total_campaigns = await count(Campaign)

    # Total verified volunteer hours
    hours_result = await db.execute(
        select(func.sum(HourLog.hours_logged))
        .where(HourLog.verification_status == VerificationStatus.VERIFIED)
    )
    total_hours = float(hours_result.scalar() or 0)

    # Total opportunities
    total_opportunities = await count(VolunteerOpportunity)

    return {
        "total_donors_and_volunteers": total_users,
        "total_raised_inr": total_raised,
        "active_campaigns": active_campaigns,
        "total_campaigns": total_campaigns,
        "total_volunteer_hours": total_hours,
        "total_opportunities": total_opportunities,
    }
