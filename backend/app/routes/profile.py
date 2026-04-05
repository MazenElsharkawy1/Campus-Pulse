# app/api/v1/profile.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.users import User
from app.models.roles import Role
from app.schemas.user import UserProfileResponse, UserProfileUpdateRequest
from app.core.security import hash_password

router = APIRouter(prefix="/api/v1", tags=["Profile"])

@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(email: str, db: Session = Depends(get_db)):
    """
    جلب بيانات المستخدم حسب البريد الإلكتروني
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = db.query(Role).filter(Role.role_id == user.role_id).first()
    role_name = role.name if role else "unknown"

    return {
        "id": user.user_id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": role_name
    }

@router.put("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    email: str,
    update_data: UserProfileUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    تحديث بيانات المستخدم (الاسم، الهاتف، الباسورد)
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # تحديث الحقول المطلوبة
    if update_data.full_name is not None:
        user.full_name = update_data.full_name
    if update_data.phone is not None:
        user.phone = update_data.phone
    if update_data.password is not None:
        user.password = hash_password(update_data.password)  # ⚠️  تشفير
    if update_data.confirm_password is not None:    
        user.confirm_password = hash_password(update_data.confirm_password)  # ⚠️  تشفير
        if update_data.password != update_data.confirm_password:
            raise HTTPException(status_code=400, detail="كلمات المرور غير متطابقة")
        
    db.commit()
    db.refresh(user)

    # جلب اسم الدور
    role = db.query(Role).filter(Role.role_id == user.role_id).first()
    role_name = role.name if role else "unknown"

    return {
        "id": user.user_id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": role_name
    }