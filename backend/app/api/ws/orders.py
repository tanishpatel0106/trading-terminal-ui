from uuid import UUID
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect

from app.api.deps import get_broadcaster
from app.services.broadcaster import Broadcaster

router = APIRouter()


@router.websocket('/ws/sessions/{session_id}/orders')
async def orders_ws(session_id: UUID, websocket: WebSocket, user_id: str = Query(...), broadcaster: Broadcaster = Depends(get_broadcaster)) -> None:
    sid = str(session_id)
    await broadcaster.connect_orders(sid, user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)
