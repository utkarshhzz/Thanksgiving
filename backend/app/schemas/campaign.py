# pydanic operation for Campaign API operations

from ast import ClassDef
import uuid
from datetime import datetime,date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel,Field,ConfigDict
from app.models.crowdfunding import CampaignStatus,CampaignCategory

class CampaignBase(BaseModel):
    title:str=Field(...,min_length=5,max_length=255)
    description:Optional[str]=None
    category:CampaignCategory=CampaignCategory.OTHER
    target_amount:Decimal=Field(...,gt=0,description="must be greater than 0")
    currency_code:str=Field("INR",min_length=3,max_length=3)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_flexible_funding: bool = True

class CampaignCreate(CampaignBase):
    organization_id: uuid.UUID #Cllient must specify which org this campaign belongs to

class CampaignUpdate(BaseModel):
    # All fieldds optional only update whats sent
    title:Optional[str]=Field(None,min_length=5,max_length=255)
    description:Optional[str]=None
    category:Optional[CampaignCategory]=None
    target_amount:Optional[Decimal]=Field(None,gt=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class CampaignRead(CampaignBase):
    id:uuid.UUID
    organization_id:uuid.UUID
    raised_amount:Decimal
    backer_count:int
    status:CampaignStatus
    created_at:datetime
    updated_at:datetime

class CampaignStatusUpdate(BaseModel):
    """ Separate schema for status transitions- not part of general update"""
    status:CampaignStatus
