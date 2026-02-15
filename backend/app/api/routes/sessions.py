from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_runtime, get_session_or_404
from app.db.models.session import SessionStatus, TradingSession
from app.db.session import get_db_session
from app.schemas.session import SessionCreate, SessionRead, SessionSpeedUpdate

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=dict)
async def create_session(payload: SessionCreate, db: AsyncSession = Depends(get_db_session)) -> dict:
    session = TradingSession(mode=payload.mode, symbol=payload.symbol, status=SessionStatus.PAUSED, replay_speed=1.0)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"session_id": session.id}


@router.get("/{session_id}", response_model=SessionRead)
async def get_session(session: TradingSession = Depends(get_session_or_404)) -> SessionRead:
    return SessionRead.model_validate(session)


@router.post("/{session_id}/start", response_model=SessionRead)
async def start_session(session: TradingSession = Depends(get_session_or_404), db: AsyncSession = Depends(get_db_session)) -> SessionRead:
    session.status = SessionStatus.RUNNING
    session.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    return SessionRead.model_validate(session)


@router.post("/{session_id}/pause", response_model=SessionRead)
async def pause_session(session: TradingSession = Depends(get_session_or_404), db: AsyncSession = Depends(get_db_session)) -> SessionRead:
    session.status = SessionStatus.PAUSED
    session.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    return SessionRead.model_validate(session)


@router.post("/{session_id}/stop", response_model=SessionRead)
async def stop_session(session: TradingSession = Depends(get_session_or_404), db: AsyncSession = Depends(get_db_session)) -> SessionRead:
    session.status = SessionStatus.STOPPED
    session.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    return SessionRead.model_validate(session)


@router.post("/{session_id}/replay/speed", response_model=SessionRead)
async def set_speed(payload: SessionSpeedUpdate, session: TradingSession = Depends(get_session_or_404), db: AsyncSession = Depends(get_db_session)) -> SessionRead:
    session.replay_speed = payload.speed
    session.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    return SessionRead.model_validate(session)
