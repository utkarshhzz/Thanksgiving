# arcgitecture
"""
One test database (thangiving_test_db)
Tables create once at session satrt and dropped at sesion end
each test gets a transaction rolls backa fter the test
->tests are isolated from each otehr
-> No manual cleaning needed

"""

import pytest_asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient,ASGITransport
from sqlalchemy.ext.asyncio import (
    create_async_engine,async_sessionmaker, AsyncSession
)

from app.main import app
from app.core.config import settings
from app.core.deps import get_db
from app.db.base import Base
from app.models.user import User, UserType
from app.models.organization import Organization, OrgType, VerificationStatus
from app.core.security import hash_password

# test database engine
# Uses settings.DATABSE url which now points to tnakgivng test db

test_engine=create_async_engine(settings.DATABASE_URL,echo=False)

TestSessionLocal=async_sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)

# Create and drop tables once per test session
@pytest_asyncio.fixture(scope="session",autouse=True)
async def create_tables():
    # Runs once for entire test sesions-> create all tables before tests startt
    # and drop after tests finish 

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await test_engine.dispose()

# Per test transaction isolation
@pytest_asyncio.fixture
async def db() -> AsyncSession:
    # Yileds a databse session wraped in a transaction
    # The transaction rools back afte each test -> no data persists bw test
    async with test_engine.connect() as conn:
        await conn.begin()
        async_session=AsyncSession(bind=conn,expire_on_commit=False)
        try:
            yield async_session
        finally:
            await async_session.close()
            await conn.rollback()

# overriding fast api's get_db woth test db
@pytest_asyncio.fixture
async def client(db:AsyncSession) -> AsyncClient:
    # Create an async client that talks toi fastapi app
    async def overide_get_db():
        yield db

    app.dependency_overrides[get_db]= overide_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()

# reusable test data fixtures
@pytest_asyncio.fixture
async def test_user(db:AsyncSession)-> User:
    # A standard user pre created for tests
    user=User(
         email="testuser@example.com",
        password_hash=hash_password("testpassword123"),
        first_name="Test",
        last_name="User",
        user_type=UserType.INDIVIDUAL,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user

@pytest_asyncio.fixture
async def test_org_user(db:AsyncSession)-> User:
    # user with organizxzation type so he can create campaigns and opportunities
    user = User(
        email="orguser@example.com",
        password_hash=hash_password("testpassword123"),
        first_name="Org",
        last_name="Owner",
        user_type=UserType.ORGANIZATION,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user

@pytest_asyncio.fixture
async def test_org(db:AsyncSession,test_org_user:User) ->Organization:
    # a verified organization owned by test_org_user
    org=Organization(
        owner_id=test_org_user.id,
        name="Test Nonprofit",
        org_type=OrgType.NONPROFIT,
        description="A test organization",
        verification_status=VerificationStatus.VERIFIED,
        is_active=True,
    )
    db.add(org)
    await db.flush()
    await db.refresh(org)
    return org

@pytest_asyncio.fixture
async def user_token(client:AsyncClient,test_user:User)->str:
    # returns valid  jwt acces token for test_user
    response=await client.post("/api/v1/auth/login",json={
         "email": "testuser@example.com",
        "password": "testpassword123",
    })
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def org_token(client: AsyncClient, test_org_user: User) -> str:
    """Returns a valid JWT token for the org owner user."""
    response = await client.post("/api/v1/auth/login", json={
        "email": "orguser@example.com",
        "password": "testpassword123",
    })
    return response.json()["access_token"]