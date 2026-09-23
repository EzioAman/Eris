import asyncio
import logging
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("eris.websocket")

router = APIRouter(tags=["WebSocket Event Bus"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"WebSocket client connected: {client_id}")

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)
        logger.info(f"WebSocket client disconnected: {client_id}")

    async def broadcast(self, message: Dict[str, Any]):
        for client_id, connection in list(self.active_connections.items()):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(client_id)

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_id = f"client_{id(websocket)}"
    await manager.connect(client_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Echo or route command
            msg_type = data.get("type", "ping")
            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": str(asyncio.get_event_loop().time())})
            else:
                await websocket.send_json({"type": "ack", "received": msg_type})
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.warning(f"WebSocket error on {client_id}: {e}")
        manager.disconnect(client_id)
