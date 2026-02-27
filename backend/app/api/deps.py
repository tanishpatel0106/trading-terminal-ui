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


async def get_replay_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    br: Broadcaster = Depends(get_broadcaster),
) -> ReplaySession:
    sid = str(session_id)
    replay = replay_sessions.get(sid)
    if replay:
        return replay

    session = await db.get(TradingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="session not found")

    replay = ReplaySession(session_id=session.id, ticker=session.symbol, broadcaster=br)
    replay.speed = session.replay_speed
    replay.is_stopped = session.status.value == "STOPPED"
    replay.is_running = session.status.value == "RUNNING"
    replay_sessions[sid] = replay
    return replay


async def get_session_or_404(session_id: UUID, db: AsyncSession = Depends(get_db_session)) -> TradingSession:
    session = await db.get(TradingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="session not found")
    return session
