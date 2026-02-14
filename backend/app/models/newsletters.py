from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from app.db.databse import Base


class News(Base):
    __tablename__ = "newsletters"
    news_id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    raw_content = Column(String)
    summary = Column(String, nullable=True)
    status = Column(String, default="draft")  # draft, submitted, etc.
    is_verified = Column(Boolean, default=False)  # 0 for false, 1 for true
    pr_id = Column(Integer, ForeignKey("users.users.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("users.users.id"), nullable=True)
