"""
app/api/v1/routers/org_follow.py
====================================
Organization following system.
  POST   /organizations/{id}/follow   - follow an org
  DELETE /organizations/{id}/follow   - unfollow
  GET    /organizations/{id}/followers/count - follower count
  GET    /users/me/following  - orgs I follow
  GET    /users/me/feed       - campaigns from orgs I follow
"""
import uuid
from datetime import datetime

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
from app.models.crowdfunding import Campaign, CampaignStatus


# ── SQLAlchemy Model ──────────────────────────────────────────────────────────

class OrgFollow(Base):
    __tablename__ = "org_follows"
    __table_args__ = (
        UniqueConstraint("user_id", "org_id", name="uq_org_follow_user_org"),
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
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    followed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=sqlfunc.now(), nullable=False
    )


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(tags=["Org Following"])


@router.post("/organizations/{org_id}/follow", summary="Follow an organization")
async def follow_org(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    existing = await db.execute(
        select(OrgFollow)
        .where(OrgFollow.user_id == current_user.id)
        .where(OrgFollow.org_id == org_id)
    )
    if existing.scalar():
        raise HTTPException(status_code=409, detail="Already following")
    follow = OrgFollow(user_id=current_user.id, org_id=org_id)
    db.add(follow)
    return {"ok": True, "following": True}


@router.delete("/organizations/{org_id}/follow", summary="Unfollow an organization")
async def unfollow_org(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(OrgFollow)
        .where(OrgFollow.user_id == current_user.id)
        .where(OrgFollow.org_id == org_id)
    )
    record = result.scalar()
    if not record:
        raise HTTPException(status_code=404, detail="Not following")
    await db.delete(record)
    return {"ok": True, "following": False}


@router.get("/organizations/{org_id}/follow/status",
            summary="Check if I follow this org")
async def follow_status(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(func.count()).select_from(OrgFollow)
        .where(OrgFollow.user_id == current_user.id)
        .where(OrgFollow.org_id == org_id)
    )
    return {"following": (result.scalar() or 0) > 0}


@router.get("/organizations/{org_id}/followers/count",
            summary="How many followers does this org have")
async def follower_count(org_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.count()).select_from(OrgFollow)
        .where(OrgFollow.org_id == org_id)
    )
    return {"count": result.scalar() or 0}


@router.get("/users/me/following", summary="List orgs I follow")
async def my_following(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(OrgFollow).where(OrgFollow.user_id == current_user.id)
        .order_by(OrgFollow.followed_at.desc())
    )
    follows = result.scalars().all()
    return [{"org_id": str(f.org_id), "followed_at": f.followed_at.isoformat()} for f in follows]


@router.get("/users/me/feed", summary="Campaign feed from orgs I follow")
async def my_feed(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Returns active campaigns from organizations the user follows, newest first."""
    # Get followed org IDs
    follows_result = await db.execute(
        select(OrgFollow.org_id).where(OrgFollow.user_id == current_user.id)
    )
    org_ids = [r for r in follows_result.scalars().all()]

    if not org_ids:
        return []

    result = await db.execute(
        select(Campaign)
        .where(Campaign.organization_id.in_(org_ids))
        .where(Campaign.status == CampaignStatus.ACTIVE)
        .order_by(Campaign.start_date.desc())
        .offset(skip)
        .limit(limit)
    )
    campaigns = result.scalars().all()
    from datetime import date
    return [
        {
            "id": str(c.id),
            "title": c.title,
            "description": c.description,
            "status": c.status,
            "category": c.category,
            "target_amount": float(c.target_amount),
            "raised_amount": float(c.raised_amount or 0),
            "image_url": getattr(c, "image_url", None),
            "end_date": c.end_date.isoformat() if c.end_date else None,
            "days_left": max(0, (c.end_date - date.today()).days) if c.end_date else None,
            "organization_id": str(c.organization_id),
        }
        for c in campaigns
    ]
