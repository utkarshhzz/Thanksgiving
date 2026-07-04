# Endpoints for inkind donations 
import uuid
from typing import Optional
from fastapi import APIRouter,Depends,Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db,get_current_active_user
from app.models.in_kind import InKindStatus
from app.models.user import User
from app.schemas.in_kind import InKindCreate, InKindRead, InKindStatusUpdate
from app.services.in_kind_service import (
    offer_donation, update_donation_status,
    list_my_donations, list_org_donations,
)

router=APIRouter(prefix="/in-kind", tags=["In-Kind Donations"])

@router.post("",response_model=InKindRead,status_code=201)
async def create_donation_offer(
    data:InKindCreate,
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user),
):
    return await offer_donation(db,data,current_user)

@router.patch("/{donation_id}/status", response_model=InKindRead)
async def change_donation_status(
    donation_id:uuid.UUID,
    data:InKindStatusUpdate,
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user),
):
    return await update_donation_status(db,current_user,donation_id,data)

@router.get("/me", response_model=list[InKindRead])
async def my_donations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Donor views all items they've offered."""
    return await list_my_donations(db, current_user)
@router.get("/organizations/{org_id}", response_model=list[InKindRead])
async def org_received_donations(
    org_id: uuid.UUID,
    status: Optional[InKindStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Org coordinator views all donations offered to their organization."""
    return await list_org_donations(db, org_id, current_user, status)