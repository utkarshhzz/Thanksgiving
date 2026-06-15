# business logic for donation flow
# can only donate to active campaigns
# amount must be positive
# after donation,update campaigns raised amt and bacer count
# both writes happen in one transaction (atomic)

import uuid
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.crowdfunding import Campaign, CampaignStatus
from app.models.donation import Donation, TransactionStatus
from app.models.user import User
from app.schemas.donation import DonationCreate

async def create_donation(
    db:AsyncSession,
    campaign_id:uuid.UUID,
    donation_data:DonationCreate,
    current_user:User,
)-> Donation:

    # process a donation to a campaign
    # 2 ops-> Update in donations and update the campaigns rasised amount and backed amt
    # if either fails we need to roll back

    campaign=await db.get(Campaign,campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404,detail="Campaign not found")

    if campaign.status != CampaignStatus.ACTIVE:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Cannot donate to a campaign with status '{campaign.status.value}'. "
                f"Only ACTIVE campaigns accept donations."
            ,)
        )

    if donation_data.currency_code != campaign.currency_code:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Currency mismatch. Campaign accepts {campaign.currency_code}, "
                f"you sent {donation_data.currency_code}."
            ),
        )

    # Creating the Donation record
    donation=Donation(
        campaign_id=campaign_id,
        donor_id=current_user.id,
        amount=donation_data.amount,
        currency_code=donation_data.currency_code,
        is_anonymous=donation_data.is_anonymous,
        donor_message=donation_data.donor_message,
        transaction_id=f"mock_txn_{uuid.uuid4().hex[:12]}",  # fake transaction ID
        transaction_status=TransactionStatus.COMPLETED,
    )

    db.add(donation)
    campaign.raised_amount=Campaign.raised_amount + donation_data.amount
    campaign.backer_count=Campaign.backer_count+1

    # Checking if cammpaign is fully funded
    if (
        not campaign.is_flexible_funding
        and campaign.raised_amount >= campaign.target_amount
    ):
        campaign.status=CampaignStatus.COMPLETED

    await db.flush()
    await db.refresh(donation)
    await db.refresh(campaign)

    return donation

async def get_campaign_donations(
    db:AsyncSession,
    campaign_id:uuid.UUID,
    skip:int=0,
    limit:int=20,
    include_anonymous:bool=False,
) -> list[Donation]:
    # List donations for a campaign nerwest first
    campaign=await db.get(Campaign,campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    query= (
        select(Donation)
        .where(Donation.campaign_id==campaign_id)
        .where(Donation.transaction_status==TransactionStatus.COMPLETED)
        .order_by(Donation.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    result=await db.execute(query)
    return result.scalars().all()

    
