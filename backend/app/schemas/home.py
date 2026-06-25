# ============================================================================
# 📋 Campus Pulse - Home Page Schemas (Pydantic Models)
# ============================================================================

from pydantic import BaseModel
from typing import List, Optional


class UnifiedPost(BaseModel):
    """
    نموذج موحد لكل أنواع البوستات في الـ Home Page
    """
    id: str                          # "ann_123" أو "sub_456"
    title: str                       # عنوان البوست
    content: str                     # التصنيف
    sammary: Optional[str] = None     # ملخص (لـ Announcements)
    image_url: Optional[str] = None  # صورة البوست
    published_at: Optional[str] = None  # تاريخ النشر
    source: str                      # "announcement" أو "stakeholder"
    
    # حقول اختيارية للـ Stakeholder Posts
    stakeholder_name: Optional[str] = None
    stakeholder_organization: Optional[str] = None
    
    class Config:
        from_attributes = True


class HomeFeedResponse(BaseModel):
    """
    Response للـ Home Page: قائمة موحدة من كل البوستات
    """
    posts: List[UnifiedPost]         # كل البوستات في قائمة واحدة
    total_count: int                 # العدد الكلي
    last_updated: str                # وقت آخر تحديث
    
    class Config:
        json_schema_extra = {
            "example": {
                "posts": [
                    {
                        "id": "sub_1",
                        "title": "ورشة عمل عن الذكاء الاصطناعي",
                        "content": "ندعوكم لحضور ورشة عمل...",
                        "category": "Workshops",
                        "image_url": "https://example.com/ai.jpg",
                        "published_at": "2026-04-28T14:20:00+00:00",
                        "source": "stakeholder",
                    }
                ],
                "total_count": 25,
                "last_updated": "2026-04-29T14:30:00+00:00"
            }
        }


class DebugResponse(BaseModel):
    """Response للـ Debug Endpoint"""
    announcements_file: dict
    submissions_file: dict
    unified_feed: dict