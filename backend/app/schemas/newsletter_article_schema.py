from pydantic import BaseModel, ConfigDict
from typing import Optional

class NewsletterArticleBase(BaseModel):
    newsletter_id: int
    article_id: int
    is_opened: bool = False
    position: Optional[int] = None 
    rank_score: Optional[float] = None 

class NewsletterArticleResponse(NewsletterArticleBase):
    model_config = ConfigDict(from_attributes=True)

# السكيما المجمعة اللي هتروح للفرونت إند
class ArticleInNewsletter(BaseModel):
    article_id: int
    title: str
    summary: str
    image_url: Optional[str] = None  
    category_id: int
    is_opened: bool
    position: int 
    published_at: str 
    
    # التعديل المهم هنا: بنسمح للـ Pydantic يقرأ من الـ Dictionaries اللي بنبعتها
    model_config = ConfigDict(from_attributes=True) 

# سكيما الرد النهائي اللي بتجمع كل حاجة (الـ Dashboard)
class NewsletterDashboardResponse(BaseModel):
    student_name: str
    edition: int
    newsletter_date: str
    newsletter_id: int
    articles: list[ArticleInNewsletter]