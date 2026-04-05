from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    faculty: str
    student_id: str
    role_id: int # Foreign Key من جدول الأدوار

class UserCreate(UserBase):
    password: str # تُستخدم عند التسجيل فقط

class UserResponse(UserBase):
    user_id: int
    joined_at: datetime
    preference_vector: Optional[List[float]] = None
    
    # إضافة الحقل ده عشان لما نسحب اليوزر نعرف اسم الـ Role بتاعه (student/admin)
    # وده اللي بنستخدمه في الـ Check اللي في السيرفيس
    role_name: Optional[str] = None 

    model_config = ConfigDict(from_attributes=True)