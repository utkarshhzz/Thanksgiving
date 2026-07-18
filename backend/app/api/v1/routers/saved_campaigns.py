"""
app/api/v1/routers/saved_campaigns.py
========================================
Saved / Wishlist campaigns.
  POST   /campaigns/{id}/save   - save a campaign
  DELETE /campaigns/{id}/save   - unsave
  GET    /users/me/saved         - list all saved campaigns
"""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func as sqlfunc

from app.db.base import Base
from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.crowdfunding import Campaign


# ── SQLAlchemy Model ──────────────────────────────────────────────────────────

class SavedCampaign(Base):
    __tablename__ = "saved_campaigns"
    __table_args__ = (
        UniqueConstraint("user_id", "campaign_id", name="uq_saved_user_campaign"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=sqlfunc.now(), nullable=False
    )


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(tags=["Saved Campaigns"])


@router.post("/campaigns/{campaign_id}/save", summary="Save a campaign to wishlist")
async def save_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Check if already saved
    existing = await db.execute(
        select(SavedCampaign)
        .where(SavedCampaign.user_id == current_user.id)
        .where(SavedCampaign.campaign_id == campaign_id)
    )
    if existing.scalar():
        raise HTTPException(status_code=409, detail="Already saved")
    record = SavedCampaign(user_id=current_user.id, campaign_id=campaign_id)
    db.add(record)
    return {"ok": True, "saved": True}


@router.delete("/campaigns/{campaign_id}/save", summary="Remove campaign from wishlist")
async def unsave_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(SavedCampaign)
        .where(SavedCampaign.user_id == current_user.id)
        .where(SavedCampaign.campaign_id == campaign_id)
    )
    record = result.scalar()
    if not record:
        raise HTTPException(status_code=404, detail="Not saved")
    await db.delete(record)
    return {"ok": True, "saved": False}


@router.get("/users/me/saved", summary="List user's saved campaigns")
async def list_saved(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Campaign)
        .join(SavedCampaign, SavedCampaign.campaign_id == Campaign.id)
        .where(SavedCampaign.user_id == current_user.id)
        .order_by(SavedCampaign.saved_at.desc())
    )
    campaigns = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "title": c.title,
            "description": c.description,
            "status": c.status,
            "target_amount": float(c.target_amount),
            "raised_amount": float(c.raised_amount or 0),
            "image_url": c.image_url if hasattr(c, "image_url") else None,
            "end_date": c.end_date.isoformat() if c.end_date else None,
            "category": c.category,
        }
        for c in campaigns
    ]


@router.get("/campaigns/{campaign_id}/save/status",
            summary="Check if current user has saved this campaign")
async def save_status(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(func.count()).select_from(SavedCampaign)
        .where(SavedCampaign.user_id == current_user.id)
        .where(SavedCampaign.campaign_id == campaign_id)
    )
    return {"saved": (result.scalar() or 0) > 0}
