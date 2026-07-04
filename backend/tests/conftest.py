# arcgitecture
"""
One test database (thangiving_test_db)
Tables create once at session satrt and dropped at sesion end
each test gets a transaction rolls backa fter the test
->tests are isolated from each otehr
-> No manual cleaning needed

"""
from pathlib import Path
from dotenv import load_dotenv

_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=_backend_dir / ".env.test", override=True)
import pytest_asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient,ASGITransport
from sqlalchemy.ext.asyncio import (
    create_async_engine,async_sessionmaker, AsyncSession
)
from sqlalchemy.pool import NullPool    

from app.main import app
from app.core.config import settings
from app.core.deps import get_db
from app.db.base import Base
from app.models.user import User, UserType
from app.models.organization import Organization, OrgType, VerificationStatus
from app.core.security import hash_password

# test database engine
# Uses settings.DATABSE url which now points to tnakgivng test db

test_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    poolclass=NullPool,
)

TestSessionLocal=async_sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)

# Create and drop tables once per test session (SYNCHRONOUS on purpose)
@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """
    Synchronous session fixture that creates tables before tests, drops after.

    WHY synchronous instead of async?
    Each test function gets its own event loop (function scope). A session-scoped
    ASYNC fixture would need a session-scoped loop — but then test functions run
    on a different loop → 'Future attached to different loop' from asyncpg.

    asyncio.run() creates a private, short-lived loop just for setup/teardown.
    The setup loop is destroyed immediately after. Every test then gets its OWN
    clean event loop with no shared state from previous connections.
    """
    import asyncio

    async def _create():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def _drop():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await test_engine.dispose()

    asyncio.run(_create())
    yield
    asyncio.run(_drop())

# Per-test DB session — fresh connection, rolls back after each test
@pytest_asyncio.fixture
async def db() -> AsyncSession:
    """
    Yields a fresh DB session for each test. Rolls back all changes at the end.

    WHY no savepoints?
    join_transaction_mode='create_savepoint' caused 'another operation is in
    progress' errors when DB operations failed (e.g. flush errors in services).
    SQLAlchemy tried to ROLLBACK TO SAVEPOINT while asyncpg was mid-operation.

    Simpler approach: NullPool (on test_engine) gives each test a brand-new
    asyncpg connection on its own event loop. session.rollback() at the end
    undoes all test data cleanly. No savepoints, no conflicts.
    """
    async with AsyncSession(test_engine, expire_on_commit=False) as session:
        yield session
        await session.rollback()

# overriding fastapi's get_db with test db and skipping production lifespan
@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncClient:
    """
    Async HTTP client connected to the test FastAPI app.

    Two overrides:
    1. get_db → test db session (rolls back after each test, no real data)
    2. lifespan → no-op (skips production engine startup which would cause
       asyncpg 'Future attached to a different loop' errors)
    """
    from contextlib import asynccontextmanager

    async def override_get_db():
        yield db

    @asynccontextmanager
    async def noop_lifespan(app):
        yield  # Skip production DB setup — test fixtures handle tables

    app.dependency_overrides[get_db] = override_get_db
    original_lifespan = app.router.lifespan_context
    app.router.lifespan_context = noop_lifespan

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.router.lifespan_context = original_lifespan
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