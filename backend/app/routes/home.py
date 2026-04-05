# app/api/v1/home.py
from fastapi import APIRouter
from app.services.home_service import get_announcements_only
from app.schemas.home import HomePageResponse

router = APIRouter(prefix="/api/v1", tags=["Home"])

@router.get("/home", response_model=HomePageResponse)
async def get_home_page():
    announcements = get_announcements_only()
    return {"announcements": announcements}