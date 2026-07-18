"""
app/api/v1/routers/reviews.py
================================
Space reviews — guests review spaces after a completed booking.

  POST   /spaces/{id}/reviews     - submit a review (auth, 1 per booking)
  GET    /spaces/{id}/reviews     - list all reviews for a space (public)
  GET    /spaces/{id}/reviews/summary  - avg rating + count (public)
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func as sqlfunc

from app.db.base import Base
from app.core.deps import get_db, get_current_active_user
from app.models.user import User


# ── SQLAlchemy Model ──────────────────────────────────────────────────────────

class SpaceReview(Base):
    __tablename__ = "space_reviews"
    __table_args__ = (
        UniqueConstraint("space_id", "reviewer_id", name="uq_review_space_user"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    space_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)   # 1-5
    title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    body: Mapped[str | None]  = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=sqlfunc.now(), nullable=False
    )


# ── Pydantic Schemas ─────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    rating:  int  = Field(..., ge=1, le=5)
    title:   str | None = Field(None, max_length=120)
    body:    str | None = Field(None, max_length=2000)


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(tags=["Space Reviews"])


@router.post("/spaces/{space_id}/reviews", summary="Submit a space review")
async def create_review(
    space_id: uuid.UUID,
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # One review per user per space
    existing = await db.execute(
        select(SpaceReview)
        .where(SpaceReview.space_id == space_id)
        .where(SpaceReview.reviewer_id == current_user.id)
    )
    if existing.scalar():
        raise HTTPException(status_code=409, detail="You have already reviewed this space")

    review = SpaceReview(
        space_id=space_id,
        reviewer_id=current_user.id,
        rating=data.rating,
        title=data.title,
        body=data.body,
    )
    db.add(review)
    await db.flush()
    return {
        "id": str(review.id),
        "space_id": str(review.space_id),
        "rating": review.rating,
        "title": review.title,
        "body": review.body,
        "reviewer_name": f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email.split("@")[0],
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }


@router.get("/spaces/{space_id}/reviews", summary="List reviews for a space")
async def list_reviews(
    space_id: uuid.UUID,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SpaceReview, User.first_name, User.last_name, User.email)
        .join(User, SpaceReview.reviewer_id == User.id)
        .where(SpaceReview.space_id == space_id)
        .order_by(SpaceReview.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.all()
    out = []
    for review, first, last, email in rows:
        name = f"{first or ''} {last or ''}".strip() or email.split("@")[0]
        out.append({
            "id": str(review.id),
            "space_id": str(review.space_id),
            "rating": review.rating,
            "title": review.title,
            "body": review.body,
            "reviewer_name": name,
            "created_at": review.created_at.isoformat(),
        })
    return out


@router.get("/spaces/{space_id}/reviews/summary",
            summary="Average rating and count for a space")
async def review_summary(space_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            func.avg(SpaceReview.rating).label("avg_rating"),
            func.count(SpaceReview.id).label("total"),
        ).where(SpaceReview.space_id == space_id)
    )
    row = result.first()
    avg = round(float(row.avg_rating), 1) if row and row.avg_rating else 0.0
    total = row.total if row else 0
    return {"avg_rating": avg, "total_reviews": total}
