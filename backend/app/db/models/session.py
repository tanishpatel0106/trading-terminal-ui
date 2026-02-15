import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SessionMode(str, enum.Enum):
    LIVE = "LIVE"
    HISTORICAL_REPLAY = "HISTORICAL_REPLAY"
    LP_REPLAY = "LP_REPLAY"


class SessionStatus(str, enum.Enum):
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    STOPPED = "STOPPED"


class TradingSession(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mode: Mapped[SessionMode] = mapped_column(Enum(SessionMode), nullable=False)
    symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus), nullable=False, default=SessionStatus.PAUSED)
    replay_speed: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
