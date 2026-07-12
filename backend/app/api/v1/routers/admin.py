"""
Admin-only endpoints — system overview, user management, platform stats.
Only accessible to users with user_type = ADMIN.
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_active_user
from app.models.user import User, UserType
from app.models.crowdfunding import Campaign, CampaignStatus
from app.models.donation import Donation
from app.models.volunteering import VolunteerOpportunity, VolunteerApplication
from app.models.in_kind import InKindDonation
from app.schemas.user import UserRead


router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Guard: must be ADMIN ──────────────────────────────────────────────────────
async def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.user_type != UserType.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


# ── Platform Stats ────────────────────────────────────────────────────────────
@router.get("/stats", summary="Platform-wide statistics")
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Real-time platform stats for the admin dashboard."""

    async def count(model):
        result = await db.execute(select(func.count()).select_from(model))
        return result.scalar()

    total_users        = await count(User)
    total_campaigns    = await count(Campaign)
    total_donations    = await count(Donation)
    total_opportunities = await count(VolunteerOpportunity)
    total_applications = await count(VolunteerApplication)
    total_inkind       = await count(InKindDonation)

    # Total funds raised
    funds_result = await db.execute(select(func.sum(Donation.amount)))
    total_raised = float(funds_result.scalar() or 0)

    # Active campaigns
    active_camps = await db.execute(
        select(func.count()).select_from(Campaign).where(Campaign.status == CampaignStatus.ACTIVE)
    )
    active_campaigns = active_camps.scalar()

    # New users in last 7 days
    week_ago = datetime.utcnow() - timedelta(days=7)
    new_users_result = await db.execute(
        select(func.count()).select_from(User).where(User.created_at >= week_ago)
    )
    new_users_7d = new_users_result.scalar()

    return {
        "users": {
            "total": total_users,
            "new_last_7_days": new_users_7d,
        },
        "campaigns": {
            "total": total_campaigns,
            "active": active_campaigns,
        },
        "donations": {
            "total_transactions": total_donations,
            "total_raised_inr": total_raised,
        },
        "volunteering": {
            "opportunities": total_opportunities,
            "applications": total_applications,
        },
        "inkind": {
            "offers": total_inkind,
        },
    }


# ── User Management ───────────────────────────────────────────────────────────
@router.get("/users", response_model=list[UserRead], summary="List all users")
async def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user_type: Optional[UserType] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(User).order_by(desc(User.created_at)).offset(skip).limit(limit)
    if user_type:
        query = query.where(User.user_type == user_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/users/{user_id}/deactivate", summary="Deactivate a user account")
async def deactivate_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user.is_active = False
    await db.flush()
    return {"message": f"User {user.email} deactivated."}


@router.patch("/users/{user_id}/activate", summary="Reactivate a user account")
async def activate_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    await db.flush()
    return {"message": f"User {user.email} activated."}


@router.patch("/users/{user_id}/make-admin", summary="Promote a user to admin")
async def make_admin(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.user_type = UserType.ADMIN
    await db.flush()
    return {"message": f"{user.email} is now an admin."}


# ── Recent Campaigns ──────────────────────────────────────────────────────────
@router.get("/campaigns/recent", summary="Recent campaigns (all statuses)")
async def recent_campaigns(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Campaign).order_by(desc(Campaign.created_at)).limit(limit)
    )
    campaigns = result.scalars().all()
    return [
        {
            "id":         str(c.id),
            "title":      c.title,
            "status":     c.status,
            "goal":       float(c.target_amount or 0),
            "raised":     float(c.raised_amount or 0),
            "created_at": c.created_at.isoformat(),
        }
        for c in campaigns
    ]


# ── Recent Donations ──────────────────────────────────────────────────────────
@router.get("/donations/recent", summary="Recent donations")
async def recent_donations(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Donation).order_by(desc(Donation.created_at)).limit(limit)
    )
    donations = result.scalars().all()
    return [
        {
            "id":          str(d.id),
            "amount":      float(d.amount),
            "campaign_id": str(d.campaign_id),
            "donor_id":    str(d.donor_id) if d.donor_id else None,
            "created_at":  d.created_at.isoformat(),
        }
        for d in donations
    ]


# ── Admin Campaign Moderation ─────────────────────────────────────────────────
from pydantic import BaseModel

class AdminCampaignStatusUpdate(BaseModel):
    status: CampaignStatus
    note: str = ""

@router.patch("/campaigns/{campaign_id}/status", summary="Admin: approve or reject a campaign")
async def admin_update_campaign_status(
    campaign_id: uuid.UUID,
    data: AdminCampaignStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin can force any campaign into any status (approve/reject/archive)."""
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = data.status
    await db.flush()
    await db.refresh(campaign)
    return {
        "campaign_id": str(campaign.id),
        "new_status": campaign.status.value,
        "note": data.note,
        "updated_by": str(admin.id),
    }


@router.get("/campaigns", summary="Admin: list all campaigns with pagination")
async def admin_list_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    status: Optional[CampaignStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(Campaign).order_by(desc(Campaign.created_at))
    if status:
        query = query.where(Campaign.status == status)
    result = await db.execute(query.offset(skip).limit(limit))
    campaigns = result.scalars().all()
    return [
        {
            "id":             str(c.id),
            "title":          c.title,
            "status":         c.status.value,
            "raised_amount":  float(c.raised_amount or 0),
            "target_amount":  float(c.target_amount or 0),
            "created_at":     c.created_at.isoformat(),
        }
        for c in campaigns
    ]
