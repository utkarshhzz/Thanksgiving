# dependency injection
# write here use at all endpoints


from typing import AsyncGenerator
from uuid import UUID
from fastapi import Depends,HTTPException,status
from fastapi.security import HTTPBearer,HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import AsyncSessionLocal
from app.models.user import User,UserType

bearer_schema=HTTPBearer(auto_error=False)
# This tells FastAPI to look for: Authorization: Bearer <token>

async def get_db() -> AsyncGenerator[AsyncSession,None]:
    # create a new session for each request and close it after the request is done
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# authentication dependency
async def get_current_user(
    credentials:HTTPAuthorizationCredentials | None=Depends(bearer_schema),
    db: AsyncSession=Depends(get_db),
)-> User:
    """ 
    Decode the jwt token and return authenticated user from db
    this dependency extracts bearer token from authorisation header 
    decodes an dvalidates it 
    fetcheds user and returns user object
    """
    credentials_exception= HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate exeption"
        headers={"WWW-Authenticate":"Bearer"},
        # WWW- Authenticate header is required by HTTP spec for 401 responses

    )
    if credentials is None:
        raise credentials_exception

    user_id_str=decode_access_token(credentials.credentials)

    if user_id_str is None:
        raise credentials_exception

    # fetchung original user from database
    try:
        user_id=UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    user= await db.get(User,user_id)

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user:User=Depends(get_current_user),
)-> User:
    """
    Extends get_current_user by also checking that the account is active.
    Use this instead of get_current_user for all normal protected endpoints.
    get_current_user is kept separate so admin endpoints can access
    inactive accounts when needed (e.g., to reactivate them).
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )
    return current_user

    