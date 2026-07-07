"""
One-time script to make a user an ADMIN.

Usage:
  # If user already exists in DB:
  python scripts/make_admin.py --email unofficialutkarsh.06@gmail.com

  # If user doesn't exist yet (will use Google OAuth to log in later):
  python scripts/make_admin.py --email unofficialutkarsh.06@gmail.com --google-only

The --google-only flag creates an account with NO password.
When the user logs in via Google OAuth, it auto-links to this pre-created account.
"""
import asyncio
import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.models.user import User, UserType
from app.core.security import hash_password


async def make_admin(email: str, google_only: bool = False):
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        if user:
            # User already exists — just promote them
            old_type = user.user_type
            user.user_type = UserType.ADMIN
            user.is_active = True
            await session.commit()
            print(f"✅ {email} promoted from {old_type} → ADMIN")
            print(f"   They can now access /admin after logging in.")

        else:
            if google_only:
                # Create passwordless admin — they will log in via Google OAuth
                new_user = User(
                    email=email,
                    password_hash=None,     # No password — Google OAuth only
                    user_type=UserType.ADMIN,
                    is_active=True,
                    is_verified=True,       # Google will verify the email
                    first_name="Admin",
                    last_name="",
                )
                session.add(new_user)
                await session.commit()
                print(f"✅ Created ADMIN account for {email} (Google OAuth only, no password)")
                print(f"   → Now just click 'Continue with Google' at /login")
                print(f"   → The system will link your Google account automatically")
                print(f"   → You'll have full admin access at /admin")
            else:
                password = input(f"User {email} not found. Enter a password (or Ctrl+C to cancel): ")
                new_user = User(
                    email=email,
                    password_hash=hash_password(password),
                    user_type=UserType.ADMIN,
                    is_active=True,
                    is_verified=True,
                    first_name="Admin",
                    last_name="",
                )
                session.add(new_user)
                await session.commit()
                print(f"✅ Created ADMIN user: {email}")

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True, help="Your email address")
    parser.add_argument(
        "--google-only",
        action="store_true",
        help="Create account without password (you will log in via Google OAuth)",
    )
    args = parser.parse_args()
    asyncio.run(make_admin(args.email, args.google_only))
