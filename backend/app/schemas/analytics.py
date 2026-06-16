# Response  schemas for analytics endpoints
# Read only no create update 

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.crowdfunding import CampaignStatus

class DonationBrief(BaseModel):
    """A donation summary for public display"""
    amount:Decimal
    donor_message:Optional[str]
    is_anonymous:bool
    created_at:datetime
    model_config= ConfigDict(from_attributes=True)

class CampaignAnalytics(BaseModel):
    # Compete analytics for a capaign
    campaign_id:uuid.UUID
    title:str
    status:CampaignStatus.ACTIVE

    # Financial metrics
    target_amount:Decimal
    raised_amount:Decimal
    funding_percentage:float
    average_donation:Optional[Decimal]
    largest_donation:Optional[Decimal]

    # Engagement metrics
    backer_count:int
    days_remaining:Optional[int]

    recent_donations:list[DonationBrief]