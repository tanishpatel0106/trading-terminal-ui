from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import persistence_service, runtime_manager
from app.db.models.session import TradingSession
from app.db.session import get_db
from app.schemas.order import OrderCreate, OrderModify, PlaceOrderResponse

router = APIRouter(prefix="/sessions/{session_id}", tags=["orders"])


async def _runtime(session_id: UUID, db: AsyncSession):
    session = await db.get(TradingSession, session_id)
    if not session:
        raise HTTPException(404, "session not found")
    return runtime_manager.get_or_create(session.id, session.symbol)


@router.post("/orders", response_model=PlaceOrderResponse)
async def place_order(session_id: UUID, payload: OrderCreate, db: AsyncSession = Depends(get_db)):
    runtime = await _runtime(session_id, db)
    order = await runtime_manager.place_order(db, runtime, payload.model_dump())
    return PlaceOrderResponse(order_id=order.id, status=order.status)


@router.post("/orders/{order_id}/cancel")
async def cancel_order(session_id: UUID, order_id: UUID, db: AsyncSession = Depends(get_db)):
    runtime = await _runtime(session_id, db)
    await runtime_manager.cancel_order(db, runtime, order_id)
    return {"order_id": str(order_id), "status": "CANCELED"}


@router.post("/orders/{order_id}/modify")
async def modify_order(session_id: UUID, order_id: UUID, payload: OrderModify, db: AsyncSession = Depends(get_db)):
    runtime = await _runtime(session_id, db)
    await runtime_manager.modify_order(db, runtime, order_id, payload.price, payload.qty)
    return {"order_id": str(order_id), "status": "MODIFIED"}


@router.get("/book")
async def get_book(session_id: UUID, levels: int = Query(20), db: AsyncSession = Depends(get_db)):
    runtime = await _runtime(session_id, db)
    return await runtime_manager.get_snapshot(runtime, levels)


@router.get("/trades")
async def list_trades(session_id: UUID, limit: int = Query(200), db: AsyncSession = Depends(get_db)):
    return await persistence_service.list_trades(db, session_id, limit)


@router.get("/orders")
async def list_orders(session_id: UUID, user_id: str | None = None, limit: int = Query(200), db: AsyncSession = Depends(get_db)):
    return await persistence_service.list_orders(db, session_id, user_id, limit)
