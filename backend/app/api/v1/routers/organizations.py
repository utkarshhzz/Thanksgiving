"""
app/api/v1/routers/organizations.py
=====================================
Organization management endpoints.

"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field, ConfigDict

from app.core.deps import get_db, get_current_active_user
from app.models.organization import Organization, OrgType, VerificationStatus
from app.models.user import User

router = APIRouter(prefix="/organizations", tags=["Organizations"])


class OrgCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    org_type: OrgType
    description: Optional[str] = None
    website_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    city: Optional[str] = None
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)


class OrgRead(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    org_type: OrgType
    description: Optional[str]
    website_url: Optional[str]
    contact_email: Optional[str]
    city: Optional[str]
    country_code: Optional[str]
    verification_status: VerificationStatus
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=OrgRead, status_code=201)
async def create_organization(
    data: OrgCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create an organization.
    The logged-in user automatically becomes the owner.
    Status starts as UNVERIFIED — admin manually verifies in Phase 4.
    """
    org = Organization(
        owner_id=current_user.id,
        name=data.name,
        org_type=data.org_type,
        description=data.description,
        website_url=data.website_url,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        city=data.city,
        country_code=data.country_code,
        verification_status=VerificationStatus.UNVERIFIED,
        is_active=True,
    )
    db.add(org)
    await db.flush()
    await db.refresh(org)
    return org


@router.get("/me", response_model=list[OrgRead])
async def my_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all organizations owned by the currently logged-in user."""
    result = await db.execute(
        select(Organization)
        .where(Organization.owner_id == current_user.id)
        .order_by(Organization.name)
    )
    return result.scalars().all()


@router.get("/{org_id}", response_model=OrgRead)
async def get_organization(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint — anyone can view an organization's profile.
    No auth required.
    """
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org
