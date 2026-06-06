import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.subprocess_manager import get_or_create_queue, cleanup_queue

router = APIRouter()


@router.websocket("/ws/logs/{job_id}")
async def log_stream(websocket: WebSocket, job_id: str):
    await websocket.accept()
    queue = get_or_create_queue(job_id)
    try:
        while True:
            try:
                line = await asyncio.wait_for(queue.get(), timeout=600.0)
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "timeout"})
                break
            if line is None:
                await websocket.send_json({"type": "done"})
                break
            await websocket.send_json({"type": "log", "text": line})
    except WebSocketDisconnect:
        pass
    finally:
        cleanup_queue(job_id)
        await websocket.close()
