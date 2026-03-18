"""Add expiry_notified field to transfers table

Revision ID: 20260318_expiry
Revises:
Create Date: 2026-03-18

"""
from alembic import op
import sqlalchemy as sa

revision = "20260318_expiry"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "transfers",
        sa.Column("expiry_notified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("transfers", "expiry_notified")
