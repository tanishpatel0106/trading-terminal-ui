import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TradeRecord(Base):
    __tablename__ = "trades"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("sessions.id"), nullable=False, index=True)
    taker_order_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    maker_order_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(20, 4), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    side: Mapped[str] = mapped_column(String(1), nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
