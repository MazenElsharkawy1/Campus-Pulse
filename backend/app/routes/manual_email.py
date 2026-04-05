# app/routes/manual_send_route.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.email_service import send_newsletter_by_user_id # ← الدالة الجديدة
router = APIRouter(prefix="/test", tags=["Manual Send"])

import sys
sys.path.append(".")

from app.db.database import SessionLocal
from app.services.email_service import send_newsletter_by_user_id
@router.post("/send-newsletter/{user_id}")
async def manual_send_newsletter(user_id: int, db: Session = Depends(get_db)):
    """
    إرسال النشرة يدويًا لأي مستخدم حسب user_id
    """
    try:
        success = send_newsletter_by_user_id(db, user_id)  # استخدم الدالة الجديدة
        if not success:
            raise HTTPException(status_code=404, detail="No newsletter found for this user today")
        return {"message": f"Newsletter sent successfully to user {user_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))