from uuid import UUID
from fastapi import APIRouter, Depends, Query

from app.api.deps import get_replay_session
from app.services.replay_service import ReplaySession

router = APIRouter(prefix="/sessions/{session_id}", tags=["book"])


@router.get("/book")
async def get_book(session_id: UUID, levels: int = Query(default=20, ge=1, le=200), replay: ReplaySession = Depends(get_replay_session)) -> dict:
    return await replay.get_snapshot(levels=levels)
