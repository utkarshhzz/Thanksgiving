import asyncio, sys
sys.path.insert(0, 'F:/Thank_Giving/backend')

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.user import User

async def check():
    engine = create_async_engine(settings.DATABASE_URL)
    s = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)()
    r = await s.execute(select(User).where(User.email == 'unofficialutkarsh.06@gmail.com'))
    u = r.scalars().first()
    if u:
        print(f"FOUND: {u.email} | type={u.user_type} | active={u.is_active} | oauth={u.oauth_provider}")
    else:
        print("NOT FOUND - user does not exist yet")
    await engine.dispose()

asyncio.run(check())
