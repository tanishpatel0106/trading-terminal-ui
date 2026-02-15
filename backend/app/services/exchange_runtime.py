import asyncio
from dataclasses import asdict
from datetime import datetime
from uuid import UUID

from app.db.models.order import OrderRecord, OrderStatus, OrderType
from app.services.broadcaster import Broadcaster
from app.services.logic_adapter import EventType, OrderBook, OrderGeneratorState, create_delete_event, create_insert_event
from app.services.persistence import PersistenceService
from app.utils.time import now_ms


class ExchangeRuntime:
    def __init__(self, session_id: UUID, broadcaster: Broadcaster):
        self.session_id = session_id
        self.order_book = OrderBook()
        self.state = OrderGeneratorState(use_real_time=True)
        self.lock = asyncio.Lock()
        self.broadcaster = broadcaster
        self.engine_to_db: dict[int, UUID] = {}
        self.db_to_engine: dict[UUID, int] = {}
        self.order_users: dict[UUID, str] = {}

    async def place_order(self, persistence: PersistenceService, user_id: str, order_type: OrderType, side: str, qty: int, price: float | None, tif=None, ttl_seconds: int | None = None) -> OrderRecord:
        async with self.lock:
            rec = await persistence.create_order(self.session_id, user_id, side, order_type, qty, price, tif)
            engine_order_id = self.state.get_next_order_id()
            self.engine_to_db[engine_order_id] = rec.id
            self.db_to_engine[rec.id] = engine_order_id
            self.order_users[rec.id] = user_id

            px = int((price or (10**12 if side == "B" else 0)) * 10000)
            event = create_insert_event(self.state, engine_order_id, qty, px, side)
            ack, trades = self.order_book.process_event(event)

            if not ack.acked:
                await persistence.update_order(rec, status=OrderStatus.REJECTED, leaves_qty=rec.qty)
                await persistence.log_event(self.session_id, "REJECT", {"reason": ack.reason_rejected, "order_id": str(rec.id)})
            else:
                leaves = self._remaining_qty(engine_order_id)
                status = OrderStatus.FILLED if leaves == 0 else (OrderStatus.PARTIAL if leaves < qty else OrderStatus.LIVE)
                await persistence.update_order(rec, status=status, leaves_qty=leaves)
                await persistence.log_event(self.session_id, "ORDER_ACK", {"order_id": str(rec.id), "engine_order_id": engine_order_id})
                if ttl_seconds:
                    asyncio.create_task(self._expire_later(persistence, rec.id, ttl_seconds))

            if trades:
                for tr in trades:
                    db_order_id = self.engine_to_db.get(tr.order_id)
                    await persistence.create_trade(self.session_id, tr.price / 10000.0, tr.size, tr.side, taker_order_id=db_order_id)
                    await persistence.log_event(self.session_id, "TRADE", asdict(tr))
                    await self.broadcaster.publish_trade(str(self.session_id), {"event_type": "TRADE", "ts_ms": now_ms(), "payload": {"price": tr.price / 10000.0, "qty": tr.size, "side": tr.side}})

            await persistence.log_event(self.session_id, "BOOK_EVENT", {"type": int(EventType.INSERT), "engine_order_id": engine_order_id})
            await persistence.db.commit()

            snapshot = await self.get_snapshot(levels=20)
            await self.broadcaster.publish_marketdata(str(self.session_id), {"event_type": "SNAPSHOT", "ts_ms": now_ms(), "payload": snapshot})
            order = await persistence.get_order(rec.id)
            await self.broadcaster.publish_order_update(str(self.session_id), user_id, {"event_type": "ORDER_UPDATE", "ts_ms": now_ms(), "payload": {"order_id": str(rec.id), "status": order.status.value, "leaves_qty": order.leaves_qty}})
            return order

    async def cancel_order(self, persistence: PersistenceService, order: OrderRecord) -> OrderRecord:
        async with self.lock:
            engine_id = self.db_to_engine.get(order.id)
            if engine_id is None:
                return order
            price = int(float(order.price or 0) * 10000)
            event = create_delete_event(self.state, engine_id, price, order.side)
            ack, _ = self.order_book.process_event(event)
            status = OrderStatus.CANCELED if ack.acked else OrderStatus.REJECTED
            await persistence.update_order(order, status=status, leaves_qty=0 if status == OrderStatus.CANCELED else order.leaves_qty)
            await persistence.log_event(self.session_id, "CANCEL", {"order_id": str(order.id), "acked": ack.acked})
            await persistence.db.commit()
            await self.broadcaster.publish_order_update(str(self.session_id), order.user_id, {"event_type": "ORDER_UPDATE", "ts_ms": now_ms(), "payload": {"order_id": str(order.id), "status": status.value}})
            return order

    async def modify_order(self, persistence: PersistenceService, order: OrderRecord, price: float | None, qty: int | None) -> OrderRecord:
        await self.cancel_order(persistence, order)
        new_price = price if price is not None else float(order.price or 0)
        new_qty = qty if qty is not None else order.qty
        return await self.place_order(persistence, order.user_id, order.type, order.side, new_qty, new_price, order.tif)

    async def get_snapshot(self, levels: int = 20) -> dict:
        bids, asks = self.order_book.get_snapshot()
        return {
            "bids": [{"price": b.price / 10000.0, "size": b.size, "orders": b.order_count} for b in bids[:levels]],
            "asks": [{"price": a.price / 10000.0, "size": a.size, "orders": a.order_count} for a in asks[:levels]],
        }

    def _remaining_qty(self, engine_order_id: int) -> int:
        for side in (self.order_book.bids, self.order_book.asks):
            if engine_order_id in side._order_map:
                return side._order_map[engine_order_id].size
        return 0

    async def _expire_later(self, persistence: PersistenceService, order_id: UUID, ttl: int) -> None:
        await asyncio.sleep(ttl)
        order = await persistence.get_order(order_id)
        if not order or order.status in {OrderStatus.FILLED, OrderStatus.CANCELED, OrderStatus.REJECTED, OrderStatus.EXPIRED}:
            return
        await self.cancel_order(persistence, order)
        await persistence.update_order(order, status=OrderStatus.EXPIRED, leaves_qty=0)
        await persistence.log_event(self.session_id, "EXPIRED", {"order_id": str(order_id), "ttl": ttl, "expired_at": datetime.utcnow().isoformat()})
        await persistence.db.commit()
