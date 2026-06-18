import uuid
from fastapi import APIRouter,Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db,get_current_active_user
from app.models.user import User
from app.schemas.impact import PlatformImpact, VolunteerImpactCard, OrganizationImpact
from app.services.impact_service import (
    get_platform_impact, get_volunteer_impact, get_organization_impact
)

router=APIRouter(prefix="/impact", tags=["Impact Reports"])

@router.get("/platform", response_model=PlatformImpact)
async def platform_impact(db:AsyncSession=Depends(get_db)):
    return await get_platform_impact

@router.get("/me", response_model=VolunteerImpactCard)
async def my_impact(
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user)
):
    return await get_volunteer_impact(db,current_user.id)

@router.get("/volunteers/{volunteer_id}", response_model=VolunteerImpactCard)
async def volunteer_impact(
    volunteer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Public — any volunteer's impact profile (for public profiles)."""
    return await get_volunteer_impact(db, volunteer_id)
@router.get("/organizations/{org_id}", response_model=OrganizationImpact)
async def organization_impact(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Public — an organization's total impact across all modules."""
    return await get_organization_impact(db, org_id)