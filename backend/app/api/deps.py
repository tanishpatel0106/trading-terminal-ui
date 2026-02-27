from uuid import UUID
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.session import TradingSession
from app.db.session import get_db_session
from app.services.broadcaster import Broadcaster
from app.services.replay_service import ReplaySession, replay_sessions

broadcaster = Broadcaster()


def get_broadcaster() -> Broadcaster:
    return broadcaster


def get_replay_session(session_id: UUID) -> ReplaySession:
    sid = str(session_id)
    if sid not in replay_sessions:
        raise HTTPException(status_code=404, detail="replay session not found")
    return replay_sessions[sid]


async def get_session_or_404(session_id: UUID, db: AsyncSession = Depends(get_db_session)) -> TradingSession:
    session = await db.get(TradingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="session not found")
    return session
