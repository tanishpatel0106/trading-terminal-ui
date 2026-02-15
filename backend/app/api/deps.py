from uuid import UUID
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.session import TradingSession
from app.db.session import get_db_session
from app.services.broadcaster import Broadcaster
from app.services.exchange_runtime import ExchangeRuntime

broadcaster = Broadcaster()
runtimes: dict[str, ExchangeRuntime] = {}


def get_broadcaster() -> Broadcaster:
    return broadcaster


def get_runtime(session_id: UUID, br: Broadcaster = Depends(get_broadcaster)) -> ExchangeRuntime:
    sid = str(session_id)
    if sid not in runtimes:
        runtimes[sid] = ExchangeRuntime(session_id=session_id, broadcaster=br)
    return runtimes[sid]


async def get_session_or_404(session_id: UUID, db: AsyncSession = Depends(get_db_session)) -> TradingSession:
    session = await db.get(TradingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="session not found")
    return session
