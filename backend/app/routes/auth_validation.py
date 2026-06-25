# # app/routes/auth_validation.py
# from fastapi import APIRouter, HTTPException, Form, Query
# from fastapi.params import Depends
# from fastapi.responses import JSONResponse
# from sqlalchemy.orm import Session
# from typing import Optional

# from app.db.database import get_db
# from app.models.users import User
# from app.services.user_service import validate_password, validate_password_detailed

# router = APIRouter(prefix="/auth/validate", tags=["Validation"])


# @router.get("/email")
# async def validate_email(
#     email: str = Query(..., description="Email to validate"),
#     check_exists: bool = Query(True, description="Check if email exists in DB"),
#     db: Session = Depends(get_db)
# ):
#     """
#     ✅ Real-time email validation
#     • Format check
#     • MTI domain check
#     • Existence check (optional)
#     """
#     email = email.lower().strip()
    
#     # 1. Format check
#     if not email or '@' not in email:
#         return JSONResponse(content={
#             "valid": False,
#             "error": "Please enter a valid email address",
#             "field": "email"
#         })
    
#     # 2. MTI domain check
#     allowed_domains = ["cs.mti.edu.eg", "is.mti.edu.eg", "mti.edu.eg"]
#     domain = email.split('@')[-1] if '@' in email else ""
    
#     if domain not in allowed_domains:
#         return JSONResponse(content={
#             "valid": False,
#             "error": f"Email must be from MTI university. Allowed: {', '.join(allowed_domains)}",
#             "field": "email",
#             "allowed_domains": allowed_domains
#         })
    
#     # 3. Existence check (في الداتابيز)
#     if check_exists and db.query(User).filter(User.email == email).first():
#         return JSONResponse(content={
#             "valid": False,
#             "error": "This email is already registered",
#             "field": "email",
#             "exists": True
#         })
    
#     # ✅ All checks passed
#     return JSONResponse(content={
#         "valid": True,
#         "error": None,
#         "field": "email"
#     })


# @router.get("/password")
# async def validate_password_endpoint(
#     password: str = Query(..., description="Password to validate"),
#     detailed: bool = Query(False, description="Return detailed requirements")
# ):
#     """
#     ✅ Real-time password validation
#     • Strength check
#     • Detailed requirements (optional)
#     """
#     if not password:
#         return JSONResponse(content={
#             "valid": False,
#             "error": "Password is required",
#             "field": "password"
#         })
    
#     if detailed:
#         # إرجاع كل المتطلبات واحد واحد
#         is_valid, errors = validate_password_detailed(password)
#         return JSONResponse(content={
#             "valid": is_valid,
#             "error": None if is_valid else "Password does not meet requirements",
#             "field": "password",
#             "requirements": {
#                 "min_length": len(password) >= 8,
#                 "has_lowercase": bool(__import__('re').search(r'[a-z]', password)),
#                 "has_uppercase": bool(__import__('re').search(r'[A-Z]', password)),
#                 "has_number": bool(__import__('re').search(r'[0-9]', password)),
#                 "has_special": bool(__import__('re').search(r'[!@#$%^&*]', password))
#             }
#         })
    
#     # إرجاع نتيجة بسيطة
#     is_valid, error_message = validate_password(password)
#     return JSONResponse(content={
#         "valid": is_valid,
#         "error": error_message if not is_valid else None,
#         "field": "password"
#     })


# @router.get("/phone")
# async def validate_phone(
#     phone: str = Query(..., description="Phone number to validate"),
#     check_exists: bool = Query(True, description="Check if phone exists in DB"),
#     db: Session = Depends(get_db)
# ):
#     """
#     ✅ Real-time phone validation (Egyptian numbers)
#     • Format check (01xxxxxxxxx)
#     • Existence check (optional)
#     """
#     import re
    
#     if not phone:
#         return JSONResponse(content={
#             "valid": False,
#             "error": "Phone number is required",
#             "field": "phone"
#         })
    
#     # تنظيف الرقم
#     phone_clean = re.sub(r'[\s\-\(\)]', '', phone)
    
#     # Format check
#     if not re.match(r'^01[0125]\d{8}$', phone_clean):
#         return JSONResponse(content={
#             "valid": False,
#             "error": "Invalid Egyptian phone number. Must start with 01",
#             "field": "phone",
#             "example": "01012345678"
#         })
    
#     # Existence check
#     if check_exists and db.query(User).filter(User.phone == phone_clean).first():
#         return JSONResponse(content={
#             "valid": False,
#             "error": "This phone number is already registered",
#             "field": "phone",
#             "exists": True
#         })
    
#     return JSONResponse(content={
#         "valid": True,
#         "error": None,
#         "field": "phone"
#     })


# @router.post("/confirm-password")
# async def validate_confirm_password(
#     password: str = Form(...),
#     confirm_password: str = Form(...)
# ):
#     """
#     ✅ Real-time confirm password check
#     • Match check
#     """
#     if password != confirm_password:
#         return JSONResponse(content={
#             "valid": False,
#             "error": "Passwords do not match",
#             "field": "confirm_password"
#         })
    
#     return JSONResponse(content={
#         "valid": True,
#         "error": None,
#         "field": "confirm_password"
#     })


# @router.get("/student-id")
# async def validate_student_id(
#     student_id: int = Query(..., description="Student ID to validate"),
#     check_exists: bool = Query(True, description="Check if ID exists in DB"),
#     db: Session = Depends(get_db)
# ):
#     """
#     ✅ Real-time student ID validation
#     • Existence check
#     """
#     if not student_id:
#         return JSONResponse(content={
#             "valid": False,
#             "error": "Student ID is required",
#             "field": "student_id"
#         })
    
#     if check_exists and db.query(User).filter(User.student_id == student_id).first():
#         return JSONResponse(content={
#             "valid": False,
#             "error": "This Student ID is already registered",
#             "field": "student_id",
#             "exists": True
#         })
    
#     return JSONResponse(content={
#         "valid": True,
#         "error": None,
#         "field": "student_id"
#     })