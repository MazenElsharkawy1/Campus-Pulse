from pydantic import BaseModel
from typing import Optional

class FeedbackCreate(BaseModel):
    user_id: int                # غيرناه من user_email لـ user_id (أفضل مع foreign key)
    newsletter_id: int                # مطابق لـ news_id في المودل
    reaction: Optional[int] = None   # بدل reaction (يمكن تكون 1-5 أو emoji code)
    comment: Optional[str] = None

class FeedbackResponse(BaseModel):
    feedback_id: int
    comment: Optional[str]
    reaction: Optional[int]
    created_at: str
    newsletter_id: int
    user_id: int    