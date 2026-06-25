# app/schemas/auth.py
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    faculty: Optional[str] = None
    student_id: Optional[int] = None
    category_names: List[str] = []

class RegisterResponse(BaseModel):
    status: str
    message: str
    user: dict

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    status: str
    message: str
    access_token: str
    token_type: str
    user: dict