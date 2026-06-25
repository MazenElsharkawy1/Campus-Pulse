# ============================================================================
# ⚙️ Campus Pulse - Home Page Service (Business Logic)
# ============================================================================

import json
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from app.schemas.home import UnifiedPost


# ✅ مسارات ملفات الـ JSON (عدّلها حسب جهازك)
ANNOUNCEMENTS_JSON = Path(r"C:\campus_pulse\scraper\webscraping\campuspulse_posts.json")
SUBMISSIONS_JSON = Path(r"C:\campus_pulse\scraper\webscraping\post_submission.json")


class HomeService:
    """خدمة جلب ودمج كل البوستات في قائمة موحدة"""
    
    @staticmethod
    def _load_json_file(file_path: Path) -> List[dict]:
        """دالة مساعدة لقراءة ملف JSON"""
        if not file_path.exists():
            print(f"⚠️ File not found: {file_path}")
            return []
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"❌ Error reading {file_path}: {e}")
            return []
    
    @staticmethod
    def _normalize_date(date_str: Optional[str]) -> datetime:
        """توحيد صيغة التواريخ عشان الترتيب يشتغل صح"""
        if not date_str:
            return datetime.min
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            # نحول لـ naive datetime عشان المقارنة تشتغل
            if dt.tzinfo is not None:
                dt = dt.replace(tzinfo=None)
            return dt
        except:
            return datetime.min
    
    @staticmethod
    def get_unified_home_feed() -> List[UnifiedPost]:
        """
        جلب كل البوستات من المصدرين ودمجهم في قائمة واحدة
        """
        all_posts = []
        
        # ✅ 1. جلب الـ Announcements من الـ Scraper JSON
        announcements_data = HomeService._load_json_file(ANNOUNCEMENTS_JSON)
        
        for item in announcements_data:
            # فلتر: بس الـ Announcements
            if item.get("category") != "Announcements":
                continue
            
            try:
                all_posts.append(UnifiedPost(
                    id=f"ann_{item.get('article_id', 0)}",
                    title=item.get("title", "No Title"),
                    content=item.get("content", ""),
                    sammary=item.get("summary", ""),
                    image_url=item.get("photo"),
                    published_at=None,  # لو مفيش تاريخ في المصدر ده
                    source="announcement",
                ))
            except Exception as e:
                print(f"⚠️ Skipping announcement: {e}")
                continue
        
        # ✅ 2. جلب الـ Stakeholder Posts من الـ Submissions JSON
        submissions_data = HomeService._load_json_file(SUBMISSIONS_JSON)
        submissions_list = submissions_data.get("submissions", []) if isinstance(submissions_data, dict) else submissions_data
        
        for sub in submissions_list:
            # فلتر: بس الـ المنشورة (published/approved)
            if sub.get("status") not in ["published", "approved"]:
                continue
            
            try:
                all_posts.append(UnifiedPost(
                    id=f"sub_{sub.get('submission_id', 0)}",
                    title=sub.get("title", "No Title"),
                    content=sub.get("content", ""),
                    image_url=sub.get("image_url"),
                    published_at=sub.get("published_at") or sub.get("reviewed_at"),
                    source="stakeholder"
                ))
            except Exception as e:
                print(f"⚠️ Skipping stakeholder post: {e}")
                continue
        
        # ✅ 3. الترتيب حسب التاريخ (الأحدث أولاً)
        all_posts.sort(
            key=lambda post: HomeService._normalize_date(post.published_at),
            reverse=True
        )
        
        return all_posts
    
    @staticmethod
    def get_debug_info() -> dict:
        """معلومات للتطوير (Debug)"""
        announcements = HomeService._load_json_file(ANNOUNCEMENTS_JSON)
        submissions = HomeService._load_json_file(SUBMISSIONS_JSON)
        
        return {
            "announcements_file": {
                "path": str(ANNOUNCEMENTS_JSON),
                "exists": ANNOUNCEMENTS_JSON.exists(),
                "raw_count": len(announcements) if isinstance(announcements, list) else 0
            },
            "submissions_file": {
                "path": str(SUBMISSIONS_JSON),
                "exists": SUBMISSIONS_JSON.exists(),
                "raw_count": len(submissions.get("submissions", [])) if isinstance(submissions, dict) else 0
            },
            "unified_feed": {
                "total_posts": len(HomeService.get_unified_home_feed())
            }
        }