from pickle import GET
import traceback
from fastapi import APIRouter, Depends, HTTPException
from fastapi.params import Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.users import User
from app.models.roles import Role
from app.models.user_preference import UserPreference  
from app.schemas.user import UserProfileResponse, UserProfileResponse2
from app.models.category import Category
from app.services.user_service import get_user_role, validate_password
from app.core.security import hash_password, verify_password
from app.services.user_image_service import UserImageService
from app.services.newsletter_service import NewsletterService
router = APIRouter(prefix="/api/v1", tags=["Profile"])

@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = db.query(Role).filter(Role.role_id == user.role_id).first()
    role_name = role.name if role else "unknown"
    preferences = []
    user_prefs = db.query(UserPreference).filter(UserPreference.user_id == user.user_id).all()
    for pref in user_prefs:
        category = db.query(Category).filter(Category.category_id == pref.category_id).first()
        if category:
            preferences.append(category.name)
    student_image_data = UserImageService.get_user_image_by_email(email)
    
    if isinstance(student_image_data, dict):
            student_profile_pic = student_image_data.get("profile_picture_url")
    elif isinstance(student_image_data, str):
            student_profile_pic = student_image_data 
    else:
            student_profile_pic = "/static/profiles/default_user.png"
    password_stars = "*" * len(user.password) if user.password else "********"
    return {
        "email": user.email,
        "student_profile_picture": student_profile_pic,
        "full_name": user.full_name,
        "phone": user.phone,
        "password": password_stars,
        "faculty": user.faculty,
        "role": role_name,
        "student_id": user.student_id,
        "preferences": preferences
    }
@router.put("/profile", response_model=UserProfileResponse2)
async def update_user_profile(
    email: str = Form(...),
    category_names: list = Form([]),
    deleted_category_names: list = Form([]),
    phone: str = Form(None),
    full_name: str = Form(None),
    db: Session = Depends(get_db)
):
    print(f"   categories to add/keep: {category_names}")
    print(f"   categories to delete: {deleted_category_names}")
    print(f"   full_name: {full_name}, phone: {phone}")
    
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if full_name is not None:
            user.full_name = full_name.strip() if full_name else None   
        if phone is not None:
            user.phone = phone.strip() if phone else None
        db.commit()
        
        if deleted_category_names:
            cleaned_cats = set()
            for item in deleted_category_names:
                if isinstance(item, str):
                    if "," in item:
                        cleaned_cats.update(x.strip() for x in item.split(",") if x.strip())
                    else:
                        cleaned_cats.add(item.strip())
            del_cat_ids = []
            for name in cleaned_cats:
                cat = db.query(Category).filter(Category.name == name.strip()).first()
                if cat:
                    del_cat_ids.append(cat.category_id)
            if del_cat_ids:
                db.query(UserPreference).filter(
                    UserPreference.user_id == user.user_id,
                    UserPreference.category_id.in_(del_cat_ids)
                ).delete(synchronize_session=False)
        if category_names:
            cleaned_cats = set()
            for item in category_names:
                if isinstance(item, str):
                    if "," in item:
                        cleaned_cats.update(x.strip() for x in item.split(",") if x.strip())
                    else:
                        cleaned_cats.add(item.strip())
            add_cat_ids = []
            for name in cleaned_cats:
                cat = db.query(Category).filter(Category.name == name).first()
                if cat:
                    add_cat_ids.append(cat.category_id)
            current_prefs = db.query(UserPreference).filter(
                UserPreference.user_id == user.user_id
            ).all()
            current_cat_ids = {p.category_id for p in current_prefs}
            for cat_id in add_cat_ids:
                if cat_id not in current_cat_ids:
                    db.add(UserPreference(user_id=user.user_id, category_id=cat_id))
        db.commit()
        result = await NewsletterService.update_newsletter_on_preference_change(
            db, email, deleted_category_names, category_names)

        if isinstance(result, dict) and not result.get("has_preferences", True):
            # حالة مفيش preferences
            return JSONResponse(status_code=200, content=result)
        else:
            # حالة الـ dashboard العادي
            return JSONResponse(status_code=200, content={
                "status": "success",
                "dashboard": result
            })
        # newsletter_update = await NewsletterService.update_newsletter_on_preference_change(
        #     db, email, deleted_category_names, category_names
        # )

        # return JSONResponse(status_code=200, content={
        #     "status": "success",
        #     "message": "Preferences and newsletter updated successfully",
        #     "preferences": category_names,
        #     "newsletter": newsletter_update
        # })
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        db.rollback()
        print(f"❌ Preference update failed: {e}")
        import traceback; traceback.print_exc() # ✅ هيوريك التريسيباك الكامل لو حصل خطأ تاني
        raise HTTPException(status_code=500, detail="Failed to update database. Please try again later.")
    

    
@router.post("/change-password")    
async def change_password(
    email: str = Form(...),current_password: str = Form(...),  new_password: str = Form(...),
    confirm_password: str = Form(...),db: Session = Depends(get_db)
):
    print(f"🔑 Changing password for: {email}")
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not verify_password(current_password, user.password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        if new_password != confirm_password:
            raise HTTPException(status_code=400, detail="New passwords do not match")
        is_valid, error_message = validate_password(new_password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_message) 
        user.password = hash_password(new_password)
        db.commit()
        role_id = get_user_role(db, email)
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": "Password changed successfully",
                "email": email,
                "role_id": role_id,
                "is_student": (role_id == 3)
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error changing password: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal server error")