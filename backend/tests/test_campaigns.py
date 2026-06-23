#  test for campaign crud operations
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crowdfunding import Campaign,CampaignStatus
from app.models.organization import Organization

class TestCampaignCRUD:
    async def test_create_campaign_as_org_owner(self,client:AsyncClient,org_token:str,test_org:Organization):
        # Org owner can create a campaign in draft status
        response=await client.post(
            "/api/v1/campaigns",
            json={
                "organization_id": str(test_org.id),
                "title": "Help Build a School",
                "description": "We need funds to build a school in rural India.",
                "target_amount": "50000.00",
                "currency_code": "USD",
                "end_date": "2027-12-31",
            },
            headers={"Authorization":f"Bearer {org_token}"},
        )
        assert response.status_code==201
        data=response.json()
        assert data["title"]=="Help Build a School"
        assert data["status"]=="draft"
        assert data["raised_amount"] == "0"
        assert data["backer_count"] == 0
    
    async def test_create_campaign_unauthenticated(
        self, client: AsyncClient, test_org: Organization
    ):
        """Unauthenticated request cannot create a campaign."""
        response = await client.post(
            "/api/v1/campaigns",
            json={
                "organization_id": str(test_org.id),
                "title": "Test Campaign",
                "target_amount": "1000.00",
            },
        )
        assert response.status_code == 403

    async def test_list_campaigns_public(self, client: AsyncClient):
        """Campaign list is public — no auth required."""
        response = await client.get("/api/v1/campaigns")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    
class TestCampaignLifecycle:
    @pytest_asyncio.fixture
    async def draft_campaign(
        self, client: AsyncClient, org_token: str, test_org: Organization
    ) -> dict:
        """Creates a draft campaign, returns the response JSON."""
        response = await client.post(
            "/api/v1/campaigns",
            json={
                "organization_id": str(test_org.id),
                "title": "Lifecycle Test Campaign",
                "target_amount": "10000.00",
                "currency_code": "USD",
                "end_date": "2027-12-31",
            },
            headers={"Authorization": f"Bearer {org_token}"},
        )
        return response.json()
    async def test_publish_campaign(
        self, client: AsyncClient, org_token: str, draft_campaign: dict
    ):
        """DRAFT campaign can be published → becomes ACTIVE."""
        response = await client.patch(
            f"/api/v1/campaigns/{draft_campaign['id']}/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {org_token}"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "active"
    async def test_cannot_publish_without_end_date(
        self, client: AsyncClient, org_token: str, test_org: Organization
    ):
        """Campaign without end_date cannot be published — returns 422."""
        # Create a campaign without end_date
        create_response = await client.post(
            "/api/v1/campaigns",
            json={
                "organization_id": str(test_org.id),
                "title": "No End Date Campaign",
                "target_amount": "5000.00",
            },
            headers={"Authorization": f"Bearer {org_token}"},
        )
        campaign_id = create_response.json()["id"]
        publish_response = await client.patch(
            f"/api/v1/campaigns/{campaign_id}/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {org_token}"},
        )
        assert publish_response.status_code == 422
        assert "end_date" in publish_response.json()["detail"].lower()
    async def test_invalid_state_transition_rejected(
        self, client: AsyncClient, org_token: str, draft_campaign: dict
    ):
        """DRAFT → COMPLETED is not allowed — must go through ACTIVE first."""
        response = await client.patch(
            f"/api/v1/campaigns/{draft_campaign['id']}/status",
            json={"status": "completed"},
            headers={"Authorization": f"Bearer {org_token}"},
        )
        assert response.status_code == 422
class TestDonations:
    async def test_donate_to_active_campaign(
        self, client: AsyncClient, org_token: str,
        user_token: str, test_org: Organization
    ):
        """User can donate to an ACTIVE campaign."""
        # Create and publish campaign
        create = await client.post(
            "/api/v1/campaigns",
            json={
                "organization_id": str(test_org.id),
                "title": "Donation Test Campaign",
                "target_amount": "5000.00",
                "currency_code": "USD",
                "end_date": "2027-12-31",
            },
            headers={"Authorization": f"Bearer {org_token}"},
        )
        campaign_id = create.json()["id"]
        await client.patch(
            f"/api/v1/campaigns/{campaign_id}/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {org_token}"},
        )
        # Donate
        donate = await client.post(
            f"/api/v1/campaigns/{campaign_id}/donations",
            json={"amount": "100.00", "currency_code": "USD"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert donate.status_code == 201
        assert donate.json()["amount"] == "100.00"
        assert donate.json()["transaction_status"] == "completed"
    async def test_cannot_donate_to_draft_campaign(
        self, client: AsyncClient, org_token: str,
        user_token: str, test_org: Organization
    ):
        """Donations to DRAFT campaigns are rejected."""
        create = await client.post(
            "/api/v1/campaigns",
            json={
                "organization_id": str(test_org.id),
                "title": "Draft Campaign No Donations",
                "target_amount": "1000.00",
                "currency_code": "USD",
            },
            headers={"Authorization": f"Bearer {org_token}"},
        )
        campaign_id = create.json()["id"]
        donate = await client.post(
            f"/api/v1/campaigns/{campaign_id}/donations",
            json={"amount": "50.00", "currency_code": "USD"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert donate.status_code == 422
        assert "active" in donate.json()["detail"].lower()

    