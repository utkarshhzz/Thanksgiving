import pytest
import pytest_asyncio
from httpx import AsyncClient
from app.models.organization import Organization
from app.models.user import User

class TestInKindOffer:
    "donor creates an item donation offer"
    async def test_create_offer_success(
        self,client:AsyncClient,user_token:str,test_org:Organization
    ):
        # any authenticated user can offer an item
        response=await client.post(
            "/api/v1/in-kind",
            json={
                "organization_id": str(test_org.id),
                "item_name": "Winter Blankets",
                "item_description": "Pack of 10 heavy-duty blankets",
                "category": "clothing",
                "condition": "new",
                "quantity": 10,
                "unit_of_measure": "pieces",
                "estimated_value": "2500.00",
                "pickup_city": "Mumbai",
                
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 201
        data=response.json()
        assert data["item_name"]=="Winter Blankets"
        assert data["status"] == "offered"        # always starts as OFFERED
        assert data["category"] == "clothing"
        assert data["quantity"] == 10
        assert str(test_org.id) == data["organization_id"]
    

    async def test_create_offer_unauthenticated(
        self,client:AsyncClient,test_org:Organization
    ):
        # No token so 401
        response=await client.post(
            "/api/v1/in-kind",
            json={
                "organization_id": str(test_org.id),
                "item_name": "Books",
                "category": "books",
                "condition": "gently_used",
                "quantity": 5,
                
            },
            # headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 401
        

    async def test_create_offer_org_not_found(
        self,client:AsyncClient,user_token: str
    ):
        # offering to a non existent organisation
        import uuid
        response=await client.post(
            "/api/v1/in-kind",
            json={
                "organization_id": str(uuid.uuid4()),   # random UUID, doesn't exist
                "item_name": "Rice Bags",
                "category": "food",
                "condition": "new",
                "quantity": 20,
            },
            headers={"Authorization": f"Bearer {user_token}"}
            )
        assert response.status_code == 404

class TestInKindTransitions:
    """Tests the status state machine: OFFERED → ACCEPTED → PICKED_UP → RECEIVED → DISTRIBUTED."""
    @pytest_asyncio.fixture
    async def offered_donation(
        self, client: AsyncClient, user_token: str, test_org: Organization
    ) -> dict:
        """Creates an in-kind donation in OFFERED state. Returns the response JSON."""
        response = await client.post(
            "/api/v1/in-kind",
            json={
                "organization_id": str(test_org.id),
                "item_name": "Medical Supplies",
                "category": "medical",
                "condition": "new",
                "quantity": 50,
                "unit_of_measure": "kits",
                "pickup_city": "Delhi",
                "pickup_address": "123 Donor Street",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 201
        return response.json()
    async def test_org_accepts_offer(
        self,
        client: AsyncClient,
        org_token: str,
        offered_donation: dict,
    ):
        """Org coordinator moves OFFERED → ACCEPTED."""
        donation_id = offered_donation["id"]
        response = await client.patch(
            f"/api/v1/in-kind/{donation_id}/status",
            json={
                "status": "accepted",
                "coordinator_notes": "We need this urgently. Will arrange pickup.",
                "confirmed_pickup_date": "2027-08-01",
            },
            headers={"Authorization": f"Bearer {org_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"
        assert data["coordinator_notes"] == "We need this urgently. Will arrange pickup."
    async def test_donor_cancels_offer(
        self,
        client: AsyncClient,
        user_token: str,
        offered_donation: dict,
    ):
        """Donor can cancel their own OFFERED donation."""
        donation_id = offered_donation["id"]
        response = await client.patch(
            f"/api/v1/in-kind/{donation_id}/status",
            json={"status": "cancelled"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"
    async def test_invalid_transition_rejected(
        self,
        client: AsyncClient,
        org_token: str,
        offered_donation: dict,
    ):
        """OFFERED → DISTRIBUTED is not valid — must go through ACCEPTED first."""
        donation_id = offered_donation["id"]
        response = await client.patch(
            f"/api/v1/in-kind/{donation_id}/status",
            json={"status": "distributed"},
            headers={"Authorization": f"Bearer {org_token}"},
        )
        assert response.status_code == 422
    async def test_wrong_user_cannot_change_status(
        self,
        client: AsyncClient,
        user_token: str,     # user_token = the DONOR
        offered_donation: dict,
    ):
        """Donor cannot ACCEPT their own offer — only the org can do that."""
        donation_id = offered_donation["id"]
        response = await client.patch(
            f"/api/v1/in-kind/{donation_id}/status",
            json={"status": "accepted"},
            headers={"Authorization": f"Bearer {user_token}"},   # donor, not org
        )
        # "accepted" can only be done by org — donor gets 403
        assert response.status_code == 403
class TestInKindListing:
    """Tests for listing donations."""
    async def test_list_my_donations_as_donor(
        self,
        client: AsyncClient,
        user_token: str,
        test_org: Organization,
    ):
        """Donor sees their own offered items."""
        # First create a donation to list
        await client.post(
            "/api/v1/in-kind",
            json={
                "organization_id": str(test_org.id),
                "item_name": "Old Furniture",
                "category": "furniture",
                "condition": "fair",
                "quantity": 2,
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        response = await client.get(
            "/api/v1/in-kind/me",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["item_name"] == "Old Furniture"
    async def test_list_org_donations_as_org_owner(
        self,
        client: AsyncClient,
        user_token: str,
        org_token: str,
        test_org: Organization,
    ):
        """Org owner can see all donations offered to their org."""
        # Create a donation first
        await client.post(
            "/api/v1/in-kind",
            json={
                "organization_id": str(test_org.id),
                "item_name": "Toys for Kids",
                "category": "toys",
                "condition": "gently_used",
                "quantity": 30,
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        response = await client.get(
            f"/api/v1/in-kind/organizations/{test_org.id}",
            headers={"Authorization": f"Bearer {org_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    async def test_list_org_donations_wrong_user(
        self,
        client: AsyncClient,
        user_token: str,      # user_token is the donor, NOT the org owner
        test_org: Organization,
    ):
        """A random user cannot see another org's donations."""
        response = await client.get(
            f"/api/v1/in-kind/organizations/{test_org.id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 403