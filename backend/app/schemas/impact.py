# Impact reporting at 3 level user organizationa nd app level

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

class PlatformImpact(BaseModel):
    # platform stats on Homepage 
    total_campaigns:int
    total_money_raised:Decimal
    total_donors:int

    total_volunteer_opportunities:int
    total_verified_hours:Decimal
    total_volunteers:int

    total_organizations:int

    # computed at req. time
    as_of:datetime


class VolunteerImpactCard(BaseModel):
    """
    A single volunteer's personal impact profile.
    Shown on their profile page — their contribution to society.
    """
    volunteer_id: uuid.UUID
    full_name: str
    total_verified_hours: Decimal
    total_pending_hours: Decimal
    opportunities_applied: int
    opportunities_approved: int
    opportunities_completed: int    # Approved + opportunity is CLOSED
    total_donations_made: int
    total_money_donated: Decimal
    # Milestone badges (more added in Phase 4 gamification)
    hours_milestone: str    # "Bronze (10h)", "Silver (50h)", "Gold (100h+)"
class OrganizationImpact(BaseModel):
    """
    Impact summary for one organization.
    Shown on the org's public profile page.
    """
    organization_id: uuid.UUID
    org_name: str
    total_campaigns: int
    total_money_raised: Decimal
    total_donors: int
    total_opportunities: int
    total_verified_volunteer_hours: Decimal
    total_volunteers_served: int
    as_of: datetime