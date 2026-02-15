from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.api.deps import broadcaster

router = APIRouter()


@router.websocket("/ws/sessions/{session_id}/orders")
async def ws_orders(websocket: WebSocket, session_id: UUID, user_id: str = Query(...)):
    await websocket.accept()
    try:
        async for msg in broadcaster.subscribe(f"orders:{session_id}:{user_id}"):
            await websocket.send_json(msg)
    except WebSocketDisconnect:
        return
