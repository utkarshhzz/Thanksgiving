"""
app/api/v1/routers/notifications.py
=====================================
In-app notification system.
  POST /notifications/              - create (internal/system use)
  GET  /users/me/notifications      - list my notifications (newest first)
  PATCH /notifications/{id}/read    - mark one as read
  PATCH /notifications/read-all     - mark all as read
  DELETE /notifications/{id}        - delete one
"""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base
from app.core.deps import get_db, get_current_active_user
from app.models.user import User


# ── SQLAlchemy Model ──────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # icon: emoji or icon name for display
    icon: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="🔔")
    # link: optional deep-link URL (e.g., /campaigns/abc-123)
    link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# ── Pydantic Schemas ─────────────────────────────────────────────────────────

class NotificationCreate(BaseModel):
    user_id: uuid.UUID
    title: str
    body: Optional[str] = None
    icon: Optional[str] = "🔔"
    link: Optional[str] = None


class NotificationRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    body: Optional[str]
    icon: Optional[str]
    link: Optional[str]
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(tags=["Notifications"])


@router.get("/users/me/notifications", response_model=list[NotificationRead],
            summary="My notifications (newest first)")
async def list_my_notifications(
    limit: int = 30,
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    if unread_only:
        query = query.where(Notification.is_read == False)  # noqa: E712
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/users/me/notifications/unread-count",
            summary="Count of unread notifications")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(func.count()).select_from(Notification)
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read == False)  # noqa: E712
    )
    return {"unread": result.scalar() or 0}


@router.patch("/notifications/{notification_id}/read",
              summary="Mark one notification as read")
async def mark_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    notif = await db.get(Notification, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your notification")
    notif.is_read = True
    await db.flush()
    return {"ok": True}


@router.patch("/notifications/read-all", summary="Mark all notifications as read")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read == False)  # noqa: E712
        .values(is_read=True)
    )
    return {"ok": True}


@router.delete("/notifications/{notification_id}", summary="Delete a notification")
async def delete_notification(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    notif = await db.get(Notification, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your notification")
    await db.delete(notif)
    return {"ok": True}


# ── Helper: create a notification (called from other services) ────────────────

async def create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    body: Optional[str] = None,
    icon: str = "🔔",
    link: Optional[str] = None,
) -> Notification:
    """
    Internal helper — call this from donation_service, application_service etc.
    to push a notification to a user.
    """
    notif = Notification(
        user_id=user_id,
        title=title,
        body=body,
        icon=icon,
        link=link,
    )
    db.add(notif)
    await db.flush()
    return notif
