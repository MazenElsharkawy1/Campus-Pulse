from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional

class NewsletterBase(BaseModel):
    user_id: int
    articles_count: int

# محتاجين سكيما صغيرة لشكل الخبر جوه النشرة
class NewsletterArticleSchema(BaseModel):
    article_id: int
    title: str
    summary: str
    photo: Optional[str] = None
    position: int # ترتيب الخبر (1 لـ 6)

class NewsletterResponse(BaseModel):
    newsletter_id: int
    user_id: int
    edition: int
    published_date: datetime
    articles_count: int
    # التعديل: إضافة لستة الأخبار عشان الفرونت إند يستلم كل حاجة في ريكويست واحد
    articles: List[NewsletterArticleSchema] = []

    model_config = ConfigDict(from_attributes=True)
    
    # إضافة الحقل ده لو هتحتاجي ترجعي الأخبار جوه النشرة في ريكويست واحد
    # articles: Optional[List[ArticleInNewsletter]] = None