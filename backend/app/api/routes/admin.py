from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import replay_service
from app.db.models.event import EventLog
from app.db.models.order import Order
from app.db.models.trade import Trade
from app.db.session import get_db

router = APIRouter(prefix="/sessions/{session_id}", tags=["admin"])


@router.post("/reset")
async def reset_session(session_id: UUID, db: AsyncSession = Depends(get_db)):
    for model in (EventLog, Trade, Order):
        await db.execute(delete(model).where(model.session_id == session_id))
    await db.commit()
    return {"status": "reset"}


@router.post("/load_lobster")
async def load_lobster(session_id: UUID):
    try:
        await replay_service.load_lobster(session_id=session_id)
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    return {"status": "loaded"}
