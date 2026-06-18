import uuid
from datetime import datetime,date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel,Field,ConfigDict
from app.models.volunteering import LogMethod,VerificationStatus


# Manual hour logging
class HourLogCreate(BaseModel):
    opportunity_id:uuid.UUID
    hours_logged:Decimal=Field(...,gt=0,le=24,description="Hours worked max 24 per log")
    log_date:date
    description:Optional[str]=Field(None,max_length=1000)


class HourLogVerify(BaseModel):
    # organisation coordinaator verifies or rejects manual hour log
    verification_status:VerificationStatus
    verification_notes:Optional[str]=Field(None,max_length=500)

class HourLogRead(BaseModel):
    id:uuid.UUID
    volunteer_id:uuid.UUID
    opportunity_id: uuid.UUID
    organization_id: uuid.UUID
    hours_logged: Decimal
    log_date: date
    description: Optional[str]
    log_method: LogMethod
    verification_status: VerificationStatus
    verified_by: Optional[uuid.UUID]
    verified_at: Optional[datetime]
    verification_notes: Optional[str]
    check_in_time: Optional[datetime]
    check_out_time: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------QR Token Chcck in system-------------------------------
class QRTokenResponse(BaseModel):
    # returned when organization generates qr code 
    # frontend encodes->volunteer scasns-> sends token to /hours/qr-checkin
    qr_token:str  #JWT token encoding opportunity id
    opportunity_id:uuid.UUID
    expires_in_hours:int =24

class QRCheckinRequest(BaseModel):
    qr_token:str 

class QRCheckoutRequest(BaseModel):
    qr_token:str 
    description:Optional[str]=Field(None,max_length=1000)

