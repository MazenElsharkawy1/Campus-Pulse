from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional

class NewsletterBase(BaseModel):
    user_id: int
    articles_count: int

class NewsletterArticleSchema(BaseModel):
    article_id: int
    title: str
    summary: str
    photo: Optional[str] = None
    position: int
    source: str = ""

class NewsletterResponse(BaseModel):
    newsletter_id: int
    user_id: int
    edition: int
    published_date: datetime
    articles_count: int
    articles: List[NewsletterArticleSchema] = []
    last_update: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
    
class NewsletterArchiveItem(BaseModel):
    newsletter_id: int
    edition: int
    published_date: Optional[str] = None
    articles_count: int