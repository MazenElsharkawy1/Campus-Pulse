from sqlalchemy import Column, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship # ضيفي السطر ده
from app.db.database import Base

class NewsletterArticle(Base):
    __tablename__ = "newsletter_articles"

    newsletter_id = Column(Integer, ForeignKey("newsletters.newsletter_id"), primary_key=True)
    article_id = Column(Integer, ForeignKey("articles.article_id"), primary_key=True)
    is_opened = Column(Boolean, default=False)
    rank_score = Column(Integer, nullable=True) 
    position = Column(Integer, nullable=True)

    # التعديل هنا: نستخدم back_populates بدل backref عشان يطابق الملف التاني
    newsletter = relationship(
        "Newsletter", 
        back_populates="newsletter_articles", 
        overlaps="articles"
    )