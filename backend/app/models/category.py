from sqlalchemy import Column, Integer, Text
from app.db.database import Base
from sqlalchemy.orm import relationship

class Category(Base):
    __tablename__ = "categories"
    category_id = Column(Integer, primary_key=True)
    name = Column(Text, unique=True)

    def to_dict(self) -> dict:
        return {
            "category_id": self.category_id,
            "name": self.name
        }
    user_preferences = relationship("UserPreference", back_populates="category")
    articles = relationship("Article", back_populates="category")
    