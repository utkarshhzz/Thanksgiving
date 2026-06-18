import uuid
from datetime import datetime,date,timedelta,timezone
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError
from app.core.config import settings
from app.models.volunteering import (
    HourLog, VolunteerOpportunity, VolunteerApplication,
    ApplicationStatus, OpportunityStatus,
    LogMethod, VerificationStatus
)
from app.models.organization import Organization
from app.models.user import User
from app.schemas.hours import HourLogCreate, HourLogVerify, QRTokenResponse


# qr token generation and validation
QR_TOKEN_TYPE="qr_opportunity"
QR_TOKEN_EXPIRE_HOURS=24

def generate_qr_token(opportunity_id:uuid.UUID)-> str:
    # generate a signed jwt token fopr qr absed check in
    expire=datetime.now(timezone.utc)+ timedelta(hours=QR_TOKEN_EXPIRE_HOURS)
    payload= {
        "type": QR_TOKEN_TYPE,
        "opportunity_id":str(opportunity_id),
        "exp":expire,
    }
    return jwt.encode(payload,settings.SECRET_KEY,algorithm=settings.ALGORITHM)

def validate_qr_token(token:str)-> uuid.UUID:
    # Decode and validate a qr token-> return opportunity id
    try:
        payload=jwt.decode(token,settings.SECRET_KEY,algorithms=[settings.ALGORITHM])
        if payload.get("type")!=QR_TOKEN_TYPE:
            raise HTTPException(status_code=400, detail="Invalid QR token type")
        return uuid.UUID(payload["opportunity_id"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid or expired QR code")


# Helpers

async def _assert_approved_volunteer(
    db:AsyncSession,
    volunteer_id:uuid.UUID,
    opportunity_id:uuid.UUID,
)-> VolunteerApplication:
    # Verify the volunteer has an approved application for this opportunity
    result=await db.execute(
        select(VolunteerApplication).where(
            VolunteerApplication.volunteer_id==volunteer_id,
            VolunteerApplication.opportunity_id==opportunity_id,
            VolunteerApplication.status==ApplicationStatus.APPROVED,
        )
    )
    application=result.scalars.first()
    if application is None:
        raise HTTPException(
            status_code=403,
            detail="You must have an approved application to log hours for this opportunity.",
        )
    return application

# Manual hour logging------------------------------------------------
async def log_hours_manually(
    db:AsyncSession,
    data:HourLogCreate,
    current_user:User,
)-> HourLog:
    # volunter manually submits hours.starts as pending
    opp=await db.get(VolunteerOpportunity,data.opportunity_id)
    if opp is None:
        raise HTTPException(status_code=404,detail="Opportunity not found")
    if opp.status not in (OpportunityStatus.ACTIVE,OpportunityStatus.CLOSED):
        raise HTTPException(
            status_code=422,
            detail="Can only log hours for ACTIVE or CLOSED opportunities.",
        )

    # Verify volunteer has approved application
    await _assert_approved_volunteer(db,current_user.id,data.opportunity_id)
    # Validate date is not in the future
    if data.log_date > date.today():
        raise HTTPException(
            status_code=422,
            detail="Cannot log hours for a future date.",
        )
    hour_log = HourLog(
        volunteer_id=current_user.id,
        opportunity_id=data.opportunity_id,
        organization_id=opp.organization_id,
        hours_logged=data.hours_logged,
        log_date=data.log_date,
        description=data.description,
        log_method=LogMethod.MANUAL,
        verification_status=VerificationStatus.PENDING,
    )
    db.add(hour_log)
    await db.flush()
    await db.refresh(hour_log)
    return hour_log

async def verify_hour_log(
    db:AsyncSession,
    log_id:uuid.UUID,
    verification_data:HourLogVerify,
    current_user:User,
)-> HourLog:
    # organization coordinator canj verify or reject hour log
    log=await db.get(HourLog,log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="Hour log not found")
    org=await db.get(Organization,log.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    # Verify user is organization coordinator
    if org.owner_id!= current_user.id:
        raise HTTPException(status_code=403,detail="You are not authorized to verify this hour log")
    # check status is not already verified
    log.verification_status=verification_data.verification_status
    log.verified_by = current_user.id
    log.verified_at = datetime.now(timezone.utc)
    log.verification_notes = verification_data.verification_notes
    await db.flush()
    await db.refresh(log)
    return log


async def generate_opportunity_qr(
    db:AsyncSession,
    opportunity_id:uuid.UUID,
    current_user:User,
)-> QRTokenResponse:
    # Organization coordinator genberates a qr code for this opportunity
    opp=await db.get(VolunteerOpportunity,opportunity_id)
    if opp is None:
        raise HTTPException(status_code=404,detail="Opportunity not found")
    org=await db.get(Organization,opp.organization_id)
    if org.owner_id != current_user.id:
        raise HTTPException(status_code=403,detail="Only the org coordinator can generate qr codes")
    if opp.status != OpportunityStatus.ACTIVE:
        raise HTTPException(status_code=422, detail="Can only generate QR for ACTIVE opportunities")
    token = generate_qr_token(opportunity_id)
    return QRTokenResponse(
        qr_token=token,
        opportunity_id=opportunity_id,
        expires_in_hours=QR_TOKEN_EXPIRE_HOURS,
    )

async def qr_checkin(
    db:AsyncSession,
    qr_token:str,
    current_user:User,
)-> HourLog:
    # Voluntteeer scans qr records checkin time we create incomplete log no check out time
    opportunity_id=validate_qr_token(qr_token)
    opp=await db.get(VolunteerOpportunity,opportunity_id)
    if opp is None:
        raise HTTPException(status_code=404,detail="Oportunity not found")
    # Ensure volunteer is approved
    await _assert_approved_volunteer(db,current_user.id,opportunity_id)
    existing = await db.execute(
        select(HourLog).where(
            HourLog.volunteer_id == current_user.id,
            HourLog.opportunity_id == opportunity_id,
            HourLog.check_in_time.is_not(None),
            HourLog.check_out_time.is_(None),  # No checkout yet = still checked in
        )
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=409,
            detail="You are already checked in to this opportunity. Scan again to check out.",
        )
    now=datetime.now(timezone.utc)

    hour_log=HourLog(
        volunteer_id=current_user.id,
        opportunity_id=opportunity_id,
        organization_id=opp.organization_id,
        hours_logged=Decimal("0"),   # Will be calculated on checkout
        log_date=now.date(),
        check_in_time=now,
        log_method=LogMethod.QR_CHECKIN,
        verification_status=VerificationStatus.PENDING,  # Updated to VERIFIED on checkout
    )
    db.add(hour_log)
    await db.flush()
    await db.refresh(hour_log)
    return hour_log

async def qr_checkout(
    db:AsyncSession,
    qr_token:str,
    description:str|None,
    current_user:User,
)-> HourLog:
    # Volunteer scans qr code again to ceckout
    opportunity_id=validate_qr_token(qr_token)
    result=await db.execute(
        select(HourLog).where(
            HourLog.volunteer_id==current_user.id,
            HourLog.opportunity_id==opportunity_id,
            HourLog.check_in_time.is_not(None),
            HourLog.check_out_time.is_(None),
        )
    )
    log=result.scalars().first()
    if log is None:
        raise HTTPException(
            status_code=404,
            detail="No active check-in found. Please scan the QR code to check in first.",
        )
    now=datetime.now(timezone.utc)
    log.check_out_time=now
    # calculate hours
    duration_seconds=(now-log.check_in_time).total_seconds()
    hours=Decimal(str(round(duration_seconds /3600,2)))
    # Sanity check — no one volunteers for 24+ hours in one session
    if hours > 24:
        raise HTTPException(
            status_code=422,
            detail="Session duration exceeds 24 hours. Please contact your coordinator.",
        )
    log.hours_logged = hours
    log.description = description
    # QR-based = auto-verified. The system recorded both timestamps — no human dispute possible.
    log.verification_status = VerificationStatus.VERIFIED
    log.verified_at = now
    await db.flush()
    await db.refresh(log)
    return log


# --------------queries------------------------

async def get_my_hours(
    db:AsyncSession,
    current_user:User,
    opportunity_id:uuid.UUID | None=None,
)-> list[HourLog]:
    # Volunters can see their own hour logs
    query=select(HourLog).where(HourLog.volunteer_id==current_user.id)
    if opportunity_id:
        query=query.where(HourLog.opportunity_id==opportunity_id)
    query=query.order_by(HourLog.log_date.desc())
    result=await db.execute(query)
    return result.scalars().all()

async def get_opportunity_hours(
    db: AsyncSession,
    opportunity_id: uuid.UUID,
    current_user: User,
) -> list[HourLog]:
    """Org coordinator views all hour logs for their opportunity."""
    opp = await db.get(VolunteerOpportunity, opportunity_id)
    if opp is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    org = await db.get(Organization, opp.organization_id)
    if org.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    result = await db.execute(
        select(HourLog)
        .where(HourLog.opportunity_id == opportunity_id)
        .order_by(HourLog.log_date.desc())
    )
    return result.scalars().all()