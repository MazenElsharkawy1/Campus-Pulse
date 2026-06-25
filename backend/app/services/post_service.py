import json
import os
from realtime import Any, Dict
from requests import Session
from app.models.category import Category
from typing import List
from app.schemas.article_schema import ArticleResponse2
from app.models.article import Article

def create_post(title: str, content: str, category: str) -> dict:
    post = {
        "id": len(Category) + 1,
        "title": title,
        "content": content,
        "category": category,
        "created_at": __import__('datetime').datetime.now().isoformat()
    }
    Category.append(post)
    return post

def get_all_posts() -> List[dict]:
    return Category
JSON_FILE_PATH = r"C:\campus_pulse\scraper\webscraping\campuspulse_posts.json"

class ArticleService:
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
    def get_cleaned_articles(db: Session) -> List[ArticleResponse2]:
        db_articles = db.query(Article).filter(
            Article.status == "cleaned"
        ).all()
        json_data = ArticleService._load_json_articles()
        results = []
        for db_art in db_articles:
            art_id = str(db_art.article_id)
            json_content = json_data.get(art_id, {})  
            results.append(json_content)
        return results