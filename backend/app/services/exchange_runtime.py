import asyncio
from dataclasses import dataclass, field
from importlib import import_module
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal

from app.db.models.order import Order, OrderStatus, OrderType
from app.db.models.trade import Trade
from app.services.broadcaster import Broadcaster
from app.services.persistence import PersistenceService
from app.utils.ids import new_uuid
from app.utils.time import now_ms, utcnow


class LogicAdapter:
    def __init__(self) -> None:
        self._engine = self._load_engine()

    @staticmethod
    def _load_engine():
        candidates = [
            ("logic.order_book", "OrderBook"),
            ("logic.engine", "MatchingEngine"),
            ("logic", "Engine"),
        ]
        for module_name, cls_name in candidates:
            try:
                mod = import_module(module_name)
                cls = getattr(mod, cls_name)
                return cls()
            except Exception:
                continue
        return None

    def process_order(self, order: dict) -> dict:
        if self._engine is None:
            return {"status": "ACK", "trades": []}
        if hasattr(self._engine, "process_order"):
            return self._engine.process_order(order)
        if hasattr(self._engine, "add_order"):
            result = self._engine.add_order(order)
            return result if isinstance(result, dict) else {"status": "ACK", "trades": []}
        return {"status": "ACK", "trades": []}

    def cancel_order(self, order_id: str) -> dict:
        if self._engine and hasattr(self._engine, "cancel_order"):
            result = self._engine.cancel_order(order_id)
            return result if isinstance(result, dict) else {"status": "CANCELED"}
        return {"status": "CANCELED"}

    def snapshot(self, levels: int = 20) -> dict:
        if self._engine and hasattr(self._engine, "snapshot"):
            return self._engine.snapshot(levels)
        return {"bids": [], "asks": [], "levels": levels}


@dataclass
class SessionRuntime:
    session_id: UUID
    symbol: str
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    logic: LogicAdapter = field(default_factory=LogicAdapter)


class ExchangeRuntimeManager:
    def __init__(self, broadcaster: Broadcaster, persistence: PersistenceService) -> None:
        self._runtimes: dict[UUID, SessionRuntime] = {}
        self._broadcaster = broadcaster
        self._persistence = persistence

    def get_or_create(self, session_id: UUID, symbol: str) -> SessionRuntime:
        if session_id not in self._runtimes:
            self._runtimes[session_id] = SessionRuntime(session_id=session_id, symbol=symbol)
        return self._runtimes[session_id]

    async def place_order(self, db: AsyncSession, runtime: SessionRuntime, payload: dict) -> Order:
        async with runtime.lock:
            order = Order(
                id=new_uuid(),
                session_id=runtime.session_id,
                user_id=payload["user_id"],
                side=payload["side"],
                type=payload["type"],
                price=payload.get("price"),
                qty=payload["qty"],
                leaves_qty=payload["qty"],
                tif=payload.get("tif"),
                status=OrderStatus.NEW,
            )
            order = await self._persistence.create_order(db, order)
            result = runtime.logic.process_order(payload)
            try:
                status = OrderStatus(result.get("status", "ACK"))
            except Exception:
                status = OrderStatus.ACK
            await self._persistence.update_order_status(db, order.id, status)
            await self._persistence.log_event(db, runtime.session_id, "ORDER_SUBMIT", {"order_id": str(order.id), **payload})
            await self._broadcaster.publish(f"orders:{runtime.session_id}:{order.user_id}", {"event": "order_update", "ts_ms": now_ms(), "payload": {"order_id": str(order.id), "status": status.value}})
            await self._broadcaster.publish(f"market:{runtime.session_id}", {"event": "book_update", "ts_ms": now_ms(), "payload": runtime.logic.snapshot()})
            for tr in result.get("trades", []):
                trade = Trade(
                    session_id=runtime.session_id,
                    taker_order_id=order.id,
                    maker_order_id=tr.get("maker_order_id"),
                    price=tr["price"],
                    qty=tr["qty"],
                    side=payload["side"].value,
                    ts=utcnow(),
                )
                trade = await self._persistence.create_trade(db, trade)
                await self._broadcaster.publish(f"trades:{runtime.session_id}", {"event": "trade", "ts_ms": now_ms(), "payload": {"id": str(trade.id), "price": float(trade.price), "qty": trade.qty}})
            if payload.get("ttl_seconds"):
                asyncio.create_task(self._expire_order_after(db, runtime, order.id, payload["ttl_seconds"], order.user_id))
            return order

    async def _expire_order_after(self, db: AsyncSession, runtime: SessionRuntime, order_id: UUID, ttl: int, user_id: str) -> None:
        await asyncio.sleep(ttl)
        async with AsyncSessionLocal() as ttl_db:
            async with runtime.lock:
                await self._persistence.update_order_status(ttl_db, order_id, OrderStatus.EXPIRED, leaves_qty=0)
                await self._persistence.log_event(ttl_db, runtime.session_id, "EXPIRED", {"order_id": str(order_id)})
                await self._broadcaster.publish(f"orders:{runtime.session_id}:{user_id}", {"event": "order_update", "ts_ms": now_ms(), "payload": {"order_id": str(order_id), "status": "EXPIRED"}})

    async def cancel_order(self, db: AsyncSession, runtime: SessionRuntime, order_id: UUID) -> None:
        async with runtime.lock:
            runtime.logic.cancel_order(str(order_id))
            await self._persistence.update_order_status(db, order_id, OrderStatus.CANCELED, leaves_qty=0)
            await self._persistence.log_event(db, runtime.session_id, "CANCEL", {"order_id": str(order_id)})

    async def modify_order(self, db: AsyncSession, runtime: SessionRuntime, order_id: UUID, price: float | None, qty: int | None) -> None:
        async with runtime.lock:
            order = await db.get(Order, order_id)
            if not order:
                return
            if price is not None:
                order.price = price
            if qty is not None:
                order.qty = qty
                order.leaves_qty = qty
            await db.commit()
            await self._persistence.log_event(db, runtime.session_id, "MODIFY", {"order_id": str(order_id), "price": price, "qty": qty})

    async def get_snapshot(self, runtime: SessionRuntime, levels: int = 20) -> dict:
        async with runtime.lock:
            return runtime.logic.snapshot(levels)
