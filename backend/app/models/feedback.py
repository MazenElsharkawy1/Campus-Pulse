from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from datetime import datetime
from app.db.database import Base

class Feedback(Base):
    __tablename__ = "feedback"

    # الأسماء دي مطابقة للصورة اللي بعتيها من سوبا بيز
    feedback_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    comment = Column(Text, nullable=True)
    reaction = Column(Integer, nullable=True) # اللي هو الـ reaction في الكود القديم
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # الأعمدة اللي عليها علامة "الربط" الخضراء في الصورة
    newsletter_id = Column(Integer, nullable=False) 
    user_id = Column(Integer, nullable=False) 

    def to_dict(self) -> dict:
        return {
            "feedback_id": self.feedback_id,
            "comment": self.comment,
            "reaction": self.reaction,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "newsletter_id": self.newsletter_id,
            "user_id": self.user_id
        }