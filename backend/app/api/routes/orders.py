from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_runtime
from app.db.models.order import OrderRecord
from app.db.session import get_db_session
from app.schemas.order import OrderCreate, OrderModify, OrderRead, OrderSubmitResponse
from app.schemas.trade import TradeRead
from app.services.exchange_runtime import ExchangeRuntime
from app.services.persistence import PersistenceService

router = APIRouter(prefix="/sessions/{session_id}", tags=["orders"])


@router.post("/orders", response_model=OrderSubmitResponse)
async def place_order(session_id: UUID, payload: OrderCreate, db: AsyncSession = Depends(get_db_session), runtime: ExchangeRuntime = Depends(get_runtime)) -> OrderSubmitResponse:
    persistence = PersistenceService(db)
    order = await runtime.place_order(persistence, payload.user_id, payload.type, payload.side, payload.qty, payload.price, payload.tif, payload.ttl_seconds)
    return OrderSubmitResponse(order_id=order.id, status=order.status)


@router.post("/orders/{order_id}/cancel", response_model=OrderRead)
async def cancel_order(session_id: UUID, order_id: UUID, db: AsyncSession = Depends(get_db_session), runtime: ExchangeRuntime = Depends(get_runtime)) -> OrderRead:
    persistence = PersistenceService(db)
    order = await persistence.get_order(order_id)
    if not order or order.session_id != session_id:
        raise HTTPException(status_code=404, detail="order not found")
    updated = await runtime.cancel_order(persistence, order)
    return OrderRead.model_validate(updated)


@router.post("/orders/{order_id}/modify", response_model=OrderSubmitResponse)
async def modify_order(session_id: UUID, order_id: UUID, payload: OrderModify, db: AsyncSession = Depends(get_db_session), runtime: ExchangeRuntime = Depends(get_runtime)) -> OrderSubmitResponse:
    persistence = PersistenceService(db)
    order = await persistence.get_order(order_id)
    if not order or order.session_id != session_id:
        raise HTTPException(status_code=404, detail="order not found")
    new_order = await runtime.modify_order(persistence, order, payload.price, payload.qty)
    return OrderSubmitResponse(order_id=new_order.id, status=new_order.status)


@router.get("/book")
async def get_book(session_id: UUID, snap: str = Query(default="topN"), levels: int = Query(default=20, ge=1, le=200), runtime: ExchangeRuntime = Depends(get_runtime)) -> dict:
    return await runtime.get_snapshot(levels=levels)


@router.get("/trades", response_model=list[TradeRead])
async def get_trades(session_id: UUID, limit: int = Query(default=200, ge=1, le=1000), db: AsyncSession = Depends(get_db_session)) -> list[TradeRead]:
    persistence = PersistenceService(db)
    return [TradeRead.model_validate(t) for t in await persistence.list_trades(session_id, limit)]


@router.get("/orders", response_model=list[OrderRead])
async def get_orders(session_id: UUID, user_id: str | None = None, limit: int = Query(default=200, ge=1, le=1000), db: AsyncSession = Depends(get_db_session)) -> list[OrderRead]:
    persistence = PersistenceService(db)
    return [OrderRead.model_validate(o) for o in await persistence.list_orders(session_id, user_id, limit)]
