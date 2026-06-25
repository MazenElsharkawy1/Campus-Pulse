# schemas/newsletter_article_schema.py
from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional, Literal

class NewsletterArticleBase(BaseModel):
    newsletter_id: int
    article_id: int
    is_opened: bool = False
    position: Optional[int] = None 
    rank_score: Optional[float] = None 

class NewsletterArticleResponse(NewsletterArticleBase):
    model_config = ConfigDict(from_attributes=True)

class ArticleInNewsletter(BaseModel):
    article_id: int
    title: str
    summary: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None  
    category_id: int
    # open_counter: int = 0
    # share_counter: int = 0
    position: int 
    published_at: str 
    source: str = ""
    model_config = ConfigDict(from_attributes=True) 


class NewsletterDashboardResponse(BaseModel):
    student_name: str
    student_profile_picture: Optional[str] =None
    edition: int
    newsletter_date: str
    newsletter_id: int
    articles: list[ArticleInNewsletter]


class UserOpeningUpdate(BaseModel):
    email: EmailStr
    newsletter_id: int
    article_id: int

class UserSharingUpdate(BaseModel):
    email: EmailStr
    newsletter_id: int
    article_id: int