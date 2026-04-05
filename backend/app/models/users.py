from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base
from sqlalchemy.orm import relationship
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=True)
    role_id = Column(Integer, ForeignKey("roles.role_id"), nullable=True) # 1: Student, 2: Editor, etc.
    full_name = Column(String)
    faculty = Column(String, nullable=True)
    student_id = Column(Integer, unique=True, nullable=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    # يخزن أوزان الاهتمامات بشكل رياضي (Embedding)
    preference_vector = Column(JSON, nullable=True)

    roles = relationship("Role", back_populates="users") 