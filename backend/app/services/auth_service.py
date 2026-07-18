# Business logic for user registration and authentication

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import hash_password, verify_password
from app.models.user import User, UserType
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


def _get_admin_emails() -> set[str]:
    """
    Read the GOOGLE_ADMIN_EMAILS setting and return a set of lowercased emails.
    These emails are automatically given UserType.ADMIN when they sign in with Google.
    """
    from app.core.config import settings
    return {
        e.strip().lower()
        for e in settings.GOOGLE_ADMIN_EMAILS.split(",")
        if e.strip()
    }


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
      1. Look up by oauth_id  → fastest path for returning users
      2. If not found, check if email exists → link Google to that account
      3. If brand new → create account (no password, is_verified=True)

    Admin auto-promotion:
      If the email is listed in GOOGLE_ADMIN_EMAILS inside backend/.env,
      that user is automatically set to UserType.ADMIN on every Google login.

    How to configure (in backend/.env):
      GOOGLE_ADMIN_EMAILS=your@gmail.com,partner@gmail.com
    """
    admin_emails = _get_admin_emails()
    is_admin     = email.lower() in admin_emails

    # ── 1. Returning Google user ──────────────────────────────────────────────
    user = await get_user_by_oauth_id(db, "google", google_id)
    if user:
        # Re-apply admin role every login (so removing from list also removes role)
        if is_admin and user.user_type != UserType.ADMIN:
            user.user_type  = UserType.ADMIN
            user.is_verified = True
            await db.flush()
        return user

    # ── 2. Email already registered (link Google to existing account) ─────────
    user = await get_user_by_email(db, email)
    if user:
        user.oauth_provider = "google"
        user.oauth_id       = google_id
        user.is_verified    = True
        if is_admin:
            user.user_type = UserType.ADMIN
        await db.flush()
        await db.refresh(user)
        return user

    # ── 3. Brand-new user ─────────────────────────────────────────────────────
    new_user = User(
        email=email,
        password_hash=None,
        first_name=first_name,
        last_name=last_name,
        oauth_provider="google",
        oauth_id=google_id,
        is_verified=True,
        user_type=UserType.ADMIN if is_admin else UserType.INDIVIDUAL,
    )
    db.add(new_user)
    await db.flush()
    await db.refresh(new_user)
    return new_user