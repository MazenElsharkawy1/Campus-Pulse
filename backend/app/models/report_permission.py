from sqlalchemy import JSON, Column, Integer, ForeignKey, DateTime, Text, Boolean, UniqueConstraint, UniqueConstraint 
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class ReportPermission(Base):
    __tablename__ = "report_permissions"

    id = Column(Integer, primary_key=True, index=True)
    stakeholder_id = Column(Integer, ForeignKey("stakeholders.stakeholder_id"), nullable=False)
    view_name = Column(Text)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    report_data = Column(JSON, nullable=True) 
    is_read = Column(Boolean, default=False) 
    manager_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
   
    users = relationship("User", back_populates="report_permission")
    stakeholders = relationship("Stakeholder", back_populates="report_permissions")
__table_args__ = (UniqueConstraint('stakeholder_id', 'view_name', name='uq_stakeholder_view'),)