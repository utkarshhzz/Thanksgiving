"""add_oauth_fields_to_user

Revision ID: a1b2c3d4e5f6
Revises: 10f59aebb15d
Create Date: 2026-07-06

Adds oauth_provider, oauth_id to users table and makes password_hash nullable
so users can sign in via Google without a password.
"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '10f59aebb15d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make password_hash nullable (for OAuth users who have no password)
    op.alter_column('users', 'password_hash',
                    existing_type=sa.String(255),
                    nullable=True)

    # Add OAuth provider + unique ID columns
    op.add_column('users', sa.Column('oauth_provider', sa.String(50), nullable=True))
    op.add_column('users', sa.Column('oauth_id', sa.String(255), nullable=True))

    # Index for fast lookups by (provider, id) pair
    op.create_index('ix_users_oauth_id', 'users', ['oauth_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_users_oauth_id', table_name='users')
    op.drop_column('users', 'oauth_id')
    op.drop_column('users', 'oauth_provider')

    # Revert to not-nullable (will fail if any null rows exist)
    op.alter_column('users', 'password_hash',
                    existing_type=sa.String(255),
                    nullable=False)
