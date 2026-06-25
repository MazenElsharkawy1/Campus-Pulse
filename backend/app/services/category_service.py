# services/category_service.py
import json
import os
from pathlib import Path
from sqlalchemy.orm import Session
from app.models.category import Category
from supabase import create_client, Client

SB_URL = "https://imlydashdkziznmjhfgy.supabase.co"
SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbHlkYXNoZGt6aXpubWpoZmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTI2MDEsImV4cCI6MjA4NTg2ODYwMX0.MR0PyzmIwXlz06HOhyZt9dYypL9BV4YboVqbpuEAF-8"
supabase: Client = create_client(SB_URL, SB_KEY)

BASE_DIR = Path(r"C:\campus_pulse\scraper\webscraping\campuspulse_posts.json").resolve().parent.parent.parent
JSON_PATH = BASE_DIR / "scraper" / "webscraping" / "campuspulse_posts.json"

class CategoryService:

    @staticmethod
    def load_json_data():
        if os.path.exists(JSON_PATH):
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        return []
    
    @staticmethod
    async def get_all_categories_with_previews(db: Session):
        categories = db.query(Category).all()
        json_articles = CategoryService.load_json_data()
        json_map = {str(a["article_id"]): a for a in json_articles}  
        result = []
        for cat in categories:
            response = supabase.table("articles")\
                .select("article_id, published_at")\
                .eq("category_id", cat.category_id)\
                .eq("status", "published")\
                .order("published_at", desc=True)\
                .limit(100)\
                .execute()
            articles_list = []
            for row in response.data:
                art_id = str(row["article_id"])
                if art_id in json_map:
                    articles_list.append({
                        "article_id": row["article_id"],
                        "title": json_map[art_id].get("title"),
                        "summary": json_map[art_id].get("summary"),
                        "content": json_map[art_id].get("content"),
                        "photo": json_map[art_id].get("photo"),
                        "original_media_url": json_map[art_id].get("original_media_url"),
                        "published_at": row["published_at"]
                    })
            if articles_list: 
                result.append({
                    "category_name": cat.name,
                    "category_id": cat.category_id,
                    "articles": articles_list
                })
        return result
    

    
    @staticmethod
    async def get_full_category_articles(db: Session, category_id: int):
        category = db.query(Category).filter(Category.category_id == category_id).first()
        if not category:
            return None
        response = supabase.table("articles")\
            .select("article_id, published_at")\
            .eq("category_id", category_id)\
            .eq("status", "published")\
            .order("published_at", desc=True)\
            .execute()
        if not response.data:
            return {"category_name": category.name, "articles": []}
        json_articles = CategoryService.load_json_data()
        json_map = {str(a["article_id"]): a for a in json_articles}
        full_list = []
        for row in response.data:
            art_id = str(row["article_id"])
            if art_id in json_map:
                full_list.append({
                    "article_id": row["article_id"],
                    "title": json_map[art_id].get("title"),
                    "summary": json_map[art_id].get("summary"),
                    "content": json_map[art_id].get("content"),
                    "photo": json_map[art_id].get("photo"),
                    "original_media_url": json_map[art_id].get("original_media_url"),
                    "published_at": row["published_at"],
                    "source": json_map[art_id].get("source") 
                })
        return {
            "category_name": category.name,
            "category_id": category_id,
            "total_count": len(full_list),
            "articles": full_list
        }
    


    