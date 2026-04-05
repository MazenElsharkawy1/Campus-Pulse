
from sqlalchemy import Column, Integer, ForeignKey, Float
from app.db.database import Base

class UserPreference(Base):
    __tablename__ = "user_preferences"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    category_id = Column(Integer, ForeignKey("categories.category_id"), primary_key=True)
    # رقم يعبر عن مدى الاهتمام (مثلاً من 0 لـ 1)
    category_score = Column(Float, default=0.0)
