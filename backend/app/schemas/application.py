import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel,Field,ConfigDict
from app.models.volunteering import ApplicationStatus

class ApplicationCreate(BaseModel):
    # what the volunteersends to apply
    # opportunity_id comes from the URL, volunteer_id from the auth token.
    cover_letter:Optional[str]=Field(None,max_length=2000)

class ApplicationRead(BaseModel):
    # full aplication details shown to volunter and org coordinator
    id:uuid.UUID
    opportunity_id:uuid.UUID
    volunteer_id:uuid.UUID
    status:ApplicationStatus
    cover_letter:Optional[str]
    coordinator_notes:Optional[str]
    created_at:datetime
    updated_at:datetime

    model_config=ConfigDict(
        from_attributes=True
    )

class ApplicationStatusUpdate(BaseModel):
    # only org coordinator can update status
    status:ApplicationStatus
    coordinator_notes:Optional[str]=Field(None,max_length=2000)
