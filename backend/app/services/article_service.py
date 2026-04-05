import json
import os
from datetime import datetime, timezone
from supabase import create_client, Client
# تأكدي إن المسار ده هو اللي فيه الفايل بالظبط
JSON_FILE_PATH = r"C:\campus_pulse-main\scraper\webscraping\articles.json"
SB_URL = "https://imlydashdkziznmjhfgy.supabase.co"
SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbHlkYXNoZGt6aXpubWpoZmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTI2MDEsImV4cCI6MjA4NTg2ODYwMX0.MR0PyzmIwXlz06HOhyZt9dYypL9BV4YboVqbpuEAF-8"
supabase: Client = create_client(SB_URL, SB_KEY)

class ArticleService:

    @staticmethod
    def get_vectorized_article():
        # 1. جلب البيانات من سوبابيز
        # اتأكدي إن الحالة في سوبابيز مكتوبة سمول vectorized
        response = supabase.table("articles").select("article_id", "category_id", "status").eq("status", "vectorized").execute()

        if not response.data:
            print("DEBUG: No article found in Supabase with status 'pinned'")
            return []

        # 2. قراءة ملف الجايسون
        if not os.path.exists(JSON_FILE_PATH):
            print(f"DEBUG: JSON File not found at {JSON_FILE_PATH}")
            return []

        with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
            all_article_json = json.load(f)

        article_list = []
        for row in response.data:
            target_id = row['article_id']
            
            # البحث عن الخبر (المقارنة بين int و int)
            json_data = next((item for item in all_article_json if item.get("article_id") == target_id), None)
            
            if json_data:
                article_list.append({
                    "article_id": row['article_id'],
                    "category_id": row['category_id'],
                    "status": row['status'],
                    "title": json_data.get("title"),
                    "summary": json_data.get("summary")
                   })
        
        print(f"DEBUG: Successfully matched {len(article_list)} articles")
        return article_list

    @staticmethod
    def publish_article(article_id: int, adviser_id: int, final_summary: str):
        """
        نشر الخبر مباشرة على صفحة الكاتيجوري:
        1. تحديث التلخيص في ملف الـ JSON.
        2. تحديث الحالة لـ published وتاريخ النشر في سوبابيز.
        """
        # 1. تحديث ملف الـ JSON
        if os.path.exists(JSON_FILE_PATH):
            with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
                all_data = json.load(f)
            
            for item in all_data:
                if item.get("article_id") == article_id:
                    item["summary"] = final_summary
                    break
            
            with open(JSON_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(all_data, f, ensure_ascii=False, indent=4)

        # 2. تحديث سوبابيز (بدون newsletter_id)
        update_payload = {
            "status": "published",
            "university_media_adviser": adviser_id,
            "published_at": datetime.now(timezone.utc).isoformat()
        }

        result = supabase.table("articles").update(update_payload).eq("article_id", article_id).execute()
        return result.data[0] if result.data else None