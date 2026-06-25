from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from datetime import datetime
from app.db.database import Base
class Feedback(Base):
    __tablename__ = "feedback"

    feedback_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    newsletter_id = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    reaction = Column(Text, nullable=True) 
    created_at = Column(DateTime, default=datetime.utcnow)