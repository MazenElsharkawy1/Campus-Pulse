# app/routes/user_image_route.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.services.user_image_service import UserImageService
from app.models.users import User
from pydantic import BaseModel

router = APIRouter(prefix="/users/images", tags=["User Images"])

class UserImageResponse(BaseModel):
    user_id: int
    email: str
    full_name: str
    role: str
    profile_picture_url: str
    profile_picture_id: str
    has_custom_picture: bool
    uploaded_at: Optional[str]
    newsletter_edition: int

@router.post("/upload", response_model=dict)
async def upload_profile_picture(
    email: str = Query(..., description="Target user ID"), 
    file: UploadFile = File(..., description="Profile picture (JPEG, PNG, WEBP, max 5MB)"),
    db: Session = Depends(get_db)
):
    return await UserImageService.upload_profile_picture(db, email, file)

@router.get("/my-image")  
async def get_my_profile_image(
    email: str,
    db: Session = Depends(get_db)
):
    user_image = UserImageService.get_user_image_by_email(email)
    
    if not user_image:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_image = {
            "user_id": user.user_id,
            "email": user.email,
            "full_name": user.full_name or "Unknown",
            "role": user.role.name if hasattr(user, 'role') else "student",
            "profile_picture_url": "/static/profiles/default_user.png",
            "profile_picture_id": "default",
            "has_custom_picture": False,
            "uploaded_at": None,
            "newsletter_edition": 1
        }
    
    return user_image

@router.get("/all-images", response_model=List[UserImageResponse]) 
async def get_all_profile_images(
    db: Session = Depends(get_db)
):
    return UserImageService.get_all_user_images()


@router.get("/by-email/{email}")  
async def get_user_image_by_email(
    email: str,
    db: Session = Depends(get_db)
):
    user_image = UserImageService.get_user_image_by_email(email)
    
    if not user_image:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_image = {
            "user_id": user.user_id,
            "email": user.email,
            "full_name": user.full_name or "Unknown",
            "role": user.role.name if hasattr(user, 'role') else "student",
            "profile_picture_url": "/static/profiles/default_user.png",
            "profile_picture_id": "default",
            "has_custom_picture": False,
            "uploaded_at": None,
            "newsletter_edition": 1
        }
    
    return user_image