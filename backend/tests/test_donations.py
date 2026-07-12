"""
Tests for the donations module.

What we test:
1. Logged-in user can donate to an active campaign
2. Guest cannot donate (401)
3. Zero amount is rejected (422)
4. Nonexistent campaign returns 404
5. Donations appear in /users/me/donations
"""
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crowdfunding import Campaign, CampaignStatus, CampaignCategory
from app.models.organization import Organization


# ── Fixture: creates a published campaign for tests to use ────────────────────
# A fixture is a helper that creates test data. It runs BEFORE each test that
# requests it. After the test, the database rolls back (data disappears).
@pytest.fixture
async def active_campaign(db: AsyncSession, test_org: Organization) -> Campaign:
    campaign = Campaign(
        organization_id=test_org.id,
        title="Test Water Campaign",
        description="Bring clean water to 500 families",
        category=CampaignCategory.HEALTH,
        target_amount=50000,
        raised_amount=0,
        status=CampaignStatus.ACTIVE,   # Must be ACTIVE to accept donations
        currency_code="INR",
    )
    db.add(campaign)
    await db.flush()       # write to DB within transaction
    await db.refresh(campaign)  # read back the generated UUID
    return campaign


class TestDonations:

    async def test_donate_success(
        self,
        client: AsyncClient,
        user_token: str,
        active_campaign: Campaign,
    ):
        """Happy path: logged-in user donates to an active campaign."""
        response = await client.post(
            f"/api/v1/campaigns/{active_campaign.id}/donations",
            json={"amount": 500.0, "currency_code": "INR"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code in (200, 201), response.text
        data = response.json()
        assert float(data["amount"]) == 500.0

    async def test_donate_requires_auth(
        self,
        client: AsyncClient,
        active_campaign: Campaign,
    ):
        """Guest (no token) must get 401 Unauthorized."""
        response = await client.post(
            f"/api/v1/campaigns/{active_campaign.id}/donations",
            json={"amount": 100.0, "currency_code": "INR"},
            # No Authorization header = not logged in
        )
        assert response.status_code == 401, "Guests must not be able to donate"

    async def test_donate_zero_rejected(
        self,
        client: AsyncClient,
        user_token: str,
        active_campaign: Campaign,
    ):
        """
        Donating 0 makes no sense.
        Pydantic validates this and returns 422 Unprocessable Entity.
        """
        response = await client.post(
            f"/api/v1/campaigns/{active_campaign.id}/donations",
            json={"amount": 0, "currency_code": "INR"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code in (400, 422), response.text

    async def test_donate_nonexistent_campaign(
        self,
        client: AsyncClient,
        user_token: str,
    ):
        """Donating to a campaign that does not exist returns 404."""
        fake_id = uuid.uuid4()  # random UUID — almost certainly not in DB
        response = await client.post(
            f"/api/v1/campaigns/{fake_id}/donations",
            json={"amount": 100.0, "currency_code": "INR"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 404

    async def test_my_donations_list(
        self,
        client: AsyncClient,
        user_token: str,
        active_campaign: Campaign,
    ):
        """After donating, /users/me/donations shows the donation."""
        # Step 1: donate
        await client.post(
            f"/api/v1/campaigns/{active_campaign.id}/donations",
            json={"amount": 250.0, "currency_code": "INR"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        # Step 2: check history
        response = await client.get(
            "/api/v1/users/me/donations",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200, response.text
        donations = response.json()
        assert isinstance(donations, list)
        assert len(donations) >= 1
        amounts = [float(d["amount"]) for d in donations]
        assert 250.0 in amounts
