from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, unique=True, nullable=False)
    phone = Column(String, unique=True, nullable=True)
    role_id = Column(Integer, ForeignKey("roles.role_id"), nullable=True) 
    full_name = Column(String)
    faculty = Column(String, nullable=True)
    student_id = Column(Integer, unique=True, nullable=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    preference_vector = Column(Vector(384), nullable=True)

    roles = relationship("Role", back_populates="users") 
    report_permission = relationship("ReportPermission", back_populates="users", uselist=False)
    newsletters = relationship("Newsletter", back_populates="users")
    user_preferences = relationship("UserPreference", back_populates="users")
    