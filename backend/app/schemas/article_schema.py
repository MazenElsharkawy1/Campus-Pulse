from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime



# --- 1. البيانات الكاملة للخبر (دمج JSON + DB) ---
class ArticlesDashboardResponse(BaseModel):
    article_id: int
    title: str          # من الـ JSON
    summary: str        # من الـ JSON
    category_id: int
    status: str
    # scrapped_at: datetime
    # تاريخ النشر هيظهر هنا لو الخبر حالته published
    published_at: Optional[datetime] = None 
    
    model_config = ConfigDict(from_attributes=True)

# --- 2. طلب النشر (Publish Request) ---
class ArticlesPublishRequest(BaseModel):
    article_id: int
    adviser_id: int
    final_summary: str  # التلخيص الذي تم اعتماده للنشر فوراً

# --- 3. العرض للجمهور حسب الكاتيجوري ---
class ArticlesPublicView(BaseModel):
    article_id: int
    title: str
    summary: str
    photo: Optional[str] = None
    category_id: int
    published_at: datetime  # لازم يكون موجود للأخبار المنشورة
    newsletter_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- 4. رد بسيط للتأكيد ---
class ArticlesActionResponse(BaseModel):
    message: str
    article_id: int
    status: str


class ArticleBase(BaseModel):
    title: str
    category_id: int
    status: str = "published"

class ArticleCreate(ArticleBase):
    # البيانات اللي بنحتاجها وقت ما المحرر ينشر الخبر
    content_summary: str
    embedding: List[float] # الفيكتور اللي الموديل بيطلعه

class ArticleResponse(ArticleBase):
    article_id: int
    published_at: Optional[datetime] = None
    embedding: Optional[List[float]] = None # الفيكتور المخزن في الداتابيز

    model_config = ConfigDict(from_attributes=True)

# سكيما مخصصة للـ Dashboard (اللي بترجع للطالب)
class DashboardArticle(BaseModel):
    article_id: int
    title: str
    summary: str
    image: Optional[str] = None
    category: Optional[str] = None
    rank_score: float = Field(..., description="درجة الملاءمة للطالب")

    model_config = ConfigDict(from_attributes=True)