import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_current_active_user
from app.models.crowdfunding import CampaignStatus
from app.models.user import User
from app.schemas.campaign import CampaignCreate,CampaignStatusUpdate, CampaignRead, CampaignUpdate
from app.services.campaign_service import (
    create_campaign,
    get_campaign_by_id,
    list_campaigns,
    update_campaign,
    transition_campaign_status,
    delete_campaign,
    get_campaign_analytics
)
from app.schemas.analytics import CampaignAnalytics

router=APIRouter(prefix="/campaigns",tags=["Campaigns"])

@router.get("".response_model=list[CampaignRead],summary="List all Campaigns")
async def get_campaigns(
    skip:int=Query(0,ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[CampaignStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    # Public endpoint no auth required
    # returns a paginated list of campaigns with optional stataus filter
    # Query parameters:
    # skip=0 and limit=20 brings first 20 campaigns and status=active brings only active campaigns
    return await list_campaigns(db,skip=skip,limit=limit,status=status)

@router.get("/{campaign_id}",response_model=CampaignRead,summary="Get Campaign by id")
async def get_campaign(
    campaign_id:uuid.UUID,
    db:AsyncSession=Depends(get_db)
):
    # returns one campaign by its uuid
    campaign=await get_campaign_by_id(db,campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404,detail="Campaign not found")

    return campaign

@router.post(
    "",
    response_model=CampaignRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Campaign",
)
async def create_new_campaign(
    campaign_data:CampaignCreate,
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user),
):
    # protected endpoint - requries authentication,
    # Creates a campaign in Draft status
    return await create_campaign(db,campaign_data,current_user)



@router.patch("/{campaign_id}", response_model=CampaignRead, summary="Update a campaign")
async def update_existing_campaign(
    campaign_id: uuid.UUID,
    update_data: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Protected endpoint — only the organization owner can update."""
    return await update_campaign(db, campaign_id, update_data, current_user)


@router.patch(
    "/{campaign_id}/status",
    response_model=CampaignRead,
    summary="Transition campaign to a new status",
)
async def change_campaign_status(
    campaign_id:uuid.UUID,
    status_data=CampaignStatusUpdate,
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user),
):
    """Move a campaign through its lifecycle.
    Valid trnsitions:
     - DRAFT → ACTIVE (publish — requires title, target_amount, end_date)
    - DRAFT → CANCELLED
    - ACTIVE → COMPLETED
    - ACTIVE → CANCELLED
    - COMPLETED → ARCHIVED
    - CANCELLED → ARCHIVED
    """

    return await transition_campaign_status(db,campaign_id,status_data.status,current_user)

    @router.delete(
        "/{campaign_id}",
        status_code=204,
        summary="Delete  a draft campaign",
    )
    async def remove_campaign(
        campaign_id:uuid.UUID,
        db:AsyncSession=Depends(get_db),
        current_user:User=Depends(get_current_active_user),
        
    ):

        """
        Hard delete. Only DRAFT campaigns can be deleted.
        Published campaigns must be CANCELLED instead.
        Returns 204 No Content on success (standard for DELETE).
        """
        await delete_campaign(db, campaign_id, current_user)


# Ading the analytics endpoint

@router.get(
    "/{campaign_id}/analytics",
    response_model=CampaignAnalytics,
    summary="Get analyticxs for a camaign",
)
async def campaign_analytics(
    campaign_id:uuid.UUID,
    db:AsyncSession=Depends(get_db),
):
    #public endpoint returns fundning progress,stats,no auth needed public campaign data
    return await get_campaign_analytics(db,campaign_id)


