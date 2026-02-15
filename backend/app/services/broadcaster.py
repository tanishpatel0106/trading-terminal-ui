import asyncio
from collections import defaultdict
from fastapi import WebSocket


class Broadcaster:
    def __init__(self) -> None:
        self.marketdata: dict[str, set[WebSocket]] = defaultdict(set)
        self.trades: dict[str, set[WebSocket]] = defaultdict(set)
        self.orders: dict[str, dict[str, set[WebSocket]]] = defaultdict(lambda: defaultdict(set))

    async def connect_marketdata(self, session_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.marketdata[session_id].add(ws)

    async def connect_trades(self, session_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.trades[session_id].add(ws)

    async def connect_orders(self, session_id: str, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.orders[session_id][user_id].add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        for bag in (self.marketdata, self.trades):
            for conns in bag.values():
                conns.discard(ws)
        for per_user in self.orders.values():
            for conns in per_user.values():
                conns.discard(ws)

    async def _fanout(self, sockets: set[WebSocket], message: dict) -> None:
        dead = []
        for ws in list(sockets):
            try:
                await asyncio.wait_for(ws.send_json(message), timeout=0.25)
            except Exception:
                dead.append(ws)
        for ws in dead:
            sockets.discard(ws)

    async def publish_marketdata(self, session_id: str, message: dict) -> None:
        await self._fanout(self.marketdata[session_id], message)

    async def publish_trade(self, session_id: str, message: dict) -> None:
        await self._fanout(self.trades[session_id], message)

    async def publish_order_update(self, session_id: str, user_id: str, message: dict) -> None:
        await self._fanout(self.orders[session_id][user_id], message)
