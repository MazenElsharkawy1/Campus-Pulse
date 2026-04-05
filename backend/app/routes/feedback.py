from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.db.database import get_db
from app.models.feedback import Feedback   
from app.schemas.feedback import FeedbackResponse, FeedbackCreate
router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

@router.post("/", response_model=FeedbackResponse)
def create_feedback(
    feedback: FeedbackCreate,
    db: Session = Depends(get_db)
):
    # إنشاء سجل جديد
    db_feedback = Feedback(
        comment=feedback.comment,
        reaction=feedback.reaction,  # غيرناه من rating لـ reaction في المودل
        newsletter_id=feedback.newsletter_id,
        user_id=feedback.user_id,
        created_at=datetime.utcnow()
    )

    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)

    return db_feedback.to_dict()  # بيستخدم الدالة اللي موجودة عندك
