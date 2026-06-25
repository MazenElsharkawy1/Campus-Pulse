# backend/app/schemas/article_schema.py
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime

class ArticlesDashboardResponse(BaseModel):
    article_id: int
    title: str          
    summary: str        
    category_id: int
    status: str
    published_at: Optional[datetime] = None 
    
    model_config = ConfigDict(from_attributes=True)

class ArticlesPublishRequest(BaseModel):
    article_id: int
    email: str  
    final_summary: Optional[str] = None 

class ArticlesPublicView(BaseModel):
    article_id: int
    title: str
    summary: str
    photo: Optional[str] = None
    category_id: int
    published_at: datetime 
    newsletter_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class ArticlesActionResponse(BaseModel):
    message: str
    article_id: int
    status: str

class ArticleBase(BaseModel):
    title: str
    category_id: int
    status: str = "published"

class ArticleCreate(ArticleBase):
    content_summary: str
    embedding: List[float] 

class ArticleResponse(ArticleBase):
    article_id: int
    published_at: Optional[datetime] = None
    embedding: Optional[List[float]] = None 
    model_config = ConfigDict(from_attributes=True)

class ArticleResponse2(ArticleBase):
    article_id: int
    published_at: Optional[datetime] = None
    summary: Optional[str] = None
    category:  Optional[str] = None
    category_id: Optional[int] = None
    photo: Optional[str] = None
    original_media_url: Optional[str] = None 
    model_config = ConfigDict(from_attributes=True)

class DashboardArticle(BaseModel):
    article_id: int
    title: str
    summary: str
    image: Optional[str] = None
    category: Optional[str] = None
    rank_score: float = Field(..., description="درجة الملاءمة للطالب")

    model_config = ConfigDict(from_attributes=True)

class ArticlesPinned(BaseModel):
    article_id: int
    title: str
    summary: str
    image: Optional[str] = None
    category: Optional[int] = None  # 🔁 غيرنا من str إلى int
    published_at: datetime
    model_config = ConfigDict(from_attributes=True)    