from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.deps import broadcaster

router = APIRouter()


@router.websocket("/ws/sessions/{session_id}/trades")
async def ws_trades(websocket: WebSocket, session_id: UUID):
    await websocket.accept()
    try:
        async for msg in broadcaster.subscribe(f"trades:{session_id}"):
            await websocket.send_json(msg)
    except WebSocketDisconnect:
        return
