import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OrderSide(str, enum.Enum):
    B = "B"
    S = "S"


class OrderType(str, enum.Enum):
    LIMIT = "LIMIT"
    MARKET = "MARKET"


class OrderStatus(str, enum.Enum):
    NEW = "NEW"
    ACK = "ACK"
    LIVE = "LIVE"
    PARTIAL = "PARTIAL"
    FILLED = "FILLED"
    CANCELED = "CANCELED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class TimeInForce(str, enum.Enum):
    DAY = "DAY"
    IOC = "IOC"
    FOK = "FOK"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    client_order_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    side: Mapped[OrderSide] = mapped_column(Enum(OrderSide), nullable=False)
    type: Mapped[OrderType] = mapped_column(Enum(OrderType), nullable=False)
    price: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    leaves_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), nullable=False, default=OrderStatus.NEW)
    tif: Mapped[TimeInForce | None] = mapped_column(Enum(TimeInForce), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
