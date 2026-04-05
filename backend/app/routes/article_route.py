from fastapi import APIRouter, HTTPException
from typing import List
from app.services.article_service import ArticleService
from app.schemas.article_schema import ArticlesPublishRequest, ArticlesDashboardResponse

router = APIRouter(prefix="/articles", tags=["Articles Workflow"])

@router.get("/review-queue", response_model=List[ArticlesDashboardResponse])
async def get_article_for_review():
    """عرض المقالات الـ vectorized للمستشار الإعلامي"""
    return ArticleService.get_vectorized_article()

@router.post("/publish")
async def publish(data: ArticlesPublishRequest):
    """اعتماد النشر وتحديث البيانات"""
    # هنا شيلنا الـ newsletter_id من الاستدعاء
    updated = ArticleService.publish_article(
        article_id=data.article_id,
        adviser_id=data.adviser_id,
        final_summary=data.final_summary
    )
    if not updated:
        raise HTTPException(status_code=400, detail="فشل في عملية النشر")
    return {"message": "Article published successfully", "articles": updated}