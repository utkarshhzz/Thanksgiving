# app/schemas/donation.py

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel,Field,ConfigDict
from app.models.donation import TransactionStatus

class DonationCreate(BaseModel):
    # what  the client sends to donate to a campaign
    amount:Decimal=Field(...,gt=0,description="Donation amount,must be +ve")
    currency_code:str=Field("INR",min_length=3,max_length=3)
    is_anonymous:bool=False
    donor_message:Optional[str]=Field(None,max_length=500)

class DonationRead(BaseModel):
    # what the api returns after a donation
    id:uuid.UUID
    campaign_id:uuid.UUID
    donor_id:Optional[uuid.UUID]
    amount:Decimal
    currrency_code:str
    is_anonymous:bool
    donor_message:Optional[str]
    transaction_status:TransactionStatus
    created_at: datetime
    model_config=ConfigDict(from_attributes=True)


class DonationSummary(BaseModel):
    # lightweight versdion,used when liosting donations on a campaign page
    id: uuid.UUID
    amount: Decimal
    currency_code: str
    is_anonymous: bool
    donor_message: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
