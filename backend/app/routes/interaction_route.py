# routes/interaction_route.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.newsletter_article_schema import UserOpeningUpdate, UserSharingUpdate
from app.services.interaction_service import InteractionService

router = APIRouter(prefix="/interactions", tags=["Interactions"])

@router.post("/track_opening")
def track_user_opening(payload: UserOpeningUpdate, db: Session = Depends(get_db)):
    success = InteractionService.track_interaction(
        db=db,
        email=payload.email,
        newsletter_id=payload.newsletter_id,  # ✅ ده اللي هيتمرر للـ Re-rank
        article_id=payload.article_id,
        action_type="open",
        db_field="open_counter",
        weight=0.02
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to track opening")
    return {"message": "Opening tracked successfully"}


@router.post("/track_sharing")
def track_user_sharing(payload: UserSharingUpdate, db: Session = Depends(get_db)):
    success = InteractionService.track_interaction(
        db=db,
        email=payload.email,
        newsletter_id=payload.newsletter_id,
        article_id=payload.article_id,
        action_type="share",
        db_field="share_counter", # ✅ يجب أن يطابق اسم العمود في الموديل
        weight=0.06               # ✅ وزن متوازن للشير (أقوى بـ 3 مرات لكن آمن)
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to track sharing")
    return {"message": "Sharing tracked successfully"}