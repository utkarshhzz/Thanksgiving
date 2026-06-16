import math as m
import uuid
from datetime import date
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.volunteering import VolunteerOpportunity, OpportunityStatus
from app.models.organization import Organization
from app.models.user import User
from app.schemas.opportunity import OpportunityCreate, OpportunityUpdate

# Valid state transitions for opportunities
VALID_OPP_TRANSITIONS:dict[OpportunityStatus,set[OpportunityStatus]]= {
    OpportunityStatus.DRAFT:{
        OpportunityStatus.ACTIVE,
        OpportunityStatus.CANCELLED,
    },
    OpportunityStatus.ACTIVE: {
        OpportunityStatus.CLOSED,
        OpportunityStatus.CANCELLED,
    },
    OpportunityStatus.CLOSED:set(),
    OpportunityStatus.CANCELLED:set(),
}

async def list_opportunities(
    db:AsyncSession,
    skip:int=0,
    limit:int=20,
    status:OpportunityStatus | None=None,
    location_type:str | None=None,
)-> list[VolunteerOpportunity]:
    query=select(VolunteerOpportunity)

    if status:
        query=query.where(VolunteerOpportunity.status==status)

    if location_type:
        query=query.where(VolunteerOpportunity.location_type==location_type)

    query=query.order_by(VolunteerOpportunity.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def get_opportunity_by_id(
    db:AsyncSession,
    opp_id:uuid.UUID
)-> VolunteerOpportunity | None:
    return await db.get(VolunteerOpportunity,opp_id)


async def create_opportunity(
    db:AsyncSession,
    data:OpportunityCreate,
    current_user:User,
) -> VolunteerOpportunity:
    org=await db.get(Organization,data.organization_id)
    if org is None:
        raise HTTPException(status_code=404,detail="Organization not found")
    if org.owner_id !=current_user.id:
        raise HTTPException(status_code=403,detail="Permission denied")

    opp=VolunteerOpportunity(
        organization_id=data.organization_id,
        title=data.title,
        description=data.description,
        required_skills=data.required_skills,
        location_type=data.location_type,
        location_address=data.location_address,
        city=data.city,
        commitment_hours_per_week=data.commitment_hours_per_week,
        commitment_weeks=data.commitment_weeks,
        start_date=data.start_date,
        end_date=data.end_date,
        available_slots=data.available_slots,
        urgency_level=data.urgency_level,
        status=OpportunityStatus.DRAFT,
    )
    db.add(opp)
    await db.flush()
    await db.refresh(opp)
    return opp


async def update_opportunity(
    db: AsyncSession,
    opp_id: uuid.UUID,
    data: OpportunityUpdate,
    current_user: User,
) -> VolunteerOpportunity:
    opp = await get_opportunity_by_id(db, opp_id)
    if opp is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    org = await db.get(Organization, opp.organization_id)
    if org.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    if opp.status != OpportunityStatus.DRAFT:
        raise HTTPException(
            status_code=422,
            detail="Only DRAFT opportunities can be edited. Use the status endpoint to manage lifecycle.",
        )
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(opp, field, value)
    await db.flush()
    await db.refresh(opp)
    return opp
    

async def transition_opportunity_status(
    db:AsyncSession,
    opp_id:uuid.UUID,
    new_status:OpportunityStatus,
    current_user:User,
) -> VolunteerOpportunity:
    opp=await get_opportunity_by_id(db,opp_id)
    if opp is None:
        raise HTTPException(status_code=404,detail="Opportunity not found")

    org=await db.get(Organization,opp.organization_id)
    if org is None:
        raise HTTPException(status_code=404,detail="Organization not found")
    
    if org.owner_id != current_user.id:
        raise HTTPException(status_code=403,detail="Permission denied")

    allowed=VALID_OPP_TRANSITIONS.get(opp.status,set())
    if new_status not in allowed:
        raise HTTPException(status_code=422,
        detail=(
                f"Cannot transition from '{opp.status.value}' to '{new_status.value}'. "
                f"Allowed: {[s.value for s in allowed]}"
            ),
        )
    if new_status == OpportunityStatus.ACTIVE:
        errors = []
        if not opp.title or len(opp.title.strip()) < 5:
            errors.append("title required")
        if opp.available_slots < 1:
            errors.append("must have at least 1 available slot")
        if errors:
            raise HTTPException(
                status_code=422,
                detail=f"Cannot publish: {', '.join(errors)}",
            )
    opp.status = new_status
    await db.flush()
    await db.refresh(opp)
    return opp
        
    
    


    