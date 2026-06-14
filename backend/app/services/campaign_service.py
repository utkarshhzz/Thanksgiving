import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException,status

from app.models.crowdfunding import Campaign,CampaignStatus
from app.models.organization import Organization
from app.models.user import User
from app.schemas.campaign import CampaignCreate, CampaignUpdate

async def get_campaign_by_id(db:AsyncSession,cmpaign_id:uuid.UUID)-> Campaign | None:
    #Fetch asingle campaign by its UUID
    return await db.get(Campaign,campaign_id)

async def list_campaigns(
    db:AsyncSession,
    skip:int=0,
    limit:int=20,
    status:CampaignStatus | None=None,
)-> list[Campaign]:
    # list campaigns with optional status filter and pagination
    # skip/limit implemet cursor based pagination
    query=select(Campaign)
    if status is not None:
        query=query.where(Campaign.status==status)

    query=query.offset(skip).limit(limit).order_by(Campaign.created_at.desc())

    result= await db.execute(query)
    return result.scalars().all()

async def create_campaign(
    db:AsyncSession,
    campaign_data:CampaignCreate,
    current_user:User,
)-> Campaign:
    # Create a new campaign draft
    # Business rules :
    # organisaation must exist
    # current user must own that organisation
    # Campaigns always start  iin draft status not directly public 
    org=await db.get(Organization,campaign_data.organization_id)

    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    if org.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create campaign for this organization",
        )


    campaign=Campaign(
        organization_id=campaign_data.organization_id,
        title=campaign_data.title,
        description=campaign_data.description,
        category=campaign_data.category,
        target_amount=campaign_data.target_amount,
        currency_code=campaign_data.currency_code,
        start_date=campaign_data.start_date,
        end_date=campaign_data.end_date,
        is_flexible_funding=campaign_data.is_flexible_funding,
        status=CampaignStatus.ACTIVE,
    )

    db.add(campaign)
    await db.flush()
    await db.refresh(campaign)
    return campaign

async def update_campaign(
    db:AsyncSession,
    Campaign_id:uuid.UUID,
    update_data:CampaignUpdate,
    current_user:User,
)-> Campaign:
    # Upate the cmpign onlly the organisation owneer cn upte it
    campaign= await get_campaign_by_id(db,campaign_id)

    if campaign is None:
        raise HTTPException(status_code=404,detail="Campaign not found")

    org=await db.get(Organization,campaign.organization_id)
    if org.owner_id !=current_user.id:
        raise HTTPException(status_code=403,detail="Not authorized to update this campaign")
    
    # model_dump(exclude_unset=True) returns only fields the client actually sent
    # This prevents overwriting fields with None when they weren't included
    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(campaign, field, value)
    await db.flush()
    await db.refresh(campaign)
    return campaign



# 