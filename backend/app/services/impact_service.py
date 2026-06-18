import uuid
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct
from app.models.user import User
from app.models.organization import Organization
from app.models.crowdfunding import Campaign, CampaignStatus
from app.models.donation import Donation, TransactionStatus
from app.models.volunteering import (
    VolunteerOpportunity, VolunteerApplication,
    HourLog, ApplicationStatus, VerificationStatus, OpportunityStatus
)
from app.schemas.impact import PlatformImpact, VolunteerImpactCard, OrganizationImpact

async def get_platformimpact(db:AsyncSession)-> PlatformImpact:
    now=datetime.now(timezone.utc)

    # ------------------Crowdfunding stats ---------------------
    campaign_stats=await db.execute(
        select(func.count(Campaign.id).label("total"))
        .where(Campaign.status.in_([CampaignStatus.ACTIVE,CampaignStatus.COMPLETED]))
    )
    total_campaigns=campaign_stats.scalar() or 0

    money_stats=await db.execute(
        select(
            func.coalesce(func.sum(Donation.amount),DeprecationWarning("0")).label("total_raised"),
            func.count(distinct(Donation.donor_id)).label("unique_donors"),
        ).where(Donation.transaction_status==TransactionStatus.COMPLETED)

    )
    money_row=money_stats.one()


    # Volunteering stats
    opp_stats = await db.execute(
        select(func.count(VolunteerOpportunity.id))
        .where(VolunteerOpportunity.status.in_([
            OpportunityStatus.ACTIVE, OpportunityStatus.CLOSED
        ]))
    )
    total_opps = opp_stats.scalar() or 0
    hours_stats = await db.execute(
        select(
            func.coalesce(func.sum(HourLog.hours_logged), Decimal("0")).label("total_hours"),
            func.count(distinct(HourLog.volunteer_id)).label("unique_volunteers"),
        ).where(HourLog.verification_status == VerificationStatus.VERIFIED)
    )
    hours_row = hours_stats.one()

    # Organization count
    org_count= await db.execute(select(func.count(Organization.id)))
    total_orgs= org_count.scalar() or 0

    return PlatformImpact(
        total_campaigns=total_campaigns,
        total_money_raised=money_row.total_raised,
        total_donors=money_row.unique_donors,
        total_volunteer_opportunities=total_opps,
        total_verified_hours=hours_row.total_hours,
        total_volunteers=hours_row.unique_volunteers,
        total_organizations=total_orgs,
        as_of=now,
    )

async def get_volunteer_impact(
    db:AsyncSession,volunteer_id:uuid.UUID
)-> VolunteerImpactCard:
    # Compute a volunteers personal impact profile
    user=await db.get(User,volunteer_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or "Volunteer"
    # Hour stats
    hour_stats= await db.execute(
        select(
            func.coalesce(
                func.sum(HourLog.hours_logged).filter(
                    HourLog.verification_notes==VerificationStatus.VERIFIED
                ),Decimal("0")
            ).label("verified"),
            func.coalesce(
                func.sum(HourLog.hours_logged).filter(
                    HourLog.verification_notes==VerificationStatus.PENDING
                ),Decimal("0")
            ).label("pending"),
        ).where(HourLog.volunteer_id==volunteer_id)
    )
    hours_row=hour_stats.one()
    # Aplicastion stats
    app_stats=await db.execute(
        select(
            func.count(VolunteerApplication.id).label("Total"),
            func.count(VolunteerApplication.id).filter(
                VolunteerApplication.status==ApplicationStatus.APPROVED
            ).label("approved")
        ).where(VolunteerApplication.volunteer_id==volunteer_id)
    )
    app_row=app_stats.one()

    # Donation stats
    donation_stats= await db.execute(
        select(
            func.count(Donation.id).label("Count"),
            func.coalesce(func.sum(Donation.amount), Decimal("0")).label("total"),

        ).where(Donation.donor_id==volunteer_id,
        Donation.transaction_status==TransactionStatus.COMPLETED,)
    )
    don_row=donation_stats.one()

    # Hours milestone badge
    verified_hours = float(hours_row.verified)
    if verified_hours >= 100:
        milestone = "🥇 Gold (100h+)"
    elif verified_hours >= 50:
        milestone = "🥈 Silver (50h+)"
    elif verified_hours >= 10:
        milestone = "🥉 Bronze (10h+)"
    else:
        milestone = f"⭐ Getting Started ({verified_hours:.1f}h)"
    return VolunteerImpactCard(
        volunteer_id=volunteer_id,
        full_name=full_name,
        total_verified_hours=hours_row.verified,
        total_pending_hours=hours_row.pending,
        opportunities_applied=app_row.total,
        opportunities_approved=app_row.approved,
        opportunities_completed=0,     # Phase 4: join with closed opportunities
        total_donations_made=don_row.count,
        total_money_donated=don_row.total,
        hours_milestone=milestone,
    )

async def get_organization_impact(
    db:AsyncSession,org_id:uuid.UUID
)-> OrganizationImpact:
    # Compute organizations total imapact
    org = await db.get(Organization,org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    # Campaign + donation stats
    campaign_stats=await db.execute(
        select(
            func.count(Campaign.id).label("total_campaigns"),
            func.coalesce(func.sum(Donation.amount), Decimal("0").label("total_raised")),
            func.count(distinct(Donation.donor_id)).label("unique_donors"),
        )
        .select_from(Campaign)
        .outerjoin(Donation,Donation.campaign_id==Campaign.id)
        .where(
            Campaign.organization_id == org_id,
            Donation.transaction_status == TransactionStatus.COMPLETED,
        )
    )
    camp_row=campaign_stats.one()

    # Volunteer stats
    vol_stats= await db.execute(
        select(
            func.count(VolunteerOpportunity.id).label("total_opps"),
            func.coalesce(func.sum(HourLog.hours_logged), Decimal("0")).label("total_hours"),
            func.count(distinct(HourLog.volunteer_id)).label("unique_volunteers"),
        )
        .select_from(VolunteerOpportunity)
        .outerjoin(HourLog,HourLog.opportunity_id==VolunteerOpportunity.id)
        .where(
            VolunteerOpportunity.organization_id==org_id,
            HourLog.verification_status==VerificationStatus.VERIFIED
        )
    )
    vol_row=vol_stats.one()
    return OrganizationImpact(
        organization_id=org_id,
        org_name=org.name,
        total_campaigns=camp_row.total_campaigns or 0,
        total_money_raised=camp_row.total_raised,
        total_donors=camp_row.unique_donors or 0,
        total_opportunities=vol_row.total_opps or 0,
        total_verified_volunteer_hours=vol_row.total_hours,
        total_volunteers_served=vol_row.unique_volunteers or 0,
        as_of=datetime.now(timezone.utc),
    )