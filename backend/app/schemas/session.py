from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from app.db.models.session import SessionMode, SessionStatus


class SessionCreate(BaseModel):
    mode: SessionMode
    symbol: str = Field(min_length=1, max_length=32)


class SessionSpeedUpdate(BaseModel):
    speed: float = Field(gt=0)


class SessionRead(BaseModel):
    id: UUID
    mode: SessionMode
    symbol: str
    status: SessionStatus
    replay_speed: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
