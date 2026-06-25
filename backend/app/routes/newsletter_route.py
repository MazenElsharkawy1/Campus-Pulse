# backend/app/routes/newsletter_route.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.newsletter_service import NewsletterService
from app.schemas.newsletter_article_schema import NewsletterDashboardResponse
from app.schemas.newsletter_schema import NewsletterArchiveItem
from typing import List

router = APIRouter(tags=["dashboard"])

@router.get("/dashboard/newsletter", response_model=NewsletterDashboardResponse)
async def get_student_newsletter(
    email: str = Query(..., description="The email of the student"), 
    db: Session = Depends(get_db)
):
    try:
        result = await NewsletterService.get_daily_newsletter(db, email)
        return result
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/archive", response_model=List[NewsletterArchiveItem])
def get_user_newsletter_archive(
    email: str = Query(..., description="Email of the student"), 
    db: Session = Depends(get_db)
):
    return NewsletterService.get_newsletter_archive(db, email)



@router.get("/newsletter/details", response_model=NewsletterDashboardResponse)
def get_newsletter_full_details(
    newsletter_id: int = Query(..., description="ID of the specific newsletter"),
    db: Session = Depends(get_db)
):
   
    return NewsletterService.get_specific_newsletter(db, newsletter_id)