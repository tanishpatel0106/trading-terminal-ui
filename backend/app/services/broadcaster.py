import asyncio
from collections import defaultdict
from dataclasses import dataclass
from fastapi import WebSocket


MAX_QUEUE_SIZE = 200


@dataclass
class SocketState:
    websocket: WebSocket
    queue: asyncio.Queue[dict]
    sender_task: asyncio.Task[None]


class Broadcaster:
    def __init__(self) -> None:
        self.marketdata: dict[str, set[WebSocket]] = defaultdict(set)
        self.trades: dict[str, set[WebSocket]] = defaultdict(set)
        self.orders: dict[str, dict[str, set[WebSocket]]] = defaultdict(lambda: defaultdict(set))
        self._states: dict[WebSocket, SocketState] = {}

    async def _sender_loop(self, ws: WebSocket, queue: asyncio.Queue[dict]) -> None:
        try:
            while True:
                message = await queue.get()
                await asyncio.wait_for(ws.send_json(message), timeout=1.0)
        except Exception:
            self.disconnect(ws)

    async def _register(self, ws: WebSocket) -> None:
        await ws.accept()
        queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=MAX_QUEUE_SIZE)
        sender_task = asyncio.create_task(self._sender_loop(ws, queue))
        self._states[ws] = SocketState(websocket=ws, queue=queue, sender_task=sender_task)

    async def connect_marketdata(self, session_id: str, ws: WebSocket) -> None:
        await self._register(ws)
        self.marketdata[session_id].add(ws)

    async def connect_trades(self, session_id: str, ws: WebSocket) -> None:
        await self._register(ws)
        self.trades[session_id].add(ws)

    async def connect_orders(self, session_id: str, user_id: str, ws: WebSocket) -> None:
        await self._register(ws)
        self.orders[session_id][user_id].add(ws)

    async def send_direct(self, ws: WebSocket, message: dict) -> None:
        state = self._states.get(ws)
        if state is None:
            return
        await self._enqueue(state, message)

    async def _enqueue(self, state: SocketState, message: dict) -> None:
        try:
            state.queue.put_nowait(message)
        except asyncio.QueueFull:
            while state.queue.qsize() > MAX_QUEUE_SIZE // 2:
                try:
                    state.queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
            try:
                state.queue.put_nowait({"event": "resync_required"})
            except asyncio.QueueFull:
                pass
            try:
                state.queue.put_nowait(message)
            except asyncio.QueueFull:
                pass

    def disconnect(self, ws: WebSocket) -> None:
        for bag in (self.marketdata, self.trades):
            for conns in bag.values():
                conns.discard(ws)
        for per_user in self.orders.values():
            for conns in per_user.values():
                conns.discard(ws)

        state = self._states.pop(ws, None)
        if state is not None:
            state.sender_task.cancel()

    async def _fanout(self, sockets: set[WebSocket], message: dict) -> None:
        for ws in list(sockets):
            state = self._states.get(ws)
            if state is None:
                sockets.discard(ws)
                continue
            await self._enqueue(state, message)

    async def publish_marketdata(self, session_id: str, message: dict) -> None:
        await self._fanout(self.marketdata[session_id], message)

    async def publish_trade(self, session_id: str, message: dict) -> None:
        await self._fanout(self.trades[session_id], message)

    async def publish_order_update(self, session_id: str, user_id: str, message: dict) -> None:
        await self._fanout(self.orders[session_id][user_id], message)
