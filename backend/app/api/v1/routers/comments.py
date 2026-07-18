"""
app/api/v1/routers/comments.py
================================
Campaign comments/discussion system.
  POST /campaigns/{id}/comments     - post a comment (auth required)
  GET  /campaigns/{id}/comments     - list comments (public, paginated)
  DELETE /comments/{id}             - delete own comment
"""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func as sqlfunc

from app.db.base import Base
from app.core.deps import get_db, get_current_active_user
from app.models.user import User


# ── SQLAlchemy Model ──────────────────────────────────────────────────────────

class CampaignComment(Base):
    __tablename__ = "campaign_comments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=sqlfunc.now(), nullable=False
    )


# ── Pydantic Schemas ─────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class CommentOut(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str
    body: str
    is_pinned: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(tags=["Comments"])


@router.post("/campaigns/{campaign_id}/comments", response_model=CommentOut,
             summary="Post a comment on a campaign")
async def post_comment(
    campaign_id: uuid.UUID,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    comment = CampaignComment(
        campaign_id=campaign_id,
        author_id=current_user.id,
        body=data.body.strip(),
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment)
    return {
        **{c.key: getattr(comment, c.key) for c in comment.__table__.columns},
        "author_name": f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email.split("@")[0],
    }


@router.get("/campaigns/{campaign_id}/comments",
            summary="List campaign comments (newest first)")
async def list_comments(
    campaign_id: uuid.UUID,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    # Pinned first, then newest
    query = (
        select(CampaignComment, User.first_name, User.last_name, User.email)
        .join(User, CampaignComment.author_id == User.id)
        .where(CampaignComment.campaign_id == campaign_id)
        .order_by(CampaignComment.is_pinned.desc(), CampaignComment.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()
    out = []
    for comment, first, last, email in rows:
        name = f"{first or ''} {last or ''}".strip() or email.split("@")[0]
        out.append({
            "id": str(comment.id),
            "campaign_id": str(comment.campaign_id),
            "author_id": str(comment.author_id),
            "author_name": name,
            "body": comment.body,
            "is_pinned": comment.is_pinned,
            "created_at": comment.created_at.isoformat(),
        })
    return out


@router.get("/campaigns/{campaign_id}/comments/count",
            summary="Count of comments on a campaign")
async def comment_count(campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.count()).select_from(CampaignComment)
        .where(CampaignComment.campaign_id == campaign_id)
    )
    return {"count": result.scalar() or 0}


@router.delete("/comments/{comment_id}", summary="Delete own comment")
async def delete_comment(
    comment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    comment = await db.get(CampaignComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your comment")
    await db.delete(comment)
    return {"ok": True}
