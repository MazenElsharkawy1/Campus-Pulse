# models/newsletter_article.py
from sqlalchemy import Column, Integer, ForeignKey, Float,Boolean
from sqlalchemy.orm import relationship
from app.db.database import Base

class NewsletterArticle(Base):
    __tablename__ = "newsletter_articles"

    newsletter_id = Column(Integer, ForeignKey("newsletters.newsletter_id"), primary_key=True)
    article_id = Column(Integer, ForeignKey("articles.article_id"), primary_key=True)
    is_opened = Column(Boolean, default=False)  # 0: not opened, 1: opened
    open_counter = Column(Integer, default=0, server_default="0")
    share_counter = Column(Integer, default=0, server_default="0")
    rank_score = Column(Float, nullable=True)
    position = Column(Integer, nullable=True)

    # ✅ علاقة واحدة مع Article
    article = relationship("Article", back_populates="newsletter_articles")
    
    # ✅ علاقة واحدة مع Newsletter
    newsletter = relationship(
        "Newsletter", 
        back_populates="newsletter_articles", 
        overlaps="articles"
    )