"""initial

Revision ID: 0001_init
Revises:
Create Date: 2026-01-01 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("mode", sa.Enum("LIVE", "HISTORICAL_REPLAY", "LP_REPLAY", name="sessionmode"), nullable=False),
        sa.Column("symbol", sa.String(length=32), nullable=False),
        sa.Column("status", sa.Enum("RUNNING", "PAUSED", "STOPPED", name="sessionstatus"), nullable=False),
        sa.Column("replay_speed", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "orders",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.String(length=128), nullable=False),
        sa.Column("client_order_id", sa.String(length=128), nullable=True),
        sa.Column("side", sa.String(length=1), nullable=False),
        sa.Column("type", sa.Enum("LIMIT", "MARKET", name="ordertype"), nullable=False),
        sa.Column("price", sa.Numeric(20, 4), nullable=True),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("leaves_qty", sa.Integer(), nullable=False),
        sa.Column("status", sa.Enum("NEW", "ACK", "LIVE", "PARTIAL", "FILLED", "CANCELED", "REJECTED", "EXPIRED", name="orderstatus"), nullable=False),
        sa.Column("tif", sa.Enum("DAY", "IOC", "FOK", name="timeinforce"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_orders_session_id", "orders", ["session_id"])
    op.create_index("ix_orders_user_id", "orders", ["user_id"])

    op.create_table(
        "trades",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("taker_order_id", sa.Uuid(), nullable=True),
        sa.Column("maker_order_id", sa.Uuid(), nullable=True),
        sa.Column("price", sa.Numeric(20, 4), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("side", sa.String(length=1), nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trades_session_id", "trades", ["session_id"])

    op.create_table(
        "event_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_event_logs_session_id", "event_logs", ["session_id"])
    op.create_index("ix_event_logs_event_type", "event_logs", ["event_type"])


def downgrade() -> None:
    op.drop_index("ix_event_logs_event_type", table_name="event_logs")
    op.drop_index("ix_event_logs_session_id", table_name="event_logs")
    op.drop_table("event_logs")
    op.drop_index("ix_trades_session_id", table_name="trades")
    op.drop_table("trades")
    op.drop_index("ix_orders_user_id", table_name="orders")
    op.drop_index("ix_orders_session_id", table_name="orders")
    op.drop_table("orders")
    op.drop_table("sessions")
