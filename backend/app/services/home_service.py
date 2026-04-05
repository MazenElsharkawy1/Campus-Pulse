# app/services/home_service.py
import json
from pathlib import Path
from typing import List
from app.schemas.home import ArticlePreview

# مسار نسبي صحيح
BASE_DIR = Path(r"C:\campus_pulse\scraper\webscraping\articles.json").resolve().parent.parent.parent
JSON_PATH = BASE_DIR / "scraper" / "webscraping" / "articles.json"
STATIC_URL_PREFIX = r"C:\campus_pulse\scraper\webscraping\downloaded_media"

def get_announcements_only() -> List[ArticlePreview]:
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)
    
    announcements = []
    for item in raw_data:
        # ✅ تصفية: فقط category = "announcement"
        if item.get("category") != "announcements":
            continue
        
        # معالجة الصورة
        photo_url = None
        if item.get("photo"):
            filename = item["photo"].split("\\")[-1]  # للمسارات على Windows
            photo_url = f"{STATIC_URL_PREFIX}/{filename}"
        
        # إنشاء كائن Pydantic
        try:
            art = ArticlePreview(
                article_id=item.get("article_id", 0),
                title=item.get("title", "No Title"),
                summary=item.get("summary") or "No summary available",
                category=item.get("category", "announcements"),
                photo=photo_url
            )
            announcements.append(art)
        except Exception as e:
            print(f"تخطي عنصر بسبب خطأ: {e}")
            continue
    
    return announcements