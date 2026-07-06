# Business logic for user registration and authentication

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()


async def get_user_by_oauth_id(db: AsyncSession, oauth_provider: str, oauth_id: str) -> User | None:
    result = await db.execute(
        select(User).where(User.oauth_provider == oauth_provider, User.oauth_id == oauth_id)
    )
    return result.scalars().first()


async def register_user(db: AsyncSession, user_data: UserCreate) -> User:
    """Create a new user account with email/password."""
    existing_user = await get_user_by_email(db, user_data.email)
    if existing_user:
        raise ValueError("This email is already registered.")

    hashed = hash_password(user_data.password)

    new_user = User(
        email=user_data.email,
        password_hash=hashed,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        bio=user_data.bio,
        user_type=user_data.user_type,
    )

    db.add(new_user)
    await db.flush()
    await db.refresh(new_user)
    return new_user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email(db, email)
    if user is None:
        return None
    if user.password_hash is None:
        # OAuth user — cannot log in with password
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


async def get_or_create_google_user(
    db: AsyncSession,
    google_id: str,
    email: str,
    first_name: str,
    last_name: str,
) -> User:
    """
    Find or create a user based on their Google account.
    Flow:
      1. Look up by oauth_id (returning Google user)
      2. If not found, check if email exists (user registered with email before)
         → link Google to that account
      3. If brand new → create account (no password, is_verified=True since Google verified)
    """
    # Check by Google ID first (fastest path for returning users)
    user = await get_user_by_oauth_id(db, "google", google_id)
    if user:
        return user

    # Check if email already registered
    user = await get_user_by_email(db, email)
    if user:
        # Link Google to existing email account
        user.oauth_provider = "google"
        user.oauth_id = google_id
        user.is_verified = True
        await db.flush()
        await db.refresh(user)
        return user

    # Brand new user — create from Google profile
    from app.models.user import UserType
    new_user = User(
        email=email,
        password_hash=None,       # No password for OAuth users
        first_name=first_name,
        last_name=last_name,
        oauth_provider="google",
        oauth_id=google_id,
        is_verified=True,         # Google already verified the email
        user_type=UserType.INDIVIDUAL,
    )
    db.add(new_user)
    await db.flush()
    await db.refresh(new_user)
    return new_user

    