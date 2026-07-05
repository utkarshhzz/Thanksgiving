import pytest
import pytest_asyncio
from httpx import AsyncClient
from app.models.user import User
from app.models.organization import Organization

class TestSpaceCRUD:
    # host creates / published and lists space listings
    async def test_create_space_listing(
        self,client:AsyncClient,user_token:str
    ):
        response=await client.post(
            "/api/v1/spaces",
            json={
                "name": "Community Hall A",
                "description": "Large hall with 200 chairs and a stage",
                "address": "45 MG Road, Bandra West",
                "city": "Mumbai",
                "space_type": "event_hall",
                "capacity": 200,
                "price_per_hour": "500.00",
                "amenities": "wifi,projector,parking,ac",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Community Hall A"
        assert data["status"] == "draft"          # always starts as draft
        assert data["city"] == "Mumbai"
        assert data["capacity"] == 200
        
    async def test_create_space_unauthenticated(self, client: AsyncClient):
        """No token → 401."""
        response = await client.post(
            "/api/v1/spaces",
            json={
                "name": "Secret Room",
                "city": "Delhi",
                "capacity": 10,
            },
        )
        assert response.status_code == 401
    async def test_publish_space(
        self, client: AsyncClient, user_token: str
    ):
        """Host publishes DRAFT → ACTIVE so the space appears in public listings."""
        # Step 1: create
        create_resp = await client.post(
            "/api/v1/spaces",
            json={
                "name": "Rooftop Garden",
                "city": "Pune",
                "space_type": "outdoor",
                "capacity": 50,
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        space_id = create_resp.json()["id"]
        # Step 2: publish
        publish_resp = await client.patch(
            f"/api/v1/spaces/{space_id}/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert publish_resp.status_code == 200
        assert publish_resp.json()["status"] == "active"
    async def test_browse_active_spaces_public(
        self, client: AsyncClient, user_token: str
    ):
        """Public browse — only ACTIVE spaces are returned, no auth required."""
        # Create and publish a space first
        create_resp = await client.post(
            "/api/v1/spaces",
            json={
                "name": "Downtown Office",
                "city": "Bangalore",
                "space_type": "office",
                "capacity": 20,
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        space_id = create_resp.json()["id"]
        await client.patch(
            f"/api/v1/spaces/{space_id}/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        # Browse — no auth needed
        response = await client.get("/api/v1/spaces")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Every returned space must be active
        for space in data:
            assert space["status"] == "active"
    async def test_my_spaces_includes_drafts(
        self, client: AsyncClient, user_token: str
    ):
        """Host's /mine endpoint returns ALL their spaces, including drafts."""
        # Create a draft (don't publish)
        await client.post(
            "/api/v1/spaces",
            json={
                "name": "Unpublished Warehouse",
                "city": "Chennai",
                "space_type": "warehouse",
                "capacity": 100,
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        response = await client.get(
            "/api/v1/spaces/mine",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        names = [s["name"] for s in response.json()]
        assert "Unpublished Warehouse" in names
class TestBookingFlow:
    """Full booking lifecycle: request → approve → complete."""
    @pytest_asyncio.fixture
    async def active_space(
        self, client: AsyncClient, org_token: str
    ) -> dict:
        """Org user creates and publishes a space. Returns the space JSON."""
        create_resp = await client.post(
            "/api/v1/spaces",
            json={
                "name": "NGO Meeting Room",
                "city": "Delhi",
                "space_type": "meeting_room",
                "capacity": 30,
                "price_per_hour": "0.00",
                "amenities": "wifi,whiteboard",
            },
            headers={"Authorization": f"Bearer {org_token}"},
        )
        space_id = create_resp.json()["id"]
        publish_resp = await client.patch(
            f"/api/v1/spaces/{space_id}/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {org_token}"},
        )
        return publish_resp.json()
    async def test_request_booking(
        self,
        client: AsyncClient,
        user_token: str,
        active_space: dict,
    ):
        """Authenticated user books an active space. Starts as PENDING."""
        space_id = active_space["id"]
        response = await client.post(
            f"/api/v1/spaces/{space_id}/book",
            json={
                "start_datetime": "2027-08-15T09:00:00+05:30",
                "end_datetime": "2027-08-15T17:00:00+05:30",
                "purpose": "Community health camp for 25 volunteers",
                "attendee_count": 25,
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "pending"
        assert data["attendee_count"] == 25
        assert data["space_id"] == space_id
    async def test_cannot_book_own_space(
        self,
        client: AsyncClient,
        org_token: str,       # org_token = the HOST who created the space
        active_space: dict,
    ):
        """Host cannot book their own space — business rule."""
        space_id = active_space["id"]
        response = await client.post(
            f"/api/v1/spaces/{space_id}/book",
            json={
                "start_datetime": "2027-09-01T10:00:00+05:30",
                "end_datetime": "2027-09-01T12:00:00+05:30",
                "purpose": "Trying to book my own room for some reason",
                "attendee_count": 5,
            },
            headers={"Authorization": f"Bearer {org_token}"},
        )
        assert response.status_code == 422
        assert "own space" in response.json()["error"]["message"].lower()
    async def test_cannot_exceed_capacity(
        self,
        client: AsyncClient,
        user_token: str,
        active_space: dict,
    ):
        """Attendee count exceeding capacity → 422."""
        space_id = active_space["id"]
        response = await client.post(
            f"/api/v1/spaces/{space_id}/book",
            json={
                "start_datetime": "2027-10-01T09:00:00+05:30",
                "end_datetime": "2027-10-01T18:00:00+05:30",
                "purpose": "Mega conference that's way too big for this room",
                "attendee_count": 500,      # space capacity is 30
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 422
        assert "capacity" in response.json()["error"]["message"].lower()
    async def test_host_approves_booking(
        self,
        client: AsyncClient,
        user_token: str,
        org_token: str,
        active_space: dict,
    ):
        """Full flow: requester books → host approves → status becomes APPROVED."""
        space_id = active_space["id"]
        # Step 1: Requester books
        book_resp = await client.post(
            f"/api/v1/spaces/{space_id}/book",
            json={
                "start_datetime": "2027-11-01T09:00:00+05:30",
                "end_datetime": "2027-11-01T12:00:00+05:30",
                "purpose": "Workshop on digital literacy for youth",
                "attendee_count": 20,
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        booking_id = book_resp.json()["id"]
        # Step 2: Host approves
        approve_resp = await client.patch(
            f"/api/v1/spaces/bookings/{booking_id}/status",
            json={
                "status": "approved",
                "host_notes": "Confirmed. Please use entrance B.",
            },
            headers={"Authorization": f"Bearer {org_token}"},
        )
        assert approve_resp.status_code == 200
        data = approve_resp.json()
        assert data["status"] == "approved"
        assert data["host_notes"] == "Confirmed. Please use entrance B."
    async def test_requester_cannot_approve(
        self,
        client: AsyncClient,
        user_token: str,
        org_token: str,
        active_space: dict,
    ):
        """Requester cannot approve their own booking — only host can."""
        space_id = active_space["id"]
        book_resp = await client.post(
            f"/api/v1/spaces/{space_id}/book",
            json={
                "start_datetime": "2027-12-01T09:00:00+05:30",
                "end_datetime": "2027-12-01T11:00:00+05:30",
                "purpose": "Self-approval attempt that should be blocked",
                "attendee_count": 5,
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        booking_id = book_resp.json()["id"]
        # Requester tries to approve their own booking
        response = await client.patch(
            f"/api/v1/spaces/bookings/{booking_id}/status",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {user_token}"},  # requester, not host
        )
        assert response.status_code == 403
    async def test_invalid_booking_transition(
        self,
        client: AsyncClient,
        user_token: str,
        org_token: str,
        active_space: dict,
    ):
        """PENDING → COMPLETED is invalid — must go through APPROVED first."""
        space_id = active_space["id"]
        book_resp = await client.post(
            f"/api/v1/spaces/{space_id}/book",
            json={
                "start_datetime": "2028-01-01T09:00:00+05:30",
                "end_datetime": "2028-01-01T17:00:00+05:30",
                "purpose": "Trying to skip straight to completed status",
                "attendee_count": 10,
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        booking_id = book_resp.json()["id"]
        response = await client.patch(
            f"/api/v1/spaces/bookings/{booking_id}/status",
            json={"status": "completed"},
            headers={"Authorization": f"Bearer {org_token}"},
        )
        assert response.status_code == 422