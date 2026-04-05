from sqlalchemy import Column, Integer, TEXT
from sqlalchemy.orm import relationship
from app.db.database import Base

class Role(Base):
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, index=True)
    name = Column(TEXT, nullable=False, unique=True) # مثلاً: Student, Advisor, Admin

    # علاقة مع جدول اليوزرز (كل رول ممكن يكون تحتها يوزرز كتير)
    users = relationship("User", back_populates="roles")