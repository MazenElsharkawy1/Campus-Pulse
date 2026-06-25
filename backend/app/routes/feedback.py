from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.database import get_db
from app.models.users import User
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate

router = APIRouter( tags=["feedback"])

@router.post("/feedback")

def create_feedback(
    feedback: FeedbackCreate,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == feedback.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found with this email")
    user_id = user.user_id
    db_feedback = Feedback(
        comment=feedback.comment,
        reaction=feedback.reaction, 
        newsletter_id=feedback.newsletter_id,
        user_id=user_id, 
        created_at=datetime.utcnow()
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return {
        "status": "success",
        "message": "Feedback submitted successfully",
        "feedback_id": db_feedback.feedback_id
    }