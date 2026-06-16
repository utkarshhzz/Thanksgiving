import uuid
from datetime import datetime,date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.volunteering import LocationType, UrgencyLevel, OpportunityStatus

class OpportunityBase(BaseModel):
    title:str=Field(...,min_length=5,max_length=255)
    description:Optional[str]=None
    required_skills:Optional[str]=Field(None,max_length=1000)
    location_type:LocationType=LocationType.ONSITE
    location_address:Optional[str]=None
    city:Optional[str]=None
    commitment_hours_per_week:Optional[Decimal]=Field(None,gt=0)
    commitment_weeks: Optional[int] = Field(None, gt=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    available_slots: int = Field(1, gt=0)
    urgency_level: UrgencyLevel = UrgencyLevel.NORMAL


class OpportunityCreate(OpportunityBase):
    organization_id:uuid.UUID

class OpportunityUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = None
    required_skills: Optional[str] = None
    location_type: Optional[LocationType] = None
    location_address: Optional[str] = None
    city: Optional[str] = None
    commitment_hours_per_week: Optional[Decimal] = Field(None, gt=0)
    commitment_weeks: Optional[int] = Field(None, gt=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    available_slots: Optional[int] = Field(None, gt=0)
    urgency_level: Optional[UrgencyLevel] = None


class OpportunityRead(OpportunityBase):
    id:uuid.UUID
    organization_id:uuid.UUID
    filled_slots:int
    status:OpportunityStatus
    created_at:datetime
    updated_at:datetime

    @property
    def slots_remaining(self)-> int:
        return max(0,self.available_slots-self.filled_slots)

    model_config=ConfigDict(from_attributes=True)

class OpportunityStatusUpdate(BaseModel):
    status:OpportunityStatus