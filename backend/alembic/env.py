"""
alembic/env.py
==============
Alembic environment configuration.

This file is run by Alembic when you execute any `alembic` command.
It is responsible for:
  1. Connecting Alembic to your database (via settings.DATABASE_URL)
  2. Pointing Alembic to your SQLAlchemy models (via Base.metadata)
  3. Running migrations in async mode (because we use asyncpg)
"""

import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from app.models.donation import Donation
from app.models.volunteering import HourLog  # already imports VolunteerOpportunity, VolunteerApplication
from alembic import context

from app.core.config import settings
from app.db.base import Base

# Import ALL models here so Alembic can "see" them when autogenerating.
# Even though we're not using them directly, the import registers them
# with Base.metadata — which is what Alembic reads.
# We will add imports here as we create each model:
from app.models.user import User
from app.models.organization import Organization
from app.models.crowdfunding import Campaign
from app.models.volunteering import VolunteerOpportunity, VolunteerApplication
from app.models.in_kind import InKindDonation


# ─── Alembic Config Object ───────────────────────────────────────────────────
config = context.config

# Set up Python logging from the alembic.ini [loggers] section
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ─── Target Metadata ─────────────────────────────────────────────────────────
# This is HOW Alembic knows what tables/columns exist in your models.
# It compares Base.metadata (your Python models) against the actual DB
# to figure out what SQL to generate.
target_metadata = Base.metadata

# ─── Override the DB URL from settings (not alembic.ini) ─────────────────────
# We replace "postgresql+asyncpg://" with "postgresql+asyncpg://" for async
# but Alembic's autogenerate needs the SYNC url for schema comparison.
# We handle this below in run_async_migrations().


def get_url() -> str:
    """
    Return the database URL from our Settings object.
    This is called at migration time, so it reads from .env automatically.
    """
    return settings.DATABASE_URL


# ─── Offline Migrations ───────────────────────────────────────────────────────
# "Offline" = generate SQL scripts without connecting to the DB.
# Useful for reviewing changes before applying them, or for DBAs.
def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


# ─── Online Migrations (Async) ────────────────────────────────────────────────
# "Online" = connect to the actual DB and run migrations.
# We need async because our engine uses asyncpg.
def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # compare_type=True tells autogenerate to detect column TYPE changes
        # e.g., if you change VARCHAR(100) to VARCHAR(255)
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Create an async engine and run migrations within an async context.
    Alembic itself is sync, but we wrap it in async to use asyncpg.
    """
    # Build a config dict for the async engine
    # We override "sqlalchemy.url" at runtime from our settings
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # No connection pooling for migrations
    )

    async with connectable.connect() as connection:
        # run_sync wraps the sync Alembic runner inside our async context
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online migrations — runs the async function."""
    asyncio.run(run_async_migrations())


# ─── Decide which mode to run ─────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
