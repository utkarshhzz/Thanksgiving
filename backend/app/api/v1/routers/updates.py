"""
app/api/v1/routers/updates.py
=================================
Campaign Updates — organisations post progress updates on their campaigns.
Donors/public can read them.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, Column, Text, ForeignKey, DateTime, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from app.core.deps import get_db, get_current_active_user
from app.models.crowdfunding import Campaign
from app.models.organization import Organization
from app.models.user import User
from app.db.base import Base


# ── Inline model (small feature — no need for a separate file) ───────────────
class CampaignUpdate(Base):
    __tablename__ = "campaign_updates"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(PGUUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id   = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title       = Column(String(255), nullable=False)
    body        = Column(Text, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ── Schemas ───────────────────────────────────────────────────────────────────
class UpdateCreate(BaseModel):
    title: str
    body: str

class UpdateRead(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    author_id: Optional[uuid.UUID]
    title: str
    body: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Router ────────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/campaigns", tags=["Campaign Updates"])


@router.post("/{campaign_id}/updates", response_model=UpdateRead, status_code=201)
async def post_campaign_update(
    campaign_id: uuid.UUID,
    data: UpdateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Org owner posts a progress update on their campaign."""
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    org = await db.get(Organization, campaign.organization_id)
    if not org or org.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the campaign owner can post updates")

    update = CampaignUpdate(
        campaign_id=campaign_id,
        author_id=current_user.id,
        title=data.title.strip(),
        body=data.body.strip(),
    )
    db.add(update)
    await db.flush()
    await db.refresh(update)
    return update


@router.get("/{campaign_id}/updates", response_model=list[UpdateRead])
async def get_campaign_updates(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Public — list all updates for a campaign, newest first."""
    result = await db.execute(
        select(CampaignUpdate)
        .where(CampaignUpdate.campaign_id == campaign_id)
        .order_by(CampaignUpdate.created_at.desc())
    )
    return result.scalars().all()
