from sqlalchemy import Column, Integer, ForeignKey, DateTime 
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Newsletter(Base):
    __tablename__ = "newsletters"

    newsletter_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    articles_count = Column(Integer, default=0)
    edition = Column(Integer, nullable=True)
    published_date = Column(DateTime(timezone=True), server_default=func.now())

    # التعديل هنا: هنستخدم اسم واحد ونوحد الـ back_populates
    newsletter_articles = relationship(
        "NewsletterArticle", 
        back_populates="newsletter", 
        overlaps="articles",
        cascade="all, delete-orphan" # إضافة اختيارية لتمسح المقالات المرتبطة لو النشرة اتمسحت
    )