# app/routes/user_register.py
import re
from typing import List, Optional
from fastapi import APIRouter, File, Form, HTTPException, Depends, UploadFile, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.user_service import (
    _get_role_id_from_email,
    get_user_preference,
    validate_password,
    validate_password_detailed,
    register_validate_mti_email,
    pending_store
)
from app.models.users import User
from app.models.roles import Role
from app.core.security import hash_password
from datetime import datetime, timezone
from app.services.otp_service import otp_tracker, send_email_otp
from app.services.auth_service import login_tracker
from app.services.user_image_service import UserImageService

router = APIRouter(prefix="/user", tags=["User Registration"])


# ============================================
# ✅ Real-Time Validation Endpoints (للـ Frontend)
# ============================================

@router.get("/validate/email")
async def validate_email(
    email: str = Query(..., description="Email to validate"),
    check_exists: bool = Query(True, description="Check if email exists in DB"),
    db: Session = Depends(get_db)
):
    """
    ✅ Real-time email validation
    • Format check
    • MTI domain check
    • Existence check (optional)
    """
    email = email.lower().strip()
    
    # 1. Format check
    if not email or '@' not in email:
        return JSONResponse(content={
            "valid": False,
            "error": "Please enter a valid email address",
            "field": "email"
        })
    
    # 2. MTI domain check
    allowed_domains = register_validate_mti_email.__globals__.get('ALLOWED_DOMAINS', 
                         ["cs.mti.edu.eg", "is.mti.edu.eg", "mti.edu.eg"])
    domain = email.split('@')[-1] if '@' in email else ""
    
    if domain not in allowed_domains:
        return JSONResponse(content={
            "valid": False,
            "error": f"Email must be from MTI university. Allowed: {', '.join(allowed_domains)}",
            "field": "email",
            "allowed_domains": allowed_domains
        })
    
    # 3. Existence check
    if check_exists and db.query(User).filter(User.email == email).first():
        return JSONResponse(content={
            "valid": False,
            "error": "This email is already registered",
            "field": "email",
            "exists": True
        })
    
    return JSONResponse(content={
        "valid": True,
        "error": None,
        "field": "email"
    })


@router.get("/validate/password")
async def validate_password_endpoint(
    password: str = Query(..., description="Password to validate"),
    detailed: bool = Query(False, description="Return detailed requirements")
):
    """
    ✅ Real-time password validation
    """
    if not password:
        return JSONResponse(content={
            "valid": False,
            "error": "Password is required",
            "field": "password"
        })
    
    if detailed:
        is_valid, requirements = validate_password_detailed(password)
        return JSONResponse(content={
            "valid": is_valid,
            "error": None if is_valid else "Password does not meet requirements",
            "field": "password",
            "requirements": requirements
        })
    
    is_valid, error_message = validate_password(password)
    return JSONResponse(content={
        "valid": is_valid,
        "error": error_message if not is_valid else None,
        "field": "password"
    })


@router.post("/confirm-password")
async def validate_confirm_password(
    password: str = Form(...),
    confirm_password: str = Form(...)
):
    """
    ✅ Real-time confirm password check
    • Match check
    """
    if password != confirm_password:
        return JSONResponse(content={
            "valid": False,
            "error": "Passwords do not match",
            "field": "confirm_password"
        })
    
    return JSONResponse(content={
        "valid": True,
        "error": None,
        "field": "confirm_password"
    })
@router.get("/validate/phone")
async def validate_phone(
    phone: str = Query(..., description="Phone number to validate"),
    check_exists: bool = Query(True, description="Check if phone exists in DB"),
    db: Session = Depends(get_db)
):
    """
    ✅ Real-time phone validation (Egyptian numbers)
    """
    if not phone:
        return JSONResponse(content={
            "valid": False,
            "error": "Phone number is required",
            "field": "phone"
        })
    
    phone_clean = re.sub(r'[\s\-\(\)]', '', phone)
    
    if not re.match(r'^01[0125]\d{8}$', phone_clean):
        return JSONResponse(content={
            "valid": False,
            "error": "Invalid Egyptian phone number. Must start with 010, 011, 012, or 015",
            "field": "phone",
            "example": "01012345678"
        })
    
    if check_exists and db.query(User).filter(User.phone == phone_clean).first():
        return JSONResponse(content={
            "valid": False,
            "error": "This phone number is already registered",
            "field": "phone",
            "exists": True
        })
    
    return JSONResponse(content={
        "valid": True,
        "error": None,
        "field": "phone"
    })


@router.get("/validate/student-id")
async def validate_student_id(
    student_id: int = Query(..., description="Student ID to validate"),
    check_exists: bool = Query(True, description="Check if ID exists in DB"),
    db: Session = Depends(get_db)
):
    """
    ✅ Real-time student ID validation
    """
    if not student_id:
        return JSONResponse(content={
            "valid": False,
            "error": "Student ID is required",
            "field": "student_id"
        })
    
    if check_exists and db.query(User).filter(User.student_id == student_id).first():
        return JSONResponse(content={
            "valid": False,
            "error": "This Student ID is already registered",
            "field": "student_id",
            "exists": True
        })
    
    return JSONResponse(content={
        "valid": True,
        "error": None,
        "field": "student_id"
    })

# router = APIRouter( tags=["users register"])
@router.get("/user")
def user(email: str, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        role_id = user.role_id
        is_student = (role_id == 3)
        
        return JSONResponse(
            status_code=200,
            content={
                "email": email,
                "role_id": role_id,
                "is_student": is_student
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error fetching user data")


@router.post("/preferences")    
def user_prefernce (
    email: str = Form(...),
    category_names: list[str] = Form([]),
    db: Session = Depends(get_db)
):   
    
    print(f"categories: {category_names}")
    raw_categories = category_names 
    cleaned_categories = []
    for item in raw_categories:
                if "," in item:
                    cleaned_categories.extend([x.strip() for x in item.split(",") if x.strip()])
                else:
                    cleaned_categories.append(item.strip())
    selected_category_names = list(set(cleaned_categories))
   
    get_user_preference(
                db=db,
                email=email,
                selected_category_name=selected_category_names
            )
    
    return JSONResponse(
                status_code=200,
                content={
                    "status": "success",
                    "email": email,
                    "selected_category": selected_category_names
                }
            )
              


@router.post("/register/request")
async def register_request(
    email: str = Form(..., description="MTI university email"),
    password: str = Form(...),
    confirm_password: str = Form(...),
    full_name: str = Form(None),
    phone: str = Form(None),
    faculty: str = Form(None),
    student_id: int = Form(None),
    file: UploadFile = File(..., description="Profile picture (JPEG, PNG, WEBP, max 5MB)"),
    db: Session = Depends(get_db)
):
    email = email.lower().strip()
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered")
    existing_user = db.query(User).filter(User.phone == phone).first()
    if not register_validate_mti_email(email):
        allowed = " | ".join([f"@{d}" for d in register_validate_mti_email.__globals__.get('ALLOWED_DOMAINS', [])])
        raise HTTPException(status_code=400,
            detail=f"You must use an MTI university email. Allowed domains: {allowed}"
        )
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone is already registered")
    existing_user = db.query(User).filter(User.student_id == student_id).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Student id is already registered")
    existing_pending = pending_store.get(email)
    if password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # is_blocked, failed_count = login_tracker.record_failed(email)
    # if is_blocked:
    #         print(f"🚫 Blocked login attempt: {email}")
    #         raise HTTPException(status_code=403,
    #             detail=f"Account temporarily blocked due to multiple failed registration attempts. Try again later.") 
    if not validate_password( password):
                    # remaining_attempts = 3 - failed_count
                    raise HTTPException(
                        status_code=401,
                        # detail=f"Incorrect password. You have {remaining_attempts} more attempt(s) before temporary block."
                    )
    is_valid, error_message = validate_password(password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message) 
   
    
    if existing_pending and existing_pending.get("otp_verified"):
        raise HTTPException(status_code=400, detail="Registration already verified. Please complete login.")
    phone_clean = phone.replace(' ', '').replace('-', '').strip()
    if not phone_clean.startswith('01') or len(phone_clean) != 11:
        raise HTTPException(
            status_code=400, 
            detail="Invalid phone number. Must be Egyptian number starting with 01 (e.g., 01012345678)"
        )
    try:
        user_image_url =await UserImageService.upload_profile_picture(db, email, file)
    except Exception as e:
        print(f"❌ Failed to upload profile picture: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload profile picture")
    
    registration_data = {
        "email": email,
        "password": password,
        "full_name": full_name.strip() if full_name else None,
        "phone": phone.strip() if phone else None,
        "faculty": faculty.strip() if faculty else None,
        "student_id": student_id,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "profile_picture": user_image_url 
    }
    
    pending_store.store(email, registration_data)
    
    # ✅ 7. توليد وإرسال OTP
    otp = otp_tracker.generate_otp()
    otp_tracker.store_otp(email, otp, phone=None)
    
    sent = await send_email_otp(email, otp)
    
    if not sent:
        pending_store.cleanup(email)
        otp_tracker._codes.pop(email, None)
        raise HTTPException(
            status_code=500,
            detail="Failed to send verification code. Please try again later."
        )
    
    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "message": "Verification code sent to your email. Please verify to complete registration.",
            "email": email,
            "expires_in_minutes": 3,
            "next_step": "POST /user register/register/verify",
            # ✅ للتطوير فقط (اشيله في الإنتاج)
            "debug_otp": otp if __debug__ else None
        }
    )


@router.post("/register/verify")
async def register_verify(
    email: str = Form(...),
    otp: str = Form(...),
    db: Session = Depends(get_db)
):
    
    email = email.lower().strip()
    pending_data = pending_store.get(email)
    if not pending_data:
        raise HTTPException(status_code=400,
            detail="Registration data not found or expired. Please start registration again."
        )
    is_valid, message = otp_tracker.verify_otp(email, otp)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid OTP: {message}")
    pending_store.mark_verified(email)
    registration_data = pending_store.get_data(email)
    if not registration_data:
        raise HTTPException(status_code=400,
            detail="Registration data not available. Please start registration again."
        )
    
    try:
        # ✅ 5. التحقق من عدم وجود الحساب (مرة تانية للأمان)
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            pending_store.cleanup(email)
            raise HTTPException(status_code=400, detail="Email is already registered")
        
        # ✅ 6. تعيين الـ role_id من الإيميل
        role_id = _get_role_id_from_email(email)
        
        # ✅ 7. جلب الرول من الداتابيز أو إنشاؤه
        role = db.query(Role).filter(Role.role_id == role_id).first()
        if not role:
            role_names = {2: "media_advisor", 3: "student", 4: "admin", 5: "manager"}
            role = Role(role_id=role_id, name=role_names.get(role_id, "student"))
            db.add(role)
            db.flush()
        
        # ✅ 8. إنشاء المستخدم وحفظه في الداتابيز
        new_user = User(
            email=registration_data["email"],
            password=hash_password(registration_data["password"]),
            full_name=registration_data.get("full_name"),
            phone=registration_data.get("phone"),
            faculty=registration_data.get("faculty"),
            student_id=registration_data.get("student_id"),
            role_id=role.role_id
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # ✅ 9. تنظيف البيانات المعلقة
        pending_store.cleanup(email)
        otp_tracker._codes.pop(email, None)
        
        return JSONResponse(
            status_code=201,
            content={
                "status": "success",
                "message": "Account created successfully! You can now login.",
                "user": {
                    "user_id": new_user.user_id,
                    "email": new_user.email,
                    "full_name": new_user.full_name,
                    "role": role.name,
                    "role_id": role.role_id
                },
                "next_step": "POST /auth/login"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create account")


@router.post("/register/resend-otp")
async def resend_registration_otp(
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    """إعادة إرسال OTP للتسجيل"""
    email = email.lower().strip()
    
    # التحقق من وجود بيانات معلقة
    pending_data = pending_store.get(email)
    if not pending_data:
        raise HTTPException(
            status_code=400,
            detail="Registration data not found or expired. Please start registration again."
        )
    
    # توليد OTP جديد
    otp = otp_tracker.generate_otp()
    otp_tracker.store_otp(email, otp, phone=None)
    
    sent = await send_email_otp(email, otp)
    
    if not sent:
        raise HTTPException(
            status_code=500,
            detail="Failed to send verification code. Please try again later."
        )
    
    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "message": "Verification code resent to your email.",
            "expires_in_minutes": 3,
            "debug_otp": otp if __debug__ else None
        }
    )              
@router.get("/password-requirements")
async def check_password_requirements(password: str):
    """
    التحقق من متطلبات الباسورد (للـ Frontend validation)
    """
    result = validate_password_detailed(password)
    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "data": result
        }
    )