from ast import stmt
import json
import os
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.db.database import SessionLocal
from backend.app.models.post import Post  # تأكد من وجود نموذج Post
from backend.app.services.campus_pipeline import ai_pipeline  # كائن AI جاهز
from backend.app.services.post_service import notify_interested_users
from sqlalchemy.dialects.postgresql import insert

def import_news_from_json(json_path: str):
    db: Session = SessionLocal()
    try:
        # 1. قراءة ملف JSON
        with open(json_path, "r", encoding="utf-8") as f:
            news_data = json.load(f)
        
        print(f"🔄 جاري معالجة {len(news_data)} خبر...")
        
        for item in news_data:
            content = item.get("content", "").strip()
            if not content:
                continue
            
            title = item.get("title", "خبر بدون عنوان")
            
            # 2. معالجة عبر AI
            ai_result = ai_pipeline.process(content)
            
            # 3. حفظ في قاعدة البيانات
            new_post = Post(
                title=title,
                # content=content,
                # category=ai_result["category_id"],
                summary=ai_result["summary"],
                # relevance_score=ai_result["relevance_score"]
            )
            db.add(new_post)
            db.flush()  # للحصول على الـ ID فورًا
            
            # 4. إرسال إشعارات
            notify_interested_users(db, new_post)
        
        db.commit()
        print("✅ تم استيراد جميع الأخبار وحفظها في قاعدة البيانات.")
    
    except Exception as e:
        db.rollback()
        print(f"❌ خطأ أثناء الاستيراد: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # المسار النسبي من مجلد scripts/
    json_file = r"C:\Users\mazen\campus_pulse\backend\app\final_clean_posts.json"
    if os.path.exists(json_file):
        import_news_from_json(json_file)
    else:
        print(f"❌ الملف غير موجود: {os.path.abspath(json_file)}")