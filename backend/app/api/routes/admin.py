from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_runtime
from app.db.models.event import EventLog
from app.db.models.order import OrderRecord
from app.db.models.trade import TradeRecord
from app.db.session import get_db_session
from app.services.exchange_runtime import ExchangeRuntime
from app.services.replay_service import ReplayService

router = APIRouter(prefix="/sessions/{session_id}", tags=["admin"])


@router.post("/reset")
async def reset_session(session_id: UUID, db: AsyncSession = Depends(get_db_session), runtime: ExchangeRuntime = Depends(get_runtime)) -> dict:
    await db.execute(delete(OrderRecord).where(OrderRecord.session_id == session_id))
    await db.execute(delete(TradeRecord).where(TradeRecord.session_id == session_id))
    await db.execute(delete(EventLog).where(EventLog.session_id == session_id))
    await db.commit()
    runtime.order_book = runtime.order_book.__class__()
    return {"status": "reset"}


@router.post("/load_lobster")
async def load_lobster(session_id: UUID) -> dict:
    service = ReplayService()
    await service.load_lobster(str(session_id))
    return {"status": "loaded"}
