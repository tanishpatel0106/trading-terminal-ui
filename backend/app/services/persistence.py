from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.event import EventLog
from app.db.models.order import Order, OrderStatus
from app.db.models.trade import Trade
from app.utils.time import utcnow


class PersistenceService:
    async def create_order(self, db: AsyncSession, order: Order) -> Order:
        db.add(order)
        await db.commit()
        await db.refresh(order)
        return order

    async def update_order_status(self, db: AsyncSession, order_id, status: OrderStatus, leaves_qty: int | None = None) -> None:
        order = await db.get(Order, order_id)
        if not order:
            return
        order.status = status
        if leaves_qty is not None:
            order.leaves_qty = leaves_qty
        order.updated_at = utcnow()
        await db.commit()

    async def create_trade(self, db: AsyncSession, trade: Trade) -> Trade:
        db.add(trade)
        await db.commit()
        await db.refresh(trade)
        return trade

    async def log_event(self, db: AsyncSession, session_id, event_type: str, payload: dict) -> None:
        db.add(EventLog(session_id=session_id, event_type=event_type, payload=payload, ts=utcnow()))
        await db.commit()

    async def list_trades(self, db: AsyncSession, session_id, limit: int):
        q = select(Trade).where(Trade.session_id == session_id).order_by(Trade.ts.desc()).limit(limit)
        return (await db.execute(q)).scalars().all()

    async def list_orders(self, db: AsyncSession, session_id, user_id: str | None, limit: int):
        q = select(Order).where(Order.session_id == session_id)
        if user_id:
            q = q.where(Order.user_id == user_id)
        q = q.order_by(Order.created_at.desc()).limit(limit)
        return (await db.execute(q)).scalars().all()
