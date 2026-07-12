import uuid
import hmac
import hashlib
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_current_active_user
from app.models.crowdfunding import Campaign, CampaignStatus
from app.models.user import User
from app.schemas.campaign import CampaignCreate, CampaignStatusUpdate, CampaignRead, CampaignUpdate
from app.services.campaign_service import (
    create_campaign,
    get_campaign_by_id,
    list_campaigns,
    update_campaign,
    transition_campaign_status,
    delete_campaign,
    get_campaign_analytics
)
from app.schemas.analytics import CampaignAnalytics
from app.services.upload_service import upload_image
from app.core.config import settings


router=APIRouter(prefix="/campaigns",tags=["Campaigns"])

@router.get("",response_model=list[CampaignRead],summary="List all Campaigns")
async def get_campaigns(
    skip:int=Query(0,ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[CampaignStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    # Public endpoint no auth required
    # returns a paginated list of campaigns with optional stataus filter
    # Query parameters:
    # skip=0 and limit=20 brings first 20 campaigns and status=active brings only active campaigns
    return await list_campaigns(db,skip=skip,limit=limit,status=status)

@router.get("/{campaign_id}",response_model=CampaignRead,summary="Get Campaign by id")
async def get_campaign(
    campaign_id:uuid.UUID,
    db:AsyncSession=Depends(get_db)
):
    # returns one campaign by its uuid
    campaign=await get_campaign_by_id(db,campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404,detail="Campaign not found")

    return campaign

@router.post(
    "",
    response_model=CampaignRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Campaign",
)
async def create_new_campaign(
    campaign_data:CampaignCreate,
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user),
):
    # protected endpoint - requries authentication,
    # Creates a campaign in Draft status
    return await create_campaign(db,campaign_data,current_user)



@router.patch("/{campaign_id}", response_model=CampaignRead, summary="Update a campaign")
async def update_existing_campaign(
    campaign_id: uuid.UUID,
    update_data: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Protected endpoint — only the organization owner can update."""
    return await update_campaign(db, campaign_id, update_data, current_user)


@router.patch(
    "/{campaign_id}/status",
    response_model=CampaignRead,
    summary="Transition campaign to a new status",
)
async def change_campaign_status(
    campaign_id:uuid.UUID,
    status_data:CampaignStatusUpdate,
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user),
):
    """Move a campaign through its lifecycle.
    Valid trnsitions:
     - DRAFT → ACTIVE (publish — requires title, target_amount, end_date)
    - DRAFT → CANCELLED
    - ACTIVE → COMPLETED
    - ACTIVE → CANCELLED
    - COMPLETED → ARCHIVED
    - CANCELLED → ARCHIVED
    """

    return await transition_campaign_status(db,campaign_id,status_data.status,current_user)

@router.delete(
    "/{campaign_id}",
    status_code=204,
    summary="Delete  a draft campaign",
)
async def remove_campaign(
    campaign_id:uuid.UUID,
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user),
    
):

    """
    Hard delete. Only DRAFT campaigns can be deleted.
    Published campaigns must be CANCELLED instead.
    Returns 204 No Content on success (standard for DELETE).
    """
    await delete_campaign(db, campaign_id, current_user)


# Ading the analytics endpoint

@router.get(
    "/{campaign_id}/analytics",
    response_model=CampaignAnalytics,
    summary="Get analyticxs for a camaign",
)
async def campaign_analytics(
    campaign_id:uuid.UUID,
    db:AsyncSession=Depends(get_db),
):
    #public endpoint returns fundning progress,stats,no auth needed public campaign data
    return await get_campaign_analytics(db,campaign_id)


@router.post("/{campaign_id}/upload-image")
async def upload_campaign_image(
    campaign_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a cover image for a campaign. Saves URL to the campaign record."""
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    image_url = await upload_image(file=file, folder="campaigns", public_id=str(campaign_id))

    campaign.image_url = image_url
    await db.flush()
    return {"image_url": image_url}


# ── Razorpay payment endpoints ────────────────────────────────────────────────

@router.post(
    "/{campaign_id}/payment/create-order",
    summary="Create a Razorpay order for a donation",
)
async def create_payment_order(
    campaign_id: uuid.UUID,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Step 1 of the payment flow.
    Creates a Razorpay order and returns the order_id needed by the frontend
    to open the checkout popup.

    Frontend sends: { "amount": 500 }  (in rupees)
    Backend returns: { "order_id": "order_xxx", "amount": 50000, "currency": "INR", "key_id": "rzp_test_..." }
    """
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Payment gateway not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env"
        )

    campaign = await db.get(Campaign, campaign_id)
    if not campaign or campaign.status != CampaignStatus.ACTIVE:
        raise HTTPException(status_code=404, detail="Campaign not found or not active")

    amount_rupees = float(body.get("amount", 0))
    if amount_rupees <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    amount_paise = int(amount_rupees * 100)  # Razorpay uses smallest currency unit (paise)

    try:
        import razorpay
        rzp = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        order = rzp.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"camp_{str(campaign_id)[:8]}_{str(current_user.id)[:8]}",
            "notes": {
                "campaign_id": str(campaign_id),
                "user_id": str(current_user.id),
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Razorpay order creation failed: {str(e)}")

    return {
        "order_id":  order["id"],
        "amount":    amount_paise,
        "currency": "INR",
        "key_id":   settings.RAZORPAY_KEY_ID,  # frontend needs this to initialise the popup
    }


@router.post(
    "/{campaign_id}/payment/verify",
    summary="Verify Razorpay payment and record donation",
)
async def verify_payment(
    campaign_id: uuid.UUID,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Step 2 of the payment flow.
    Verifies the Razorpay HMAC-SHA256 signature to confirm the payment is genuine
    (not tampered with), then saves the donation to the database.

    Frontend sends:
    {
      "razorpay_order_id":   "order_xxx",
      "razorpay_payment_id": "pay_xxx",
      "razorpay_signature":  "abc123...",
      "amount":              50000   (paise)
    }
    """
    required = ["razorpay_order_id", "razorpay_payment_id", "razorpay_signature", "amount"]
    missing = [k for k in required if k not in body]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing fields: {missing}")

    # Cryptographic signature check — proves Razorpay generated this payment
    key_secret = settings.RAZORPAY_KEY_SECRET.encode()
    msg = f"{body['razorpay_order_id']}|{body['razorpay_payment_id']}".encode()
    expected = hmac.new(key_secret, msg, hashlib.sha256).hexdigest()

    if expected != body["razorpay_signature"]:
        raise HTTPException(status_code=400, detail="Invalid payment signature — possible tampering")

    # Save donation using existing service
    from app.services.donation_service import create_donation
    from app.schemas.donation import DonationCreate

    amount_rupees = float(body["amount"]) / 100  # convert paise → rupees
    donation = await create_donation(
        db=db,
        campaign_id=campaign_id,
        donation_data=DonationCreate(amount=amount_rupees),
        current_user=current_user,
    )

    # Fire email notification in background (non-blocking)
    try:
        from app.services.email_service import send_donation_notification
        import asyncio
        campaign = await db.get(Campaign, campaign_id)
        if campaign and hasattr(campaign, 'organization') and campaign.organization:
            asyncio.create_task(send_donation_notification(
                org_email=campaign.organization.owner.email,
                org_name=campaign.organization.name,
                donor_name=f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "A donor",
                amount=amount_rupees,
                campaign_title=campaign.title,
                campaign_url=f"{settings.FRONTEND_URL}/campaigns/{campaign_id}",
            ))
    except Exception:
        pass  # Email failure must never block the payment confirmation

    return {"success": True, "donation_id": str(donation.id), "amount": amount_rupees}
