from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Dict, Optional

router = APIRouter(prefix="/monitor", tags=["Monitor"])
active_students: Dict[str, dict] = {}
HEARTBEAT_TIMEOUT_SEC = 90
class MonitorPayload(BaseModel):
    email: str 
    data: Optional[dict] = None
@router.post("/heartbeat")
async def student_heartbeat(payload: MonitorPayload):
    if not payload.email:
        raise HTTPException(status_code=400, detail="Email required")
    active_students[payload.email] = {
        "last_seen": datetime.utcnow().timestamp(),
        "dashboard_data": payload.data or active_students.get(payload.email, {}).get("dashboard_data", {})
    }
    return {"status": "ok", "email": payload.email}
@router.post("/logout")
async def student_logout(payload: MonitorPayload):
    if payload.email in active_students:
        del active_students[payload.email]
    return {"status": "disconnected", "email": payload.email}

@router.get("/active-users")
async def get_active_users():
    now = datetime.utcnow().timestamp()
    active = []
    to_remove = []
    for email, info in active_students.items():
        if (now - info["last_seen"]) > HEARTBEAT_TIMEOUT_SEC:
            to_remove.append(email)
        else:
            active.append(email)
    for email in to_remove:
        del active_students[email]
    return {"active_users": active, "count": len(active)}
@router.get("/student-dashboard")
async def get_student_dashboard(user_id: str):
    if user_id not in active_students:
        raise HTTPException(status_code=404, detail="Student not active or data expired")
    
    return active_students[user_id].get("dashboard_data", {})