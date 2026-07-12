# Central router — collects all sub-routers.
# Every new router gets added here with include_router().

from fastapi import APIRouter

from app.api.v1.routers.auth import router as auth_router
from app.api.v1.routers.campaigns import router as campaigns_router
from app.api.v1.routers.donations import router as donations_router
from app.api.v1.routers.opportunities import router as opportunities_router
from app.api.v1.routers.applications import router as applications_router
from app.api.v1.routers.hours import router as hours_router
from app.api.v1.routers.impact import router as impact_router
from app.api.v1.routers.in_kind import router as in_kind_router
from app.api.v1.routers.organizations import router as organizations_router
from app.api.v1.routers.spaces import router as spaces_router
from app.api.v1.routers.users import router_me as users_me_router
from app.api.v1.routers.admin import router as admin_router
from app.api.v1.routers.ai import router as ai_router
from app.api.v1.routers.updates import router as updates_router
from app.api.v1.routers.leaderboard import router as leaderboard_router
from app.api.v1.routers.badges import router as badges_router
from app.api.v1.routers.receipts import router as receipts_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(campaigns_router)
api_router.include_router(donations_router)
api_router.include_router(opportunities_router)
api_router.include_router(applications_router)
api_router.include_router(hours_router)
api_router.include_router(impact_router)
api_router.include_router(in_kind_router)
api_router.include_router(organizations_router)
api_router.include_router(spaces_router)
api_router.include_router(users_me_router)   # /users/me, /users/me/donations, /users/me/avatar
api_router.include_router(admin_router)       # /admin/stats, /admin/users, etc.
api_router.include_router(ai_router)          # /ai/campaigns/improve, /ai/users/me/impact
api_router.include_router(updates_router)     # /campaigns/{id}/updates
api_router.include_router(leaderboard_router) # /leaderboard/donors, /leaderboard/volunteers
api_router.include_router(badges_router)      # /users/me/badges, /users/{id}/badges
api_router.include_router(receipts_router)    # /donations/{id}/receipt
