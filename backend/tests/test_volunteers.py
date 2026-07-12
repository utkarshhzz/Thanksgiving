"""
Tests for the volunteering module and admin security.

What we test:
1. Org can create a volunteer opportunity
2. Individual cannot create opportunities (403)
3. Individual can apply to an opportunity
4. Guest cannot apply (401)
5. Same person cannot apply twice (409)
6. Applied opportunity appears in /applications/mine
7. Non-admin cannot access /admin/* (403)
8. Guest cannot access /admin/* (401)
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.volunteering import VolunteerOpportunity, OpportunityStatus


# ── Fixture: a published volunteer opportunity ────────────────────────────────
@pytest.fixture
async def active_opportunity(
    db: AsyncSession,
    test_org: Organization,
) -> VolunteerOpportunity:
    """An ACTIVE opportunity that individuals can apply to."""
    opp = VolunteerOpportunity(
        organization_id=test_org.id,
        title="Tree Planting Drive",
        description="Plant 500 trees in Bengaluru",
        category="environment",
        city="Bengaluru",
        hours_per_week=5,
        max_volunteers=20,
        status=OpportunityStatus.ACTIVE,
    )
    db.add(opp)
    await db.flush()
    await db.refresh(opp)
    return opp


class TestVolunteerOpportunities:

    async def test_org_can_create_opportunity(
        self,
        client: AsyncClient,
        org_token: str,
        test_org: Organization,
    ):
        """Organization user can create a volunteer opportunity."""
        response = await client.post(
            "/api/v1/opportunities",
            json={
                "organization_id": str(test_org.id),
                "title": "Beach Cleanup",
                "description": "Clean Juhu Beach",
                "category": "environment",
                "city": "Mumbai",
                "hours_per_week": 3,
                "max_volunteers": 50,
            },
            headers={"Authorization": f"Bearer {org_token}"},
        )
        assert response.status_code in (200, 201), response.text
        assert response.json()["title"] == "Beach Cleanup"

    async def test_individual_cannot_create_opportunity(
        self,
        client: AsyncClient,
        user_token: str,
        test_org: Organization,
    ):
        """
        Only ORGANIZATION users can create opportunities.
        user_token is an INDIVIDUAL user — must get 403 Forbidden.
        """
        response = await client.post(
            "/api/v1/opportunities",
            json={
                "organization_id": str(test_org.id),
                "title": "Sneaky Opportunity",
                "description": "Should fail",
                "category": "other",
                "city": "Delhi",
                "hours_per_week": 1,
                "max_volunteers": 5,
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 403

    async def test_apply_to_opportunity(
        self,
        client: AsyncClient,
        user_token: str,
        active_opportunity: VolunteerOpportunity,
    ):
        """Individual can apply to an active opportunity."""
        response = await client.post(
            f"/api/v1/applications/{active_opportunity.id}/apply",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code in (200, 201), response.text

    async def test_apply_requires_auth(
        self,
        client: AsyncClient,
        active_opportunity: VolunteerOpportunity,
    ):
        """Guest cannot apply — must be logged in (401)."""
        response = await client.post(
            f"/api/v1/applications/{active_opportunity.id}/apply",
        )
        assert response.status_code == 401

    async def test_cannot_apply_twice(
        self,
        client: AsyncClient,
        user_token: str,
        active_opportunity: VolunteerOpportunity,
    ):
        """
        Applying twice to the same opportunity should fail.
        Backend should return 409 Conflict or 400 Bad Request.
        """
        # First apply — should work
        await client.post(
            f"/api/v1/applications/{active_opportunity.id}/apply",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        # Second apply — should fail
        response = await client.post(
            f"/api/v1/applications/{active_opportunity.id}/apply",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code in (400, 409), "Duplicate application must be rejected"

    async def test_my_applications_list(
        self,
        client: AsyncClient,
        user_token: str,
        active_opportunity: VolunteerOpportunity,
    ):
        """After applying, /applications/mine shows the application."""
        await client.post(
            f"/api/v1/applications/{active_opportunity.id}/apply",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        response = await client.get(
            "/api/v1/applications/mine",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200, response.text
        apps = response.json()
        assert isinstance(apps, list)
        assert len(apps) >= 1


class TestAdminSecurity:

    async def test_non_admin_blocked_from_stats(
        self,
        client: AsyncClient,
        user_token: str,
    ):
        """
        Most critical security test:
        A regular user MUST NOT be able to access admin endpoints.
        Expected: 403 Forbidden
        """
        response = await client.get(
            "/api/v1/admin/stats",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 403, "Non-admins must be blocked from /admin/*"

    async def test_guest_blocked_from_admin(
        self,
        client: AsyncClient,
    ):
        """Guest (no token) cannot access admin endpoints either (401)."""
        response = await client.get("/api/v1/admin/stats")
        assert response.status_code == 401
