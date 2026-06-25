from sqlalchemy import Column, Integer, Text
from app.db.database import Base
from sqlalchemy.orm import relationship
class Stakeholder(Base):

    __tablename__ = "stakeholders"
    stakeholder_id = Column(Integer, primary_key=True)
    official_email = Column(Text, unique=True)
    name = Column(Text)
    password = Column(Text)
    head = Column(Text)  
    
    report_permissions = relationship("ReportPermission", back_populates="stakeholders")
    
    
    