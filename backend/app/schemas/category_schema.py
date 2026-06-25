# # schemas/category_schema.py
# from pydantic import BaseModel
# from typing import List, Optional

# class ArticlePreview(BaseModel):
#     article_id: int
#     title: str
#     summary: str
#     content: str
#     photo: Optional[str] = None
#     published_at: str

# class CategoryNewsResponse(BaseModel):
#     category_name: str
#     category_id: int
#     articles: List[ArticlePreview]