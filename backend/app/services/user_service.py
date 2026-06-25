import email

from fastapi import HTTPException
from realtime import Any, Dict
from sqlalchemy import Null
from sqlalchemy.orm import Session
from app.models.users import User
from app.models.user_preference import UserPreference
from app.models.category import Category
from typing import Optional
from app.models.roles import Role
from app.models import users
from ..core.security import hash_password, verify_password
from typing import Optional

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    users = db.query(User).filter(User.email == email).first()
    if not users:
        return None 
    if not verify_password(password, users.password):
        return None
    return users 

def get_user_role(db: Session, email: str ) -> Optional[int]:
    users = db.query(User).filter(User.email == email).first()
    return users.role_id if users else None

def get_user_preference(db: Session, email: str,selected_category_name: Optional[str] = None) -> Optional[int]:
    users = db.query(User).filter(User.email == email).first()
    role_id = users.role_id
    is_student = (role_id == 3)
        
    if is_student and selected_category_name:
        categories = db.query(Category).filter(
            Category.name.in_([name.strip() for name in selected_category_name])
        ).all()
        for category in categories:
                pref = UserPreference(
                    user_id=users.user_id,
                    category_id=category.category_id,
                    category_score=0.5
                )
                db.add(pref)
    db.commit()    
    print(f"✅ Added {len(categories)} preferences for user {users.user_id}")
    if not is_student:
        raise HTTPException(
            status_code=400, 
            detail=f"user is not student"
        )
def _validate_mti_email(email: str) -> bool:
    all_domains = STUDENT_DOMAINS + MANAGER_DOMAINS + MEDIA_DOMAINS + ADMIN_DOMAINS + STAKEHOLDER_DOMAINS
    return any(email.lower().endswith(f"@{domain}") for domain in all_domains)

STUDENT_DOMAINS = [
    "cs.mti.edu.eg", "eng.mti.edu.eg", "med.mti.edu.eg",
    "mgt.mti.edu.eg", "mc.mti.edu.eg", "nur.mti.edu.eg",
    "pt.mti.edu.eg", "den.mti.edu.eg", "ph.mti.edu.eg"
]
MANAGER_DOMAINS = ["mgr.mti.edu.eg"]
MEDIA_DOMAINS = ["media.mti.edu.eg"]
ADMIN_DOMAINS = ["admin.mti.edu.eg"]
STAKEHOLDER_DOMAINS = ["moe.gov.sa","scu.eg","gmail.com","mti.edu.eg","hotmail.com","naqaae.edu.eg"]

def register_validate_mti_email(email: str) -> bool:
    all_domains = STUDENT_DOMAINS + MANAGER_DOMAINS + MEDIA_DOMAINS + ADMIN_DOMAINS
    return any(email.lower().endswith(f"@{domain}") for domain in all_domains)

def _get_role_id_from_email(email: str) -> int:
   
    email_lower = email.lower()
    if any(email_lower.endswith(f"@{d}") for d in STUDENT_DOMAINS):
        return 3  # student
    elif any(email_lower.endswith(f"@{d}") for d in MANAGER_DOMAINS):
        return 4  # manager
    elif any(email_lower.endswith(f"@{d}") for d in MEDIA_DOMAINS):
        return 2  # media_advisor
    elif any(email_lower.endswith(f"@{d}") for d in ADMIN_DOMAINS):
        return 5  # admin
    else:
        return STAKEHOLDER_DOMAINS   

# app/services/user_service.py 
from typing import Tuple
import re

def validate_password(password: str) -> Tuple[bool, str]:
    """
    التحقق من قوة الباسورد - Backend Validation
    
    Requirements:
    1. At least 8 characters
    2. At least 3 of the following:
       - Lowercase letters (a-z)
       - Uppercase letters (A-Z)
       - Numbers (0-9)
       - Special characters (!@#$%^&*)
    3. No more than 2 identical characters in a row
    
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    errors = []
    
    # 1. Minimum length
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    
    # 2. Check character types
    has_lowercase = bool(re.search(r'[a-z]', password))
    has_uppercase = bool(re.search(r'[A-Z]', password))
    has_number = bool(re.search(r'[0-9]', password))
    has_special = bool(re.search(r'[!@#$%^&*]', password))
    
    char_types_count = sum([has_lowercase, has_uppercase, has_number, has_special])
    
    if char_types_count < 4:
        errors.append(
            "Password must contain at least 4 of the following: "
            "lowercase letters, uppercase letters, numbers, special characters"
        )
    
    # 3. No more than 2 identical characters in a row
    if re.search(r'(.)\1{2,}', password):
        errors.append("Password cannot contain more than 2 identical characters in a row")
    
    # Return result
    if errors:
        return False, "; ".join(errors)
    
    return True, ""


def validate_password_detailed(password: str) -> dict:
    """
    نسخة تفصيلية ترجع حالة كل متطلب على حدة
    (مفيدة للـ API response)
    """
    has_lowercase = bool(re.search(r'[a-z]', password))
    has_uppercase = bool(re.search(r'[A-Z]', password))
    has_number = bool(re.search(r'[0-9]', password))
    has_special = bool(re.search(r'[!@#$%^&*]', password))
    
    char_types_count = sum([has_lowercase, has_uppercase, has_number, has_special])
    
    return {
        "is_valid": len(password) >= 8 and char_types_count >= 4 and not bool(re.search(r'(.)\1{2,}', password)),
        "requirements": {
            "min_length": len(password) >= 8,
            "has_lowercase": has_lowercase,
            "has_uppercase": has_uppercase,
            "has_number": has_number,
            "has_special": has_special,
            "char_types_count": char_types_count,
            "has_four_of_four": char_types_count >= 4
        }
    }
# app/services/pending_registration.py
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
import threading

class PendingRegistrationStore:
    """تخزين مؤقت للتسجيلات المعلقة (قبل التحقق من OTP)"""
    
    _pending: Dict[str, dict] = {}
    _lock = threading.Lock()
    _expiry_minutes = 30  # صلاحية البيانات المعلقة 30 دقيقة
    
    @classmethod
    def store(cls, email: str, data: dict) -> bool:
        """تخزين بيانات التسجيل مؤقتاً"""
        email = email.lower().strip()
        with cls._lock:
            cls._pending[email] = {
                "data": data,
                "created_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(minutes=cls._expiry_minutes),
                "otp_verified": False
            }
        return True
    
    @classmethod
    def get(cls, email: str) -> Optional[dict]:
        """جلب البيانات المعلقة"""
        email = email.lower().strip()
        with cls._lock:
            record = cls._pending.get(email)
            if not record:
                return None
            # التحقق من الصلاحية
            if record["expires_at"] < datetime.now(timezone.utc):
                cls._pending.pop(email, None)
                return None
            return record
    
    @classmethod
    def mark_verified(cls, email: str) -> bool:
        """تسجيل أن الـ OTP تم التحقق منه"""
        email = email.lower().strip()
        with cls._lock:
            record = cls._pending.get(email)
            if record:
                record["otp_verified"] = True
                return True
        return False
    
    @classmethod
    def is_verified(cls, email: str) -> bool:
        """التحقق من أن الـ OTP تم تأكيده"""
        email = email.lower().strip()
        with cls._lock:
            record = cls._pending.get(email)
            if not record:
                return False
            if record["expires_at"] < datetime.now(timezone.utc):
                cls._pending.pop(email, None)
                return False
            return record.get("otp_verified", False)
    
    @classmethod
    def get_data(cls, email: str) -> Optional[dict]:
        """جلب بيانات التسجيل للفظها في الداتابيز"""
        email = email.lower().strip()
        with cls._lock:
            record = cls._pending.get(email)
            if record and record.get("otp_verified"):
                return record["data"]
            return None
    
    @classmethod
    def cleanup(cls, email: str) -> bool:
        """حذف البيانات المعلقة بعد التسجيل الناجح"""
        email = email.lower().strip()
        with cls._lock:
            if email in cls._pending:
                cls._pending.pop(email, None)
                return True
        return False


# ✅ Instance عالمية
pending_store = PendingRegistrationStore()