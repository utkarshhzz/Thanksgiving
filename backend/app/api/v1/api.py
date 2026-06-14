# centraa router tht colects al sub routers
# Every new router we create gets added here with include_router().

from fastapi import APIRouter

from app.api.v1.routers.auth import  router as auth_router
from app.api.v1.routers.campaigns import router as campaigns_router

api_router=APIRouter()

api_router.include_router(auth_router)
api_router.include_router(campaigns_router)