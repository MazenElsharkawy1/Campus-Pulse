from http.client import HTTPException
from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
router = APIRouter( tags=["Help"])

class Contact(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

@router.get("/")
def home():
    return {"message": "Backend is working"}

@router.post("/contact")
def send_contact(data: Contact):
    if len(data.message) < 5:
        raise HTTPException(status_code=400, detail="Message too short")

    print({
        "name": data.name,
        "email": data.email,
        "subject": data.subject,
        "message": data.message
    })

    return {
        "success": True,
        "message": "Message sent successfully"
    }