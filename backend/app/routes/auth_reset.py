# ============================================================================
# 🔐 Campus Pulse - Password Reset Routes
# ============================================================================

import os
from fastapi import APIRouter, HTTPException, Depends, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.users import User
from app.core.security import hash_password
from app.services.otp_service import (
    otp_tracker, 
    send_email_otp,
    twilio_service
)
from app.services.auth_service import login_tracker
from app.services.user_service import validate_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/forgot-password")
async def request_password_reset(
    email: str = Form(...),
    method: str = Form("email"),  # "email" أو "sms" أو "whatsapp"
    db: Session = Depends(get_db)
):
    """
    طلب إعادة تعيين كلمة المرور - إرسال OTP
    """
    email = email.lower().strip()
    print(f"🔐 [Forgot Password] Request: email={email}, method={method}")
    
    # ✅ 1. التحقق من وجود المستخدم
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"⚠️ [Forgot Password] User not found: {email}")
        # Security: لا تكشف إن المستخدم غير موجود
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": "If the email exists in our system, you'll receive an OTP."
            }
        )
    
    print(f"✅ [Forgot Password] User found: {user.email}, phone: {user.phone}")
    
    # ✅ 2. توليد وتخزين الـ OTP
    otp = otp_tracker.generate_otp()
    phone = user.phone if method in ["sms", "whatsapp"] else None
    
    otp_tracker.store_otp(
        email=email, 
        otp=otp, 
        phone=phone, 
        otp_type="password_reset"
    )
    print(f"🔐 [Forgot Password] OTP generated: {otp}")
    
    # ✅ 3. إرسال الـ OTP حسب الـ method
    sent = False
    
    if method == "sms" and phone:
        print(f"📱 [Forgot Password] Sending SMS to: {phone}")
        sent = await twilio_service.send_sms_otp(phone, otp)
        
    elif method == "whatsapp" and phone:
        print(f"💬 [Forgot Password] Sending WhatsApp to: {phone}")
        sent = await twilio_service.send_whatsapp_otp(phone, otp)
        
    else:
        # Default to email
        print(f"📧 [Forgot Password] Sending Email to: {email}")
        sent = await send_email_otp(email, otp)
    
    # ✅ 4. التعامل مع الفشل
    if not sent:
        print(f"❌ [Forgot Password] Failed to send OTP via {method}")
        otp_tracker._codes.pop(email, None)
        raise HTTPException(
            status_code=500,
            detail="Failed to send OTP. Check the logs for details."
        )
    
    print(f"✅ [Forgot Password] OTP sent successfully via {method}")
    
    # ✅ 5. الرد الناجح
    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "message": "OTP sent successfully. Valid for 3 minutes.",
            "method": method,
            "expires_in_minutes": 3,
            "debug_otp": otp if os.getenv("DEV_MODE") == "true" else None
        }
    )


@router.post("/reset-password")
async def reset_password(
    email: str = Form(...),
    otp: str = Form(...),
    new_password: str = Form(...),
    confirm_password: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    إعادة تعيين كلمة المرور بعد التحقق من الـ OTP
    """
    email = email.lower().strip()
    
    # ✅ 1. التحقق من وجود المستخدم
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # ✅ 2. التحقق من الـ OTP
    is_valid, message = otp_tracker.verify_otp(email, otp)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    # ✅ 3. التحقق من تطابق الباسوردز
    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # ✅ 4. التحقق من قوة الباسورد
    is_valid, error_message = validate_password(new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # ✅ 5. تحديث الباسورد
    user.password = hash_password(new_password)
    db.commit()
    
    # ✅ 6. Reset login attempts
    login_tracker.reset(email)
    
    print(f"✅ [Reset Password] Password changed for: {email}")
    
    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "message": "Password changed successfully. You can now log in.",
            "email": email
        }
    )


@router.get("/otp-status/{email}")
async def get_otp_status(
    email: str,
    db: Session = Depends(get_db)
):
    """
    التحقق من حالة الـ OTP لإيميل معين
    """
    email = email.lower().strip()
    status_data = otp_tracker.get_status(email)
    
    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "email": email,
            "otp_status": status_data
        }
    )