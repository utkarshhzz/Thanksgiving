import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.volunteering import LocationType, OpportunityStatus
from app.schemas.opportunity import (
    OpportunityCreate, OpportunityRead, OpportunityUpdate, OpportunityStatusUpdate
)
from app.services.opportunity_service import (
    list_opportunities, get_opportunity_by_id,
    create_opportunity, update_opportunity, transition_opportunity_status
)

router=APIRouter(prefix="/opportunities",tags=["Volunteering- Opportunities"])

@router.get("",response_model=list[OpportunityRead])
async def get_opportunities(
    skip:int=Query(0,ge=0),
    limit:int=Query(20,ge=1,le=100),
    status:Optional[OpportunityStatus]=Query(None),
    location_type:Optional[LocationType]= Query(None),
    db:AsyncSession=Depends(get_db)
):
    # public route
    return await list_opportunities(db,skip,limit,status,location_type)

@router.get("/{opportunity_id}", response_model=OpportunityRead)
async def get_opportunity(
    opportunity_id:uuid.UUID,
    db:AsyncSession=Depends(get_db),
):
    from fastapi import HTTPException
    opp=await get_opportunity_by_id(db,opportunity_id)
    if opp is None:
        raise HTTPException(status_code=404,detail="Opportunity not found")
    return opp

@router.post("",response_model=OpportunityRead,status_code=201)
async def create_new_opportunity(
    data:OpportunityCreate,
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user)
):
    # protected route -> organisation owner creates an oippurtunity
    return await create_opportunity(db,data,current_user)

@router.patch("/{opportunity_id}", response_model=OpportunityRead)
async def update_existing_opportunity(
    opportunity_id: uuid.UUID,
    data: OpportunityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await update_opportunity(db, opportunity_id, data, current_user)
@router.patch("/{opportunity_id}/status", response_model=OpportunityRead)
async def change_opportunity_status(
    opportunity_id: uuid.UUID,
    status_data: OpportunityStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await transition_opportunity_status(
        db, opportunity_id, status_data.status, current_user
    )



