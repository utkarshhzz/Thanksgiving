import uuid
from fastapi import APIRouter,Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db,get_current_active_user
from app.models.user import User
from app.schemas.application import ApplicationCreate,ApplicationRead,ApplicationStatusUpdate
from app.services.application_service import (
    apply_to_opportunity, review_application,
    get_my_applications, get_opportunity_applications,
)

router=APIRouter(tags=["Voluntewering- Applications"])

@router.post(
    "/opportunities/{opportunity_id}/apply",
    response_model=ApplicationRead,
    status_code=201,
    summary="Apply to a volunteer opportunity",
)
async def apply(
    opportunity_id:uuid.UUID,
    data:ApplicationCreate,
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user),
):
    return await apply_to_opportunity(db,opportunity_id,data,current_user)


@router.patch(
    "/applications/{application_id}/status",
    response_model=ApplicationRead,
    summary="Update appliation styatus -> aprove or reject or withdraw"
)
async def update_application_status(
    application_id:uuid.UUID,
    status_data:ApplicationStatusUpdate,
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user),
):
    return await review_application(db,application_id,status_data,current_user)


@router.get(
    "/applications/me",
    response_model=list[ApplicationRead],
    summary="get my applciation"
)
async def my_applications(
    db:AsyncSession=Depends(get_db),
    current_user:User=Depends(get_current_active_user)
):
    return await get_my_applications(db,current_user)


@router.get(
    "/opportunities/{opportunity_id}/applications",
    response_model=list[ApplicationRead],
    summary="List all applications for an opportunity",
)
async def opportunity_applications(
    opportunity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await get_opportunity_applications(db, opportunity_id, current_user)