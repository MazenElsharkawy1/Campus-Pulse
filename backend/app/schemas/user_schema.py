from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    faculty: Optional[str] = None
    student_id: Optional[str] = None
    user_id: int 
    role_id: int

class UserCreate(UserBase):
    password: str 

class UserResponse(UserBase):
    user_id: int
    joined_at: datetime
    preference_vector: Optional[List[float]] = None
    role_name: Optional[str] = None 

    model_config = ConfigDict(from_attributes=True)