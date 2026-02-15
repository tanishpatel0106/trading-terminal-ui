import asyncio
from uuid import UUID
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect

from app.api.deps import get_broadcaster
from app.services.broadcaster import Broadcaster
from app.utils.time import now_ms

router = APIRouter()


@router.websocket('/ws/sessions/{session_id}/orders')
async def orders_ws(session_id: UUID, websocket: WebSocket, user_id: str = Query(...), broadcaster: Broadcaster = Depends(get_broadcaster)) -> None:
    sid = str(session_id)
    await broadcaster.connect_orders(sid, user_id, websocket)
    await broadcaster.send_direct(websocket, {"event": "hello", "session_id": sid, "stream": "orders", "ts": now_ms()})
    try:
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_json(), timeout=20)
                if isinstance(msg, dict) and msg.get("event") == "ping":
                    await broadcaster.send_direct(websocket, {"event": "pong", "ts": now_ms()})
            except asyncio.TimeoutError:
                await broadcaster.send_direct(websocket, {"event": "ping", "ts": now_ms()})
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)
