# app/routes/sms_preferences.py
from fastapi import APIRouter, Depends, HTTPException, Form, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.models.users import User
from app.services.sms_service import SMSService
from app.models.newsletter import Newsletter

router = APIRouter(prefix="/api/sms", tags=["SMS Notifications"])

@router.post("/test")
async def test_sms(
    user_id: int = Form(..., description="User ID"),
    db: Session = Depends(get_db)
):
    """إرسال رسالة SMS تجريبية"""
    
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user or not user.phone:
        raise HTTPException(status_code=400, detail="Phone number not registered")
    
    sent = await SMSService.send_newsletter_sms(
        phone=user.phone,
        newsletter_edition=0,
        newsletter_date="تجريبي"
    )
    
    if sent:
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": "Test SMS sent successfully",
                "user_id": user_id
            }
        )
    else:
        raise HTTPException(status_code=500, detail="Failed to send test SMS")
