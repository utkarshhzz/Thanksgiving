from sqlalchemy import Date
import uuid
from datetime import datetime,date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel,Field,ConfigDict
from app.models.in_kind import ItemCategory,ItemCondition,InKindStatus

class InKindCreate(BaseModel):
    # Donor offers an item to organization.BaseModelor\
    organization_id:uuid.UUID
    item_name:str=Field(...,min_length=2,max_length=255)
    item_description:Optional[str]=None
    category:ItemCategory=ItemCategory.OTHER
    condition:ItemCondition
    quantity:int=Field(1,gt=0)
    unit_of_measure:str=Field("items", max_length=50)
    estimated_value:Optional[Decimal]=Field(None,gt=0)
    pickup_address: Optional[str] = None
    pickup_city: Optional[str] = None
    pickup_available_from: Optional[date] = None
    pickup_available_until: Optional[date] = None

class InKindStatusUpdate(BaseModel):
    # organization oordinator updates status (accepted rejected picked up etc)
    status:InKindStatus
    coordinator_notes:Optional[str]=Field(None,max_length=1000)
    confirmed_pickup_date:Optional[date]= None

class InKindRead(BaseModel):
    id:uuid.UUID
    donor_id:uuid.UUID
    organization_id:uuid.UUID
    item_name:str=Field(...,min_length=2,max_length=255)
    item_description:Optional[str]=None
    category:ItemCategory=ItemCategory.OTHER
    condition:ItemCondition
    quantity:int=Field(1,gt=0)
    unit_of_measure:str=Field("items", max_length=50)
    estimated_value:Optional[Decimal]=Field(None,gt=0)
    pickup_address: Optional[str] = None
    pickup_city: Optional[str] = None
    pickup_available_from: Optional[date] = None
    pickup_available_until: Optional[date] = None
    status:InKindStatus
    coordinator_notes:Optional[str]
    confirmed_pickup_date:Optional[date]
    created_at:datetime
    updated_at:datetime

    model_config=ConfigDict(from_attributes=True)
