import json
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.models.users import User
from app.db.database import SessionLocal

class UserImageService:
    PROFILE_PICTURES_DIR = r"C:\campus_pulse\backend\app\static\profiles"
    JSON_FILE_PATH = r"C:\campus_pulse\scraper\webscraping\user_images.json"
    
    os.makedirs(PROFILE_PICTURES_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(JSON_FILE_PATH), exist_ok=True)

    @staticmethod
    
    def _load_image_data() -> Dict[str, Any]:
        default_data = {
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "current_edition": 1,"total_users": 0,"users": []}
        if not os.path.exists(UserImageService.JSON_FILE_PATH):
            return default_data
        try:
            with open(UserImageService.JSON_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data.get("users"), list):
                print(f"⚠️ Warning: 'users' is not a list, resetting to empty list")
                data["users"] = []
            valid_users = []
            for u in data.get("users", []):
                if isinstance(u, dict) and "email" in u:
                    valid_users.append(u)
                else:
                    print(f"⚠️ Warning: Invalid user entry skipped: {u}")
            data["users"] = valid_users
            return data
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON decode error: {str(e)}. Using default data.")
            return default_data
        except Exception as e:
            print(f"❌ Error loading image  {str(e)}. Using default data.")
            return default_data

    @staticmethod
    def _save_image_data(data: Dict[str, Any]):
        """حفظ بيانات الصور في JSON"""
        try:
            with open(UserImageService.JSON_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"❌ Error saving image  {str(e)}")

    @staticmethod
    async def upload_profile_picture(
        db: Session,
        email: str,
        file: UploadFile
    ) -> Dict[str, str]:
        # user = db.query(User).filter(User.email == email).first()
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 5MB")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        image_id = f"img_{email}_{timestamp}_{unique_id}"
        image_filename = f"user_{email}_{timestamp}.{file_extension}"
        
        image_path = os.path.join(UserImageService.PROFILE_PICTURES_DIR, image_filename)
        with open(image_path, "wb") as f:
            f.write(content)
        image_url = f"/static/profiles/{image_filename}"
        
        image_data = UserImageService._load_image_data()
        
        image_data["users"] = [
            u for u in image_data.get("users", []) 
            if isinstance(u, dict) and u.get("email") != email  
        ]
        
        image_data["users"].append({
            "email": email,
            # "full_name": user.full_name or "Unknown",
            "profile_picture_url": image_url,
            "profile_picture_id": image_id,
            "has_custom_picture": True,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "newsletter_edition": image_data.get("current_edition", 1)
        })
        
        image_data["total_users"] = len(image_data["users"])
        image_data["last_updated"] = datetime.now(timezone.utc).isoformat()
        
        UserImageService._save_image_data(image_data)
        
        return {
            "status": "success",
            "message": "Profile picture uploaded successfully",
            "image_url": image_url,
            "image_id": image_id
        }

    @staticmethod
    def get_user_image_by_email(email: str) -> str:
        image_data = UserImageService._load_image_data()
        
        for u in image_data.get("users", []):
            if isinstance(u, dict) and u.get("email") == email:
                return u.get("profile_picture_url")
        return False

    @staticmethod
    def get_all_user_images() -> List[Dict[str, Any]]:
        image_data = UserImageService._load_image_data()
        return [u for u in image_data.get("users", []) if isinstance(u, dict)]

    @staticmethod
    def update_newsletter_edition(edition: int):
        image_data = UserImageService._load_image_data()
        image_data["current_edition"] = edition
        image_data["last_updated"] = datetime.now(timezone.utc).isoformat()
        
        for user in image_data.get("users", []):
            if isinstance(user, dict):
                user["newsletter_edition"] = edition
        
        UserImageService._save_image_data(image_data)

    # @staticmethod
    # def remove_profile_picture(email: str) -> Dict[str, str]:
    #     image_data = UserImageService._load_image_data()
        
    #     image_data["users"] = [
    #         u for u in image_data.get("users", []) 
    #         if not (isinstance(u, dict) and u.get("email") == email)
    #     ]
        
    #     from app.db.database import SessionLocal
    #     db = SessionLocal()
    #     user = db.query(User).filter(User.email == email).first()
    #     db.close()
        
    #     image_data["users"].append({
    #         "user_id": user.user_id if user else "unknown",
    #         "email": email if user else "unknown",
    #         "full_name": user.full_name or "Unknown" if user else "Unknown",
    #         "role": getattr(getattr(user, 'role', None), 'name', 'student') if user else "student",
    #         "profile_picture_url": "/static/profiles/default_user.png",
    #         "profile_picture_id": "default",
    #         "has_custom_picture": False,
    #         "uploaded_at": None,
    #         "newsletter_edition": image_data.get("current_edition", 1)
    #     })
        
    #     image_data["total_users"] = len(image_data["users"])
    #     image_data["last_updated"] = datetime.now(timezone.utc).isoformat()
    #     UserImageService._save_image_data(image_data)
        
    #     return {
    #         "status": "success",
    #         "message": "Profile picture removed successfully"
    #     }