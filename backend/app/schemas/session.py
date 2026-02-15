from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.db.models.session import SessionMode, SessionStatus


class SessionCreate(BaseModel):
    mode: SessionMode
    symbol: str


class SessionOut(BaseModel):
    id: UUID
    mode: SessionMode
    symbol: str
    status: SessionStatus
    replay_speed: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReplaySpeedUpdate(BaseModel):
    speed: float
