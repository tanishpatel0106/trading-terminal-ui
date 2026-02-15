"""initial schema"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("mode", sa.Enum("LIVE", "HISTORICAL_REPLAY", "LP_REPLAY", name="sessionmode"), nullable=False),
        sa.Column("symbol", sa.String(length=32), nullable=False),
        sa.Column("status", sa.Enum("RUNNING", "PAUSED", "STOPPED", name="sessionstatus"), nullable=False),
        sa.Column("replay_speed", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(length=128), nullable=False),
        sa.Column("client_order_id", sa.String(length=128), nullable=True),
        sa.Column("side", sa.Enum("B", "S", name="orderside"), nullable=False),
        sa.Column("type", sa.Enum("LIMIT", "MARKET", name="ordertype"), nullable=False),
        sa.Column("price", sa.Numeric(18, 4), nullable=True),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("leaves_qty", sa.Integer(), nullable=False),
        sa.Column("status", sa.Enum("NEW", "ACK", "LIVE", "PARTIAL", "FILLED", "CANCELED", "REJECTED", "EXPIRED", name="orderstatus"), nullable=False),
        sa.Column("tif", sa.Enum("DAY", "IOC", "FOK", name="timeinforce"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "trades",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("taker_order_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("maker_order_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("price", sa.Numeric(18, 4), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("side", sa.String(length=1), nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "event_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table("event_logs")
    op.drop_table("trades")
    op.drop_table("orders")
    op.drop_table("sessions")
