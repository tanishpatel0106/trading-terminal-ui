from uuid import UUID
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from app.api.deps import get_broadcaster
from app.services.broadcaster import Broadcaster

router = APIRouter()


@router.websocket("/ws/sessions/{session_id}/marketdata")
async def marketdata_ws(session_id: UUID, websocket: WebSocket, broadcaster: Broadcaster = Depends(get_broadcaster)) -> None:
    sid = str(session_id)
    await broadcaster.connect_marketdata(sid, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)
