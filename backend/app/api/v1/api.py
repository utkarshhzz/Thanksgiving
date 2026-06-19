# centraa router tht colects al sub routers
# Every new router we create gets added here with include_router().

from fastapi import APIRouter

from app.api.v1.routers.auth import  router as auth_router
from app.api.v1.routers.campaigns import router as campaigns_router
from app.api.v1.routers.donations import router as donations_router
from app.api.v1.routers.opportunities import router as opportunities_router
from app.api.v1.routers.applications import router as applications_router
from app.api.v1.routers.hours import router as hours_router
from app.api.v1.routers.impact import router as impact_router
from app.api.v1.routers.in_kind import router as in_kind_router


api_router=APIRouter()

api_router.include_router(auth_router)
api_router.include_router(campaigns_router)
api_router.include_router(donations_router)
api_router.include_router(opportunities_router)
api_router.include_router(applications_router)
api_router.include_router(hours_router)
api_router.include_router(impact_router)
api_router.include_router(in_kind_router)
