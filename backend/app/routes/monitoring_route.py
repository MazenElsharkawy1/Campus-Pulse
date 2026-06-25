# routes/monitoring_route.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.websocket_manager import university_media_adviser
import json

router = APIRouter()

# ❌ كان: @router.get("/ws/monitor")
# ✅ الصح: @router.websocket("/ws/monitor")
@router.websocket("/ws/monitor")
async def monitoring_ws(
    websocket: WebSocket, 
    role: str = Query(...), 
    user_id: str = Query(None)
):
    """
    WebSocket endpoint للمراقبة اللحظية.
    """
    if role not in ["university_media_adviser", "student"]:
        await websocket.close(code=1008)  
        return

    if role == "university_media_adviser":
        await university_media_adviser.connect_university_media_adviser(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            await university_media_adviser.disconnect_university_media_adviser(websocket)
        except Exception:
            await university_media_adviser.disconnect_university_media_adviser(websocket)

    elif role == "student" and user_id:
        await university_media_adviser.connect_student(websocket, user_id)
        try:
            while True:
                try:
                    raw = await websocket.receive_text()
                    msg = json.loads(raw)
                    
                    if msg.get("action") == "update_dashboard":
                        content = msg.get("content", {})
                        await university_media_adviser.push_student_view(user_id, content)
                        
                except json.JSONDecodeError:
                    continue
                    
        except WebSocketDisconnect:
            await university_media_adviser.disconnect_student(user_id)
        except Exception:
            await university_media_adviser.disconnect_student(user_id)