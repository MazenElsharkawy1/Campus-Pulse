from fastapi import APIRouter, Depends, HTTPException
from app.services.approval_service import send_news_to_manager
from app.schemas.news import NewsSubmit, News
from app.db.databse import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/approval", tags=["Approval Workflow"])

@router.post("/send-to-manager", response_model=News)
def send_to_manager(submit_data: NewsSubmit, db: Session = Depends(get_db)):
    try:
        return send_news_to_manager(submit_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))