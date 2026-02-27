from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_broadcaster, get_replay_session, get_session_or_404
from app.db.models.session import SessionMode, SessionStatus, TradingSession
from app.db.session import get_db_session
from app.schemas.session import SessionCreate, SessionRead, SessionSpeedUpdate
from app.services.broadcaster import Broadcaster
from app.services.replay_service import ReplaySession, get_available_stocks, replay_sessions

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/stocks")
async def list_stocks() -> list[dict]:
    """List available stock scripts for replay."""
    stocks = get_available_stocks()
    return [{"ticker": s["ticker"], "date": s["date"], "total_events": s["total_events"]} for s in stocks]


@router.post("", response_model=dict)
async def create_session(payload: SessionCreate, db: AsyncSession = Depends(get_db_session), br: Broadcaster = Depends(get_broadcaster)) -> dict:
    session = TradingSession(mode=SessionMode.HISTORICAL_REPLAY, symbol=payload.symbol, status=SessionStatus.PAUSED, replay_speed=1.0)
    db.add(session)
    await db.commit()
    await db.refresh(session)

    replay = ReplaySession(session_id=session.id, ticker=payload.symbol, broadcaster=br)
    replay_sessions[str(session.id)] = replay

    return {"session_id": session.id}


@router.get("/{session_id}", response_model=SessionRead)
async def get_session(session: TradingSession = Depends(get_session_or_404)) -> SessionRead:
    return SessionRead.model_validate(session)


@router.post("/{session_id}/start", response_model=SessionRead)
async def start_session(session: TradingSession = Depends(get_session_or_404), db: AsyncSession = Depends(get_db_session), replay: ReplaySession = Depends(get_replay_session)) -> SessionRead:
    session.status = SessionStatus.RUNNING
    session.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    replay.start()
    return SessionRead.model_validate(session)


@router.post("/{session_id}/pause", response_model=SessionRead)
async def pause_session(session: TradingSession = Depends(get_session_or_404), db: AsyncSession = Depends(get_db_session), replay: ReplaySession = Depends(get_replay_session)) -> SessionRead:
    session.status = SessionStatus.PAUSED
    session.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    replay.pause()
    return SessionRead.model_validate(session)


@router.post("/{session_id}/stop", response_model=SessionRead)
async def stop_session(session: TradingSession = Depends(get_session_or_404), db: AsyncSession = Depends(get_db_session), replay: ReplaySession = Depends(get_replay_session)) -> SessionRead:
    session.status = SessionStatus.STOPPED
    session.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    replay.stop()
    return SessionRead.model_validate(session)


@router.post("/{session_id}/replay/speed", response_model=SessionRead)
async def set_speed(payload: SessionSpeedUpdate, session: TradingSession = Depends(get_session_or_404), db: AsyncSession = Depends(get_db_session), replay: ReplaySession = Depends(get_replay_session)) -> SessionRead:
    session.replay_speed = payload.speed
    session.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    replay.speed = payload.speed
    return SessionRead.model_validate(session)


@router.get("/{session_id}/replay/progress")
async def get_progress(session_id: UUID, replay: ReplaySession = Depends(get_replay_session)) -> dict:
    return replay.progress
