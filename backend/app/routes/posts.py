from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.article import Article
from app.models.category import Category
from app.services.ai_modules import process_text
import json
from datetime import datetime
from app.services.post_service import ArticleService
from update_json import save_single_article 


router = APIRouter(prefix="/api/posts", tags=["Posts"])

JSON_FILE_PATH = r"C:\campus_pulse\scraper\webscraping\campuspulse_posts.json"
with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
            articles = json.load(f)
   

@router.get("/clean-articles")
async def get_pinned_articles(
    db: Session = Depends(get_db)
):
    articles = ArticleService.get_cleaned_articles(db)  
    return  articles
    
    
@router.post("/sync-articles")
def sync_multiple_articles(
    db: Session = Depends(get_db)
):
    results = {"success": []}  
    for item in articles:
        article_id = item.get("article_id")   
        try:
            db_article = db.query(Article).filter(
                Article.article_id == article_id,
                Article.status == "cleaned"
            ).first()
            if not db_article:
                continue
            content = item.get("content", "").strip()
            if len(content) < 30:
                results["failed"].append({"article_id": article_id, "reason": "محتوى قصير"})
                continue
            ai_result = process_text(text=content)
            category_name = ai_result.get("category", "general news")
            db_category = db.query(Category).filter(Category.name == category_name).first()
            category_id = db_category.category_id if db_category else None
            db_article.status = "pending"
            db_article.category_id = category_id
            db_article.embedding = ai_result["text_vector"]
            updated_article = {
                "article_id": article_id,
                "source":  item.get("source"),
                "title": item.get("title", ""),
                "content": content,
                "summary": ai_result["summary"],
                "category": category_name,
                "photo":   item.get("photo", ""),
                "original_media_url": item.get("original_media_url", ""),
                "processed_at": datetime.now().isoformat(),
            }
            save_single_article(updated_article)
            results["success"].append(article_id)
        except Exception as e:
            raise
    db.commit()  
    return {
        "message": f"تمت معالجة {len(results['success'])} ",
        "details": results
    }