from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.database import Base
from pgvector.sqlalchemy import Vector

class Article(Base):
    __tablename__ = "articles"

    article_id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)
    university_media_adviser = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    status = Column(Text, default="draft")
    published_at = Column(DateTime(timezone=True), server_default=func.now())
    embedding = Column(Vector(384))

    publisher = relationship("User")
    category = relationship("Category", back_populates="articles")
    newsletter_articles = relationship("NewsletterArticle", back_populates="article")