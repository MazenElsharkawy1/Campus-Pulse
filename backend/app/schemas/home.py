# app/schemas/home.py
from pydantic import BaseModel
from typing import List, Optional

class ArticlePreview(BaseModel):
    article_id: int
    title: str
    summary: Optional[str] = "No summary available"
    category: str
    photo: Optional[str] = None

class HomePageResponse(BaseModel):
    announcements: List[ArticlePreview]