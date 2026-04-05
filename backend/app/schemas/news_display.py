from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# --- 1. للعرض العام (Feed & Lists) ---
class NewsSummaryResponse(BaseModel):
    """بيانات الخبر المختصرة اللي بتظهر في الكارد"""
    newsletter_id: int        # تم التعديل من news_id
    title: str
    summary: str
    category_id: int          # تم التعديل من category (string) لـ category_id (int)
    publish_date: datetime    # تم التعديل من published_date
    views_content: int = 0    # تم التعديل ليطابق مسمى الموديل views_content
    
    model_config = ConfigDict(from_attributes=True)

# --- 2. للتفاصيل الكاملة (Read More) ---
class NewsDetailResponse(NewsSummaryResponse):
    """بيانات الخبر الكاملة لما اليوزر يدوس 'إقرأ المزيد'"""
    # لاحظي: لو عندك نص الخبر الكامل في السوبابيز اسمه raw_content سيبيه كما هو
    raw_content: Optional[str] = None 

# --- 3. للداشبورد المخصص (Personalized) ---
class PersonalizedNewsItem(BaseModel):
    """خبر داخل الداشبورد المخصص مع درجة التشابه (Similarity Score)"""
    newsletter_id: int
    title: str
    summary: str
    category_id: int
    publish_date: datetime
    # درجة التخصيص اللي هنطلعها من عملية الـ Vector Search (Cosine Similarity)
    relevance_score: Optional[float] = None 
    
    model_config = ConfigDict(from_attributes=True)

# --- 4. للعرض حسب التصنيف (Category View) ---
class CategoryGroupResponse(BaseModel):
    """مجموعة أخبار تحت تصنيف معين كما تظهر في صفحة الكاتيجوري"""
    category_id: int
    category_name: str
    news_list: List[NewsSummaryResponse]