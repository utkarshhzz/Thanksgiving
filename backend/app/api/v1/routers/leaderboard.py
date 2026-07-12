"""
app/api/v1/routers/leaderboard.py
===================================
Public leaderboard endpoints:
  GET /leaderboard/donors    - top 20 donors by total amount (all-time)
  GET /leaderboard/volunteers - top 20 volunteers by verified hours (all-time)
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import uuid

from app.core.deps import get_db
from app.models.donation import Donation, TransactionStatus
from app.models.volunteering import HourLog, VerificationStatus
from app.models.user import User

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


class DonorEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    display_name: str
    total_donated: float
    donation_count: int


class VolunteerEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    display_name: str
    total_hours: float
    log_count: int


@router.get("/donors", response_model=list[DonorEntry])
async def top_donors(db: AsyncSession = Depends(get_db)):
    """Top 20 donors by total amount donated (non-anonymous, completed donations)."""
    result = await db.execute(
        select(
            Donation.donor_id,
            func.sum(Donation.amount).label("total"),
            func.count(Donation.id).label("count"),
        )
        .where(
            Donation.transaction_status == TransactionStatus.COMPLETED,
            Donation.is_anonymous == False,
            Donation.donor_id.isnot(None),
        )
        .group_by(Donation.donor_id)
        .order_by(func.sum(Donation.amount).desc())
        .limit(20)
    )
    rows = result.all()

    entries = []
    for i, row in enumerate(rows, start=1):
        user = await db.get(User, row.donor_id)
        name = (user.full_name or user.email.split("@")[0]) if user else "Anonymous"
        entries.append(DonorEntry(
            rank=i,
            user_id=row.donor_id,
            display_name=name,
            total_donated=float(row.total),
            donation_count=row.count,
        ))
    return entries


@router.get("/volunteers", response_model=list[VolunteerEntry])
async def top_volunteers(db: AsyncSession = Depends(get_db)):
    """Top 20 volunteers by total verified hours."""
    result = await db.execute(
        select(
            HourLog.volunteer_id,
            func.sum(HourLog.hours_logged).label("total"),
            func.count(HourLog.id).label("count"),
        )
        .where(HourLog.verification_status == VerificationStatus.VERIFIED)
        .group_by(HourLog.volunteer_id)
        .order_by(func.sum(HourLog.hours_logged).desc())
        .limit(20)
    )
    rows = result.all()

    entries = []
    for i, row in enumerate(rows, start=1):
        user = await db.get(User, row.volunteer_id)
        name = (user.full_name or user.email.split("@")[0]) if user else "Volunteer"
        entries.append(VolunteerEntry(
            rank=i,
            user_id=row.volunteer_id,
            display_name=name,
            total_hours=float(row.total or 0),
            log_count=row.count,
        ))
    return entries
