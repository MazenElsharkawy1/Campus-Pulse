import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from fastapi import HTTPException
from supabase import create_client, Client
from app.schemas.article_schema import ArticleResponse2
# الموديلات الخاصة بكِ
from app.models.users import User
from app.models.roles import Role
from app.models.article import Article
SB_URL = "https://imlydashdkziznmjhfgy.supabase.co"
SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbHlkYXNoZGt6aXpubWpoZmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTI2MDEsImV4cCI6MjA4NTg2ODYwMX0.MR0PyzmIwXlz06HOhyZt9dYypL9BV4YboVqbpuEAF-8"
supabase: Client = create_client(SB_URL, SB_KEY)

JSON_FILE_PATH = r"C:\campus_pulse\scraper\webscraping\campuspulse_posts.json"

class ArticleService:
    @staticmethod
    async def publish_article(db: Session, email: str, article_id: int, final_summary: str = None):
        user = db.query(User).join(Role).filter(
            User.email == email,
            Role.name == "university_media_adviser" 
        ).first()
        if not user:
            raise HTTPException(
                status_code=403, 
                detail="Access denied: User not found or not authorized as Media Adviser"
            )
        if os.path.exists(JSON_FILE_PATH):
            try:
                with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
                    all_data = json.load(f)
                found_in_json = False
                for item in all_data:
                    if item.get("article_id") == article_id:
                        if final_summary and final_summary.strip():
                            item["summary"] = final_summary
                        found_in_json = True
                        break
                if found_in_json:
                    with open(JSON_FILE_PATH, "w", encoding="utf-8") as f:
                        json.dump(all_data, f, ensure_ascii=False, indent=4)
                else:
                    print(f"⚠️ Warning: Article {article_id} not found in JSON file.")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error updating JSON: {str(e)}")
        now_ts = datetime.now(timezone.utc).isoformat()
        update_payload = {
            "status": "published",
            "university_media_adviser": user.user_id, 
            "published_at": now_ts
        }
        try:
            result = supabase.table("articles").update(update_payload).eq("article_id", article_id).execute()
            if not result.data:
                raise HTTPException(status_code=404, detail="Article not found in Supabase")
            print(f"🚀 Article {article_id} published by {user.full_name} at {now_ts}")
            return {
                "message": "Published successfully",
                "article_id": article_id,
                "status": "published",
                "adviser": user.full_name
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
        
    @staticmethod
    def _load_json_articles() -> Dict[str, Dict[str, Any]]:
        if not os.path.exists(JSON_FILE_PATH):
            return {}
        try:
            with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
                articles_list = json.load(f)
                return {str(art.get("article_id")): art for art in articles_list}
        except:
            return {}

   
    @staticmethod
    def get_adviser_articles(db: Session, email: str) -> List[ArticleResponse2]:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        db_articles = db.query(Article).filter(
            Article.university_media_adviser == user.user_id
        ).all()
        json_data = ArticleService._load_json_articles()
        results = []
        for db_art in db_articles:
            art_id = str(db_art.article_id)
            json_content = json_data.get(art_id, {})  
            merged_data = {
                "title": json_content.get("title", "No Title"),
                "content": json_content.get("content", ""),
                "summary": json_content.get("summary", ""),
                "photo": json_content.get("photo") or json_content.get("image_url"),
                "original_media_url": json_content.get("original_media_url"),
                "article_id": db_art.article_id,
                "created_by_id": db_art.university_media_adviser,
                "category_id": db_art.category_id,
                "status": db_art.status,
                "published_at": db_art.published_at,
            }
            results.append(ArticleResponse2(**merged_data))
        return results
    
    @staticmethod
    def get_pending_articles(db: Session, email: str) -> List[ArticleResponse2]:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        db_articles = db.query(Article).filter(
            Article.status == "pending",
        ).all()
        json_data = ArticleService._load_json_articles()
        results = []
        for db_art in db_articles:
            art_id = str(db_art.article_id)
            json_content = json_data.get(art_id, {})
            merged_data = {
                "title": json_content.get("title", "No Title"),
                "content": json_content.get("content", ""),
                "summary": json_content.get("summary", ""),
                "photo": json_content.get("photo") or json_content.get("image_url"),
                "original_media_url": json_content.get("original_media_url"),
                "article_id": db_art.article_id,
                "category":json_content.get("category", ""),
                "status": db_art.status,
                "published_at": db_art.published_at,
            }
            results.append(ArticleResponse2(**merged_data))
        return results
   