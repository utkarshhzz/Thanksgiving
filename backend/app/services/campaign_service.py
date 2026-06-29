import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException,status
from datetime import datetime,timezone,date
from decimal import Decimal
from sqlalchemy import func,select

from app.models.crowdfunding import CampaignStatus,CampaignCategory
from app.models.crowdfunding import Campaign,CampaignStatus
from app.models.organization import Organization
from app.models.user import User
from app.schemas.campaign import CampaignCreate, CampaignUpdate
from app.models.donation import Donation,TransactionStatus
from app.schemas.analytics import CampaignAnalytics,DonationBrief

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



# State machine transitions
# all valid transitions



VALID_TRANSITIONS:dict[CampaignStatus,set[CampaignStatus]]={
    CampaignStatus.DRAFT:{
        CampaignStatus.ACTIVE,
        CampaignStatus.CANCELLED,
    },
    CampaignStatus.ACTIVE: {
        CampaignStatus.COMPLETED,
        CampaignStatus.CANCELLED,
    },
    CampaignStatus.COMPLETED:{CampaignStatus.CANCELLED,},
    CampaignStatus.CANCELLED:{CampaignStatus.ARCHIVED,},
    CampaignStatus.ARCHIVED:set(), #terminal state no exit 
}

async def transition_campaign_status(
    db:AsyncSession,
    campaign_id:uuid.UUID,
    new_status:CampaignStatus,
    current_user:User,
) ->Campaign:

    """
    Move a capaign from curent status to new status
    according tio rules
    1. The transition must be in VALID_TRANSITIONS
    2. The requesting user must own the organization
    3. When publishing (DRAFT → ACTIVE), required fields must be present
    """

    campaign=await get_campaign_by_id(db,campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Ccmpaign not found")

    # checking ownership
    org=await db.get(Organization,campaign.organization_id)
    if org is None or org.owner_id !=current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You donot have permission to chasnge this campaigns's status"
        )

    allowed_next_states=VALID_TRANSITIONS.get(campaign.status,set())
    if new_status not in allowed_next_states:
        raise HTTPException(
            status_code=422,
            detail="Cannot transition as this transition is not allowed",
        )

    # ── Extra rules for specific transitions ─────────────────────────────────
    # Rule: Publishing requires complete information
    if new_status == CampaignStatus.ACTIVE:
        errors = []
        if not campaign.title or len(campaign.title.strip()) < 5:
            errors.append("title must be at least 5 characters")
        if not campaign.target_amount or campaign.target_amount <= 0:
            errors.append("target_amount must be greater than zero")
        if not campaign.end_date:
            errors.append("end_date is required before publishing")
        if campaign.end_date and campaign.end_date <= date.today():
            errors.append("end_date must be in the future")
        if errors:
            raise HTTPException(
                status_code=422,
                detail=f"Cannot publish campaign. Issues: {', '.join(errors)}",
            )


    # applying the new trasnsition
    campaign.status=new_status
    await db.flush()
    await db.refresh(campaign)
    return campaign

async def delete_campaign(
    db:AsyncSession,
    campaign_id:uuid.UUID,
    current_user:User,
)-> None:
    # Hard delete a campaign only allowed when in DRAFT state
    campaign=get_campaign_by_id(db,campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    org= await db.get(Organization,campaign.organization_id)
    if org is None or org.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")


    if campaign.status != CampaignStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only draft campaigns can be deleted",
        )
    await db.delete(campaign)
    await db.flush()


async def get_campaign_analytics(
    db:AsyncSession,
    campaign_id:uuid.UUID,
)-> CampaignAnalytics:
    """Compute analytics for a given campaign
    one query per metric
    """
    campaign=await get_campaign_by_id(db,campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404,detail="Campaign not found")

    agg_result=await db.execute(
        select(
            func.count(Donation.id).label("total_count"),
            func.sum(Donation.amount).label("total_sum"),
            func.avg(Donation.amount).label("avg_amount"),
            func.max(Donation.amount).label("max_amount"),
        ).where(
            Donation.campaign_id==campaign_id,
            Donation.transaction_status==TransactionStatus.COMPLETED,
        )
    )
    agg=agg_result.one()  #return a single tuple

    days_remaining=None
    if campaign.end_date:
        delta= campaign.end_date - date.today()
        days_remaining=delta.days

    if campaign.target_amount and campaign.target_amount>0:
        funding_pct=float(
            (campaign.raised_amount/campaign.target_amount)*100
        )
    else:
        funding_pct=0.0

    recent_result=await db.execute(
        select(Donation)
        .where(
            Donation.campaign_id==campaign_id,
            Donation.transaction_status==TransactionStatus.COMPLETED,
        )
        .order_by(Donation.created_at.desc())
        .limit(5)
    )
    recent_donations=recent_result.scalars().all()
    return CampaignAnalytics(
        campaign_id=campaign.id,
        title=campaign.title,
        status=campaign.status,
        target_amount=campaign.target_amount,
        raised_amount=campaign.raised_amount,
        funding_percentage=round(funding_pct, 2),
        average_donation=agg.avg_amount,
        largest_donation=agg.max_amount,
        backer_count=agg.total_count or 0,
        days_remaining=days_remaining,
        recent_donations=[DonationBrief.model_validate(d) for d in recent_donations],
    )

