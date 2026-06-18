import uuid
from typing import Optional
from fastapi import APIRouter,Depends,Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db,get_current_active_user
from app.models.user import User
from app.schemas.hours import (
    HourLogCreate, HourLogRead, HourLogVerify,
    QRTokenResponse, QRCheckinRequest, QRCheckoutRequest,
)
from app.services.hours_service import (
    log_hours_manually, verify_hour_log, generate_opportunity_qr,
    qr_checkin, qr_checkout, get_my_hours, get_opportunity_hours,
)

router=APIRouter(tags=["Volunteering-hours"])

# Manual logging
@router.post("/hours/log",response_model=HourLogRead,status_code=201)
async def log_hours(
    data:HourLogCreate,
    current_user: User = Depends(get_current_active_user),
    db:AsyncSession = Depends(get_db)
):
    # Volunter maually logs hours
    return await log_hours_manually(db,data,current_user)

@router.patch("/hours/{log_id}/verify", response_model=HourLogRead)
async def verify_hours(
    log_id:uuid.UUID,
    verification_data:HourLogVerify,
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user),
):
    # org coordinator accepts or rejects an hour log
    return await verify_hour_log(db,log_id,verification_data,current_user)


@router.get("/hours/me", response_model=list[HourLogRead])
async def my_hours(
    opportunity_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Volunteer views their own hour logs."""
    return await get_my_hours(db, current_user, opportunity_id)
@router.get("/opportunities/{opportunity_id}/hours", response_model=list[HourLogRead])

async def opportunity_hours(
    opportunity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Org coordinator views all hour logs for their opportunity."""
    return await get_opportunity_hours(db, opportunity_id, current_user)

# ----------------QR check in System_____________________________

@router.post(
    "/opportunities/{opportunity_id}/qr-token",
    response_model=QRTokenResponse,
    summary="Generate qr token for an opportunity",
)
async def generate_qr(
    opportunity_id:uuid.UUID,
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user),
):
    # org coordinator ngenerates qr->frontend convertes the returned token to qr code
    return await generate_opportunity_qr(db,opportunity_id,current_user)

@router.post("/hours/qr-checkin", response_model=HourLogRead, status_code=201)
async def qr_check_in(
    data: QRCheckinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    #volunteer scans qr code to check in.
    #Records the check-in timestamp. Hours calculated on checkout.
    return await qr_checkin(db, data.qr_token, current_user)
@router.post("/hours/qr-checkout", response_model=HourLogRead)
async def qr_check_out(
    data: QRCheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Volunteer scans QR code again to check out.
    Hours auto-calculated and auto-verified.
    """
    return await qr_checkout(db, data.qr_token, data.description, current_user)