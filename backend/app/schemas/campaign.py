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
