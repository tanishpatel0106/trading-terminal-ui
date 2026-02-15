from datetime import datetime
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.event import EventLog
from app.db.models.order import OrderRecord, OrderStatus, OrderType, TimeInForce
from app.db.models.trade import TradeRecord


class PersistenceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_order(
        self,
        session_id: UUID,
        user_id: str,
        side: str,
        order_type: OrderType,
        qty: int,
        price: float | None,
        tif: TimeInForce | None,
    ) -> OrderRecord:
        rec = OrderRecord(
            session_id=session_id,
            user_id=user_id,
            side=side,
            type=order_type,
            qty=qty,
            leaves_qty=qty,
            price=price,
            status=OrderStatus.NEW,
            tif=tif,
        )
        self.db.add(rec)
        await self.db.flush()
        return rec

    async def update_order(self, order: OrderRecord, *, status: OrderStatus, leaves_qty: int | None = None, price: float | None = None, qty: int | None = None) -> OrderRecord:
        order.status = status
        if leaves_qty is not None:
            order.leaves_qty = leaves_qty
        if price is not None:
            order.price = price
        if qty is not None:
            order.qty = qty
        await self.db.flush()
        return order

    async def get_order(self, order_id: UUID) -> OrderRecord | None:
        return await self.db.get(OrderRecord, order_id)

    async def list_orders(self, session_id: UUID, user_id: str | None, limit: int = 200) -> list[OrderRecord]:
        stmt = select(OrderRecord).where(OrderRecord.session_id == session_id).order_by(OrderRecord.created_at.desc()).limit(limit)
        if user_id:
            stmt = stmt.where(OrderRecord.user_id == user_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_trade(self, session_id: UUID, price: float, qty: int, side: str, taker_order_id: UUID | None = None, maker_order_id: UUID | None = None) -> TradeRecord:
        tr = TradeRecord(
            session_id=session_id,
            price=price,
            qty=qty,
            side=side,
            taker_order_id=taker_order_id,
            maker_order_id=maker_order_id,
            ts=datetime.utcnow(),
        )
        self.db.add(tr)
        await self.db.flush()
        return tr

    async def list_trades(self, session_id: UUID, limit: int = 200) -> list[TradeRecord]:
        stmt = select(TradeRecord).where(TradeRecord.session_id == session_id).order_by(TradeRecord.ts.desc()).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def log_event(self, session_id: UUID, event_type: str, payload: dict) -> None:
        ev = EventLog(session_id=session_id, event_type=event_type, payload=payload)
        self.db.add(ev)
        await self.db.flush()
