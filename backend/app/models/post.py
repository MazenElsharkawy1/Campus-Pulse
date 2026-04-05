from sqlalchemy import Column, Integer, Text, DateTime
from sqlalchemy.sql import func
from app.db.database import Base
from datetime import datetime
from pgvector.sqlalchemy import Vector

# class Post(Base):
    # __tablename__ = "articles"

    # article_id = Column(Integer, primary_key=True, index=True)
    # category_id = Column(Integer, nullable=False)
    # university_media_adviser = Column(Integer, nullable=True)
    # published_at = Column(DateTime(timezone=True), server_default=func.now())
    # status = Column(Text, nullable=True)
    # embedding = Column(Vector(384))
    # def __init__(self, title: str, content: str, category: str):
    #     self.article_id = None  # هيتحدد عند الإضافة
    #     self.title = title
    #     self.summary = content[:150] + "..." if len(content) > 150 else content
    #     self.content = content
    #     self.category = category
    #     self.created_at = datetime.now().isoformat()

    # def to_dict(self) -> dict:
    #     return {
    #         "id": self.article_id,
    #         "title": self.title,
    #         "summary": self.summary,
    #         "content": self.content,
    #         "category": self.category,
    #         "vector": self.embedding,
    #         "created_at": self.created_at
    #    }
class Category(Base):
    __tablename__ = "categories"
    category_id = Column(Integer, primary_key=True)
    name = Column(Text, unique=True)

    def to_dict(self) -> dict:
        return {
            "category_id": self.category_id,
            "name": self.name
        }
    