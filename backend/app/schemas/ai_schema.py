from pydantic import BaseModel
from typing import List

class ArticleInput(BaseModel):
    id: int
    content: str
    title: str = ""

class ArticleOutput(BaseModel):
    post_id: int
    title: str
    summary: str
    category: str
    confidence: float
    text_vector: List[float]  # تمثيل SBERT