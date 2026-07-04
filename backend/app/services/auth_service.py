# Business logic for user registration and authentication

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import hash_password,verify_password
from app.models.user import User
from app.schemas.user import UserCreate

async def get_user_by_email(db:AsyncSession,email:str)-> User| None:
    # fetch user from database by email address
    # return user object if found,None if not found
    result= await db.execute(
        select(User).where(User.email ==  email)
    )
    return result.scalars().first()

async def register_user(db:AsyncSession,user_data:UserCreate) -> User:
    """ 
    Create a new user account
    Steps:
      1. Check if email already exists → raise ValueError if so
      2. Hash the plain-text password
      3. Create User object
      4. Add to DB session (staged, not yet committed)
      5. Flush to get the DB-generated id and timestamps
      6. Return the User object
    NOTE: We don't call db.commit() here.
    The commit happens in get_db() (in deps.py) after the request completes.
    This pattern means: if anything else in the request fails after this,
    the whole thing rolls back — atomicity.
    """
    # chekig for duplicate email
    existing_user=await get_user_by_email(db,user_data.email)
    if existing_user:
        raise ValueError("This email is already registered.")

    hashed=hash_password(user_data.password)

    # crete user moe instnce and pass all fields exept password
    new_user=User(
        email=user_data.email,
        password_hash=hashed,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        bio=user_data.bio,
        user_type=user_data.user_type,
    )

    db.add(new_user)
    await db.flush() # important: save to DB but keep transaction open
    await db.refresh(new_user)
    return new_user


async def authenticate_user(
    db:AsyncSession,
    email:str,
    password:str,
) -> User | None:
    # veriy creentils nd return the user if valid
    user= await get_user_by_email(db,email)
    if user is None:
        return None

    if not verify_password(password,user.password_hash):
        return None

    return user


    
    