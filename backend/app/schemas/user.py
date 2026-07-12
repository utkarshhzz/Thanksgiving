# Pydantic schemas for user related API operations
"""SCHEMA HIERARCHY:
  UserBase        → Shared fields used across multiple schemas
    ├── UserCreate → POST /auth/register (input)
    ├── UserUpdate → PATCH /users/me    (input, all optional)
    └── UserRead   → All responses      (output, no password)
    """
    
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from app.models.user import UserType

# Base schema shared fields 

class UserBase(BaseModel):
    email:EmailStr
    first_name:Optional[str]=Field(None,max_length=100)
    last_name:Optional[str]=Field(None,max_length=100)
    phone:Optional[str]=Field(None,max_length=20)
    bio:Optional[str]=Field(None,max_length=255)
    user_type:UserType=UserType.INDIVIDUAL
    
    
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator('user_type', mode='before')
    @classmethod
    def block_admin_self_register(cls, v):
        """
        Security: nobody can self-register as ADMIN.
        If someone calls POST /auth/register with user_type="admin"
        directly via Swagger or a script, we silently downgrade it to INDIVIDUAL.
        Admin can ONLY be set via the make_admin.py script or /admin/users/{id}/make-admin.
        """
        if str(v).lower() == 'admin':
            return UserType.INDIVIDUAL
        return v

    
# Update schema used when updating 
class UserUpdate(BaseModel):
    first_name:Optional[str]=Field(None,max_length=100)
    last_name:Optional[str]=Field(None,max_length=100)
    phone:Optional[str]=Field(None,max_length=20)
    bio:Optional[str]=Field(None,max_length=255)
    
    
class UserRead(UserBase):
    id:uuid.UUID
    is_active:bool
    is_verified:bool
    created_at: datetime
    updated_at: datetime
    model_config=ConfigDict(from_attributes=True)
    
    
class UserBrief(BaseModel):
    id: uuid.UUID
    first_name: Optional[str]
    last_name: Optional[str]
    user_type: UserType
    model_config = ConfigDict(from_attributes=True)


