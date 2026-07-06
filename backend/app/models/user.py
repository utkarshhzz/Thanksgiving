import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import String,DateTime,Boolean,Enum,Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped,mapped_column
from sqlalchemy.sql import func

from app.db.base import Base

class UserType(str,PyEnum):
    INDIVIDUAL = "individual"
    ORGANIZATION = "organization"
    ADMIN = "admin"

class User(Base):
    __tablename__="users"
    
    id:Mapped[uuid.UUID]=mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    email:Mapped[str]=mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    
    password_hash: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True  # Null for Google OAuth users (no password)
    )
    # OAuth fields
    oauth_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # 'google'
    oauth_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)

    # Profile fields
    first_name:Mapped[str | None]=mapped_column(String(100),
                                                nullable=True)
    last_name:Mapped[str | None]=mapped_column(String(100),
                                                nullable=True)
    phone:Mapped[str | None]=mapped_column(String(20),nullable=True)
    bio:Mapped[str | None]=mapped_column(Text,nullable=True)
    
    # Role/Type
    
    user_type: Mapped[UserType] = mapped_column(
        Enum(UserType),
        default=UserType.INDIVIDUAL,
        nullable=False,
    )
    
    is_active:Mapped[bool]=mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    is_verified:Mapped[bool]=mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    
    # Datetime , we never manually set it db handles automatically
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, user_type={self.user_type})>"
     
     
    #  by using this repr this object appears when printed in logs debugger.
     
