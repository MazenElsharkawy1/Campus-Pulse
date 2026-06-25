#models\user_preference.py
from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime, func
from app.db.database import Base
from sqlalchemy.orm import relationship

class UserPreference(Base):
    __tablename__ = "user_preferences"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    category_id = Column(Integer, ForeignKey("categories.category_id"), primary_key=True)
    category_score = Column(Float, default=0.5)
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    category = relationship("Category", back_populates="user_preferences")
    users = relationship("User", back_populates="user_preferences")