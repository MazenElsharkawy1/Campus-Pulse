# app/schemas/user.py
from pydantic import BaseModel
from typing import Optional, List   
from realtime import BaseModel

# أو أفضل: عرّف نموذجًا فرعيًا
class InterestItem(BaseModel):
    name: str

class UserRegister(BaseModel):
    email: str
    password: str
    interests: Optional[List[InterestItem]] = None



class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str  # اسم الدور (مثل "student")

    class Config:
        from_attributes = True

class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    confirm_password: Optional[str] = None
      # فقط إذا أراد تغييره    