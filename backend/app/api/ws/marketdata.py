import asyncio
from uuid import UUID
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from app.api.deps import get_broadcaster, get_replay_session
from app.services.broadcaster import Broadcaster
from app.services.replay_service import ReplaySession
from app.utils.time import now_ms

router = APIRouter()


@router.websocket('/ws/sessions/{session_id}/marketdata')
async def marketdata_ws(
    session_id: UUID,
    websocket: WebSocket,
    broadcaster: Broadcaster = Depends(get_broadcaster),
    replay: ReplaySession = Depends(get_replay_session),
) -> None:
    sid = str(session_id)
    await broadcaster.connect_marketdata(sid, websocket)
    await broadcaster.send_direct(websocket, {"event": "hello", "session_id": sid, "stream": "marketdata", "ts": now_ms()})
    snapshot = await replay.get_snapshot(levels=20)
    await broadcaster.send_direct(websocket, {"event": "snapshot", "bids": snapshot["bids"], "asks": snapshot["asks"], "ts": now_ms()})
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
