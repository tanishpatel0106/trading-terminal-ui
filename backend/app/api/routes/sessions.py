from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import runtime_manager
from app.db.models.session import SessionStatus, TradingSession
from app.db.session import get_db
from app.schemas.session import ReplaySpeedUpdate, SessionCreate, SessionOut

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionOut)
async def create_session(payload: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = TradingSession(mode=payload.mode, symbol=payload.symbol, status=SessionStatus.PAUSED)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    runtime_manager.get_or_create(session.id, session.symbol)
    return session


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(session_id: UUID, db: AsyncSession = Depends(get_db)):
    session = await db.get(TradingSession, session_id)
    if not session:
        raise HTTPException(404, "session not found")
    return session


async def _set_status(session_id: UUID, status: SessionStatus, db: AsyncSession):
    session = await db.get(TradingSession, session_id)
    if not session:
        raise HTTPException(404, "session not found")
    session.status = status
    await db.commit()
    return {"status": status}


@router.post("/{session_id}/start")
async def start_session(session_id: UUID, db: AsyncSession = Depends(get_db)):
    return await _set_status(session_id, SessionStatus.RUNNING, db)


@router.post("/{session_id}/pause")
async def pause_session(session_id: UUID, db: AsyncSession = Depends(get_db)):
    return await _set_status(session_id, SessionStatus.PAUSED, db)


@router.post("/{session_id}/stop")
async def stop_session(session_id: UUID, db: AsyncSession = Depends(get_db)):
    return await _set_status(session_id, SessionStatus.STOPPED, db)


@router.post("/{session_id}/replay/speed")
async def set_replay_speed(session_id: UUID, payload: ReplaySpeedUpdate, db: AsyncSession = Depends(get_db)):
    session = await db.get(TradingSession, session_id)
    if not session:
        raise HTTPException(404, "session not found")
    session.replay_speed = payload.speed
    await db.commit()
    return {"speed": payload.speed}
