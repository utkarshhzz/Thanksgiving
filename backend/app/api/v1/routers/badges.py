"""
app/api/v1/routers/badges.py
=============================
Volunteer badge computation.

Badge tiers (cumulative verified hours):
  🌱 First Step      — 1+ hours
  🌿 Helper          — 10+ hours
  🌳 Contributor     — 50+ hours
  ⭐ Champion        — 100+ hours
  🏆 Legend          — 500+ hours

Also: Campaign supporter badge if user has donated to 3+ campaigns.
"""
import uuid
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.volunteering import HourLog, VerificationStatus
from app.models.donation import Donation, TransactionStatus

router = APIRouter(prefix="/users", tags=["Badges"])


HOUR_BADGES = [
    (500, "🏆", "Legend",       "500+ verified volunteer hours"),
    (100, "⭐", "Champion",     "100+ verified volunteer hours"),
    (50,  "🌳", "Contributor",  "50+ verified volunteer hours"),
    (10,  "🌿", "Helper",       "10+ verified volunteer hours"),
    (1,   "🌱", "First Step",   "Completed your first volunteer hour"),
]


class Badge(BaseModel):
    id: str
    emoji: str
    name: str
    description: str
    earned: bool


class BadgeSummary(BaseModel):
    total_hours: float
    campaign_count: int
    badges: list[Badge]


@router.get("/me/badges", response_model=BadgeSummary)
async def my_badges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return earned + locked badges for the current user."""
    # Total verified hours
    hours_result = await db.execute(
        select(func.sum(HourLog.hours_logged))
        .where(
            HourLog.volunteer_id == current_user.id,
            HourLog.verification_status == VerificationStatus.VERIFIED,
        )
    )
    total_hours = float(hours_result.scalar() or 0)

    # Distinct campaigns donated to
    camps_result = await db.execute(
        select(func.count(func.distinct(Donation.campaign_id)))
        .where(
            Donation.donor_id == current_user.id,
            Donation.transaction_status == TransactionStatus.COMPLETED,
        )
    )
    campaign_count = camps_result.scalar() or 0

    badges: list[Badge] = []
    for threshold, emoji, name, desc in HOUR_BADGES:
        badges.append(Badge(
            id=f"hours_{threshold}",
            emoji=emoji,
            name=name,
            description=desc,
            earned=total_hours >= threshold,
        ))

    # Supporter badge
    badges.append(Badge(
        id="supporter_3",
        emoji="💙",
        name="Supporter",
        description="Donated to 3+ different campaigns",
        earned=campaign_count >= 3,
    ))

    # Philanthropist badge
    badges.append(Badge(
        id="supporter_10",
        emoji="🎗️",
        name="Philanthropist",
        description="Donated to 10+ different campaigns",
        earned=campaign_count >= 10,
    ))

    return BadgeSummary(
        total_hours=total_hours,
        campaign_count=campaign_count,
        badges=badges,
    )


@router.get("/{user_id}/badges", response_model=BadgeSummary)
async def user_badges(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Public — view another user's earned badges."""
    hours_result = await db.execute(
        select(func.sum(HourLog.hours_logged))
        .where(
            HourLog.volunteer_id == user_id,
            HourLog.verification_status == VerificationStatus.VERIFIED,
        )
    )
    total_hours = float(hours_result.scalar() or 0)

    camps_result = await db.execute(
        select(func.count(func.distinct(Donation.campaign_id)))
        .where(
            Donation.donor_id == user_id,
            Donation.transaction_status == TransactionStatus.COMPLETED,
        )
    )
    campaign_count = camps_result.scalar() or 0

    badges = []
    for threshold, emoji, name, desc in HOUR_BADGES:
        badges.append(Badge(
            id=f"hours_{threshold}",
            emoji=emoji,
            name=name,
            description=desc,
            earned=total_hours >= threshold,
        ))
    badges.append(Badge(id="supporter_3", emoji="💙", name="Supporter",
                        description="Donated to 3+ campaigns", earned=campaign_count >= 3))
    badges.append(Badge(id="supporter_10", emoji="🎗️", name="Philanthropist",
                        description="Donated to 10+ campaigns", earned=campaign_count >= 10))

    return BadgeSummary(total_hours=total_hours, campaign_count=campaign_count, badges=badges)
