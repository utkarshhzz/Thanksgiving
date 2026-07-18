"""
app/api/v1/routers/trending.py
=================================
Trending campaigns by donation velocity (raised_amount / days_since_start).
Also provides: ending-soon filter, featured/editor-picks endpoint.

  GET /campaigns/trending?limit=8    — sorted by velocity (no auth)
  GET /campaigns/ending-soon?limit=6 — active campaigns ending in ≤7 days
"""
import uuid
from datetime import datetime, date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models.crowdfunding import Campaign, CampaignStatus

router = APIRouter(tags=["Trending"])


def _campaign_to_dict(c: Campaign) -> dict:
    days_left = None
    if c.end_date:
        days_left = max(0, (c.end_date - date.today()).days)
    return {
        "id": str(c.id),
        "title": c.title,
        "description": c.description,
        "status": c.status,
        "category": c.category,
        "target_amount": float(c.target_amount),
        "raised_amount": float(c.raised_amount or 0),
        "image_url": getattr(c, "image_url", None),
        "end_date": c.end_date.isoformat() if c.end_date else None,
        "start_date": c.start_date.isoformat() if c.start_date else None,
        "days_left": days_left,
        "percent_funded": round(
            float(c.raised_amount or 0) / float(c.target_amount) * 100, 1
        ) if c.target_amount else 0,
    }


@router.get("/campaigns/trending", summary="Trending campaigns by donation velocity")
async def trending_campaigns(
    limit: int = 8,
    db: AsyncSession = Depends(get_db),
):
    """
    Velocity = raised_amount / MAX(days since start, 1)
    Returns active campaigns ordered by velocity descending.
    """
    today = date.today()

    # days_since_start as a SQL expression
    days_expr = func.greatest(
        func.extract("day", func.now() - Campaign.start_date).cast(type_=None),
        1,
    )
    velocity = (Campaign.raised_amount / days_expr).label("velocity")

    result = await db.execute(
        select(Campaign)
        .where(Campaign.status == CampaignStatus.ACTIVE)
        .where(Campaign.start_date.isnot(None))
        .where(Campaign.raised_amount > 0)
        .order_by(velocity.desc())
        .limit(limit)
    )
    campaigns = result.scalars().all()

    # If not enough trending, pad with most recent active
    if len(campaigns) < limit:
        existing_ids = {c.id for c in campaigns}
        result2 = await db.execute(
            select(Campaign)
            .where(Campaign.status == CampaignStatus.ACTIVE)
            .where(Campaign.id.notin_(existing_ids))
            .order_by(Campaign.raised_amount.desc())
            .limit(limit - len(campaigns))
        )
        campaigns = list(campaigns) + list(result2.scalars().all())

    return [_campaign_to_dict(c) for c in campaigns]


@router.get("/campaigns/ending-soon", summary="Active campaigns ending within 7 days")
async def ending_soon(
    days: int = 7,
    limit: int = 6,
    db: AsyncSession = Depends(get_db),
):
    cutoff = date.today() + timedelta(days=days)
    result = await db.execute(
        select(Campaign)
        .where(Campaign.status == CampaignStatus.ACTIVE)
        .where(Campaign.end_date.isnot(None))
        .where(Campaign.end_date <= cutoff)
        .where(Campaign.end_date >= date.today())
        .order_by(Campaign.end_date.asc())
        .limit(limit)
    )
    return [_campaign_to_dict(c) for c in result.scalars().all()]
