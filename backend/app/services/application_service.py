"""
Business logic for the volunteer application workflow.
"""

import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.volunteering import (
    VolunteerApplication, VolunteerOpportunity,
    ApplicationStatus, OpportunityStatus
)
from app.models.organization import Organization
from app.models.user import User
from app.schemas.application import ApplicationCreate, ApplicationStatusUpdate


async def apply_to_opportunity(
    db: AsyncSession,
    opportunity_id: uuid.UUID,
    data: ApplicationCreate,
    current_user: User,
) -> VolunteerApplication:
    """
    Volunteer submits an application.

    Rules:
      - Opportunity must be ACTIVE
      - Opportunity must have open slots
      - Volunteer cannot apply twice (UniqueConstraint catches this)
    """
    opp = await db.get(VolunteerOpportunity, opportunity_id)

    if opp is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    if opp.status != OpportunityStatus.ACTIVE:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot apply to a '{opp.status.value}' opportunity. Must be ACTIVE.",
        )

    if opp.filled_slots >= opp.available_slots:
        raise HTTPException(
            status_code=422,
            detail="This opportunity has no remaining slots.",
        )

    application = VolunteerApplication(
        opportunity_id=opportunity_id,
        volunteer_id=current_user.id,
        cover_letter=data.cover_letter,
        status=ApplicationStatus.PENDING,
    )

    db.add(application)

    try:
        await db.flush()
    except IntegrityError:
        # The UniqueConstraint fired — volunteer already applied
        # IntegrityError is SQLAlchemy's exception for DB constraint violations
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="You have already applied to this opportunity.",
        )

    await db.refresh(application)
    return application


async def review_application(
    db: AsyncSession,
    application_id: uuid.UUID,
    status_data: ApplicationStatusUpdate,
    current_user: User,
) -> VolunteerApplication:
    """
    Org coordinator approves or rejects. Volunteer withdraws.
    Enforces who is allowed to make which transition.
    """
    app = await db.get(VolunteerApplication, application_id)
    if app is None:
        raise HTTPException(status_code=404, detail="Application not found")

    opp = await db.get(VolunteerOpportunity, app.opportunity_id)
    org = await db.get(Organization, opp.organization_id)

    is_org_owner = org.owner_id == current_user.id
    is_volunteer = app.volunteer_id == current_user.id

    new_status = status_data.status

    # ── Permission matrix ─────────────────────────────────────────────────────
    if new_status in (ApplicationStatus.APPROVED, ApplicationStatus.REJECTED):
        # Only the org coordinator can approve/reject
        if not is_org_owner:
            raise HTTPException(
                status_code=403,
                detail="Only the organization coordinator can approve or reject applications.",
            )
        if app.status != ApplicationStatus.PENDING:
            raise HTTPException(
                status_code=422,
                detail=f"Can only review PENDING applications. This is '{app.status.value}'.",
            )

    elif new_status == ApplicationStatus.WITHDRAWN:
        # Only the volunteer themselves can withdraw
        if not is_volunteer:
            raise HTTPException(
                status_code=403,
                detail="Only the applicant can withdraw their application.",
            )
        if app.status not in (ApplicationStatus.PENDING, ApplicationStatus.APPROVED):
            raise HTTPException(
                status_code=422,
                detail=f"Cannot withdraw a '{app.status.value}' application.",
            )

    # ── Apply transition ──────────────────────────────────────────────────────
    app.status = new_status

    if status_data.coordinator_notes:
        app.coordinator_notes = status_data.coordinator_notes

    # If approved, increment filled_slots on the opportunity
    if new_status == ApplicationStatus.APPROVED:
        opp.filled_slots = VolunteerOpportunity.filled_slots + 1
        # Auto-close if now full
        if opp.filled_slots >= opp.available_slots:
            opp.status = OpportunityStatus.CLOSED

    # If withdrawing after approval, free up the slot
    if new_status == ApplicationStatus.WITHDRAWN and app.status == ApplicationStatus.APPROVED:
        opp.filled_slots = VolunteerOpportunity.filled_slots - 1

    await db.flush()
    await db.refresh(app)
    return app


async def get_my_applications(
    db: AsyncSession,
    current_user: User,
) -> list[VolunteerApplication]:
    """A volunteer sees all their own applications."""
    result = await db.execute(
        select(VolunteerApplication)
        .where(VolunteerApplication.volunteer_id == current_user.id)
        .order_by(VolunteerApplication.created_at.desc())
    )
    return result.scalars().all()


async def get_opportunity_applications(
    db: AsyncSession,
    opportunity_id: uuid.UUID,
    current_user: User,
) -> list[VolunteerApplication]:
    """Org coordinator sees all applications for their opportunity."""
    opp = await db.get(VolunteerOpportunity, opportunity_id)
    if opp is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    org = await db.get(Organization, opp.organization_id)
    if org.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.execute(
        select(VolunteerApplication)
        .where(VolunteerApplication.opportunity_id == opportunity_id)
        .order_by(VolunteerApplication.created_at.desc())
    )
    return result.scalars().all()
