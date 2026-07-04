import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.in_kind import InKindStatus,InKindDonation
from app.models.organization  import Organization
from app.models.user import User
from app.schemas.in_kind import InKindCreate,InKindStatusUpdate

# Valid transition and who can maek them
VALID_INKIND_TRANSITIONS:dict[InKindStatus,dict[InKindStatus,str]]={
    InKindStatus.OFFERED:{
        InKindStatus.ACCEPTED:"org",
        InKindStatus.REJECTED:"org",
        InKindStatus.CANCELLED:"donor",
    },
    InKindStatus.ACCEPTED:{
        InKindStatus.PICKED_UP:"org",
        InKindStatus.CANCELLED:"org_or_donor"
    },
    InKindStatus.PICKED_UP: {
        InKindStatus.RECEIVED: "org",
    },
    InKindStatus.RECEIVED: {
        InKindStatus.DISTRIBUTED: "org",
    },
    InKindStatus.REJECTED: {},     # Terminal
    InKindStatus.DISTRIBUTED: {},  # Terminal
    InKindStatus.CANCELLED: {},    # Terminal
}

async def offer_donation(
    db:AsyncSession,
    data:InKindCreate,
    current_user:User,
)-> InKindDonation:
    # Donor creates an in kind donation offer
    org=await db.get(Organization,data.organization_id)
    if org is None:
        raise HTTPException(status_code=404,detail="Organization not found")
    donation=InKindDonation(
        donor_id=current_user.id,
        organization_id=data.organization_id,
        item_name=data.item_name,
        item_description=data.item_description,
        category=data.category,
        condition=data.condition,
        quantity=data.quantity,
        unit_of_measure=data.unit_of_measure,
        estimated_value=data.estimated_value,
        pickup_address=data.pickup_address,
        pickup_city=data.pickup_city,
        pickup_available_from=data.pickup_available_from,
        pickup_available_until=data.pickup_available_until,
        status=InKindStatus.OFFERED,
    )
    db.add(donation)
    await db.flush()
    await db.refresh(donation)
    return donation

async def update_donation_status(
    db:AsyncSession,
    current_user:User,
    donation_id:uuid.UUID,
    data:InKindStatusUpdate
)-> InKindDonation:
    # Moves the donation through its lifecycle
    donation=await db.get(InKindDonation,donation_id)
    if donation is None:
        raise HTTPException(status_code=404, detail="Donation not found")
    org=await db.get(Organization,donation.organization_id)
    is_org=org.owner_id==current_user.id
    is_donor=donation.donor_id==current_user.id
    if not is_org and not is_donor:
        raise HTTPException(status_code=403, detail="Permission denied")

    # Checking if transition is valid from current state
    allowed=VALID_INKIND_TRANSITIONS.get(donation.status,{})
    if data.status not in allowed:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Cannot transition from '{donation.status.value}' to '{data.status.value}'. "
                f"Allowed: {[s.value for s in allowed.keys()]}"
            ),
        )
    actor = allowed[data.status]
    if actor == "org" and not is_org:
        raise HTTPException(status_code=403, detail="Only the organization can make this change")
    if actor == "donor" and not is_donor:
        raise HTTPException(status_code=403, detail="Only the donor can make this change")
    # "donor_or_org" allows either — already validated above
    donation.status = data.status
    if data.coordinator_notes:
        donation.coordinator_notes = data.coordinator_notes
    if data.confirmed_pickup_date:
        donation.confirmed_pickup_date = data.confirmed_pickup_date
    await db.flush()
    await db.refresh(donation)
    return donation


async def list_my_donations(
    db:AsyncSession,
    current_user:User,
)-> list[InKindDonation]:
    result=await db.execute(
        select(InKindDonation)
        .where(InKindDonation.donor_id==current_user.id)
        .order_by(InKindDonation.created_at.desc())
    )
    return result.scalars().all()

async def list_org_donations(
    db:AsyncSession,
    org_id:uuid.UUID,
    current_user:User,
    status:InKindStatus|None=None,
)-> list[InKindDonation]:
    # Org coordinator sees all donations offered to their organization
    org = await db.get(Organization,org_id)
    if org is None:
        raise HTTPException(status_code=404,detail="Organization not found")
    if org.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")

    query=select(InKindDonation).where(InKindDonation.organization_id==org_id)
    if status:
        query=query.where(InKindDonation.status==status)
    query=query.order_by(InKindDonation.created_at.desc())

    result= await db.execute(query)
    return result.scalars().all()