from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime
from pgvector.sqlalchemy import Vector

class Article(Base):
    __tablename__ = "articles"

    article_id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)
    # newsletter_id = Column(Integer, ForeignKey("newsletters.newsletter_id"), nullable=True, unique=False)
    
    # المستشار الإعلامي المسؤول عن النشر
    university_media_adviser = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    
    status = Column(Text, default="draft") # pending, vectorized, published
    
    # عمود التاريخ بصيغة TimeZone (timestamptz)
    published_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # عمود الفيكتور (Embedding)
    embedding = Column(Vector(384))
    # العلاقات (اختياري حسب الجداول الأخرى عندك)
    publisher = relationship("User")