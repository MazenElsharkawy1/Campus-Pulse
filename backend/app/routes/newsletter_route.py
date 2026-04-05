# backend/app/routes/newsletter_route.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.newsletter_service import NewsletterService
from app.schemas.newsletter_article_schema import NewsletterDashboardResponse # استيراد السكيما اللي عملناها

router = APIRouter()

@router.get("/dashboard/newsletter", response_model=NewsletterDashboardResponse)
async def get_student_newsletter(
    email: str = Query(..., description="The email of the student"), 
    db: Session = Depends(get_db)
):
    try:
        # السيرفيس دلوقتي ذكية: بتعرف لو الطالب جديد بتعمله أسبوع كامل، ولو قديم بتجيب نشرته
        result = await NewsletterService.get_daily_newsletter(db, email)
        return result
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        # دي عشان لو فيه غلطة في الـ JSON أو الداتابيز تظهرلك بوضوح
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")