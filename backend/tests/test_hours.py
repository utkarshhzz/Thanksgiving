"""
tests/test_hours.py
====================
Tests for: manual hour logging, verification, QR check-in system.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.volunteering import (
    VolunteerOpportunity, VolunteerApplication,
    OpportunityStatus, ApplicationStatus
)


class TestHourLogging:
    @pytest_asyncio.fixture
    async def active_opp_with_approved_volunteer(
        self, client: AsyncClient, db: AsyncSession,
        org_token: str, user_token: str,
        test_org: Organization
    ) -> dict:
        """
        Full setup:
          1. Create opportunity
          2. Publish opportunity
          3. Volunteer applies
          4. Org approves
        Returns opportunity data.
        """
        # Create
        create = await client.post(
            "/api/v1/opportunities",
            json={
                "organization_id": str(test_org.id),
                "title": "Community Garden Help",
                "available_slots": 5,
            },
            headers={"Authorization": f"Bearer {org_token}"},
        )
        opp_id = create.json()["id"]

        # Publish
        await client.patch(
            f"/api/v1/opportunities/{opp_id}/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {org_token}"},
        )

        # Apply
        apply = await client.post(
            f"/api/v1/opportunities/{opp_id}/apply",
            json={"cover_letter": "I love gardening!"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        app_id = apply.json()["id"]

        # Approve
        await client.patch(
            f"/api/v1/applications/{app_id}/status",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {org_token}"},
        )

        return create.json()

    async def test_log_hours_manually(
        self, client: AsyncClient, user_token: str,
        active_opp_with_approved_volunteer: dict
    ):
        """Approved volunteer can log hours manually."""
        opp_id = active_opp_with_approved_volunteer["id"]
        response = await client.post(
            "/api/v1/hours/log",
            json={
                "opportunity_id": opp_id,
                "hours_logged": "4.5",
                "log_date": "2026-06-15",
                "description": "Planted vegetables and watered plants",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["hours_logged"] == "4.5"
        assert data["verification_status"] == "pending"
        assert data["log_method"] == "manual"

    async def test_qr_checkin_checkout_flow(
        self, client: AsyncClient, org_token: str,
        user_token: str, active_opp_with_approved_volunteer: dict
    ):
        """
        Full QR flow:
          1. Org generates QR token
          2. Volunteer checks in
          3. Volunteer checks out
          4. Hours auto-calculated and auto-verified
        """
        opp_id = active_opp_with_approved_volunteer["id"]

        # Step 1: Org generates QR token
        qr_response = await client.post(
            f"/api/v1/opportunities/{opp_id}/qr-token",
            headers={"Authorization": f"Bearer {org_token}"},
        )
        assert qr_response.status_code == 200
        qr_token = qr_response.json()["qr_token"]
        assert len(qr_token) > 10

        # Step 2: Volunteer checks in
        checkin = await client.post(
            "/api/v1/hours/qr-checkin",
            json={"qr_token": qr_token},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert checkin.status_code == 201
        assert checkin.json()["check_in_time"] is not None
        assert checkin.json()["check_out_time"] is None

        # Step 3: Volunteer checks out
        checkout = await client.post(
            "/api/v1/hours/qr-checkout",
            json={
                "qr_token": qr_token,
                "description": "Helped with garden setup",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert checkout.status_code == 200
        data = checkout.json()
        assert data["check_out_time"] is not None
        assert float(data["hours_logged"]) >= 0
        # QR logs are auto-verified — no human review needed
        assert data["verification_status"] == "verified"
        assert data["log_method"] == "qr_checkin"

    async def test_cannot_checkin_twice(
        self, client: AsyncClient, org_token: str,
        user_token: str, active_opp_with_approved_volunteer: dict
    ):
        """Scanning QR when already checked in returns 409 Conflict."""
        opp_id = active_opp_with_approved_volunteer["id"]

        qr = await client.post(
            f"/api/v1/opportunities/{opp_id}/qr-token",
            headers={"Authorization": f"Bearer {org_token}"},
        )
        qr_token = qr.json()["qr_token"]

        # First check-in
        await client.post(
            "/api/v1/hours/qr-checkin",
            json={"qr_token": qr_token},
            headers={"Authorization": f"Bearer {user_token}"},
        )

        # Second check-in — should fail
        second = await client.post(
            "/api/v1/hours/qr-checkin",
            json={"qr_token": qr_token},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert second.status_code == 409
