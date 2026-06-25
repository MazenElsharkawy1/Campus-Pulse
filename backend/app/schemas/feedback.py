from pydantic import BaseModel
from typing import Optional

class FeedbackCreate(BaseModel):
    email: str
    newsletter_id: int
    reaction: Optional[str] = None
    comment: Optional[str] = None

class FeedbackResponse(BaseModel):
    feedback_id: int
    comment: Optional[str]
    reaction: Optional[str]
    created_at: str
    newsletter_id: int
    email: str 
    user_id: int   