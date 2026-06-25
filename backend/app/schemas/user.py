from pydantic import BaseModel
from typing import Optional, List   
from realtime import BaseModel

class InterestItem(BaseModel):
    name: str

class UserRegister(BaseModel):
    email: str
    password: str
    interests: Optional[List[InterestItem]] = None



class UserProfileResponse2(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    selected_categories: List[str] = []  
    deleted_categories: List[str] = []  
    class Config:
        from_attributes = True

class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    confirm_password: Optional[str] = None
    preferences: Optional[List[int]] = None  

class UserProfileResponse(BaseModel):
    email: str
    student_profile_picture: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    password: str                   
    faculty: Optional[str] = None
    role: str
    student_id: Optional[int] = None
    preferences: List[str] = []      
    class Config:
        from_attributes = True

class UserProfileResponse3(BaseModel):
    email: str
    password: str                     
    class Config:
        from_attributes = True        