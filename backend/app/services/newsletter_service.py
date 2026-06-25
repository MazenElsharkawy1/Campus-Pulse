from typing import List
import traceback
import numpy as np
import json
import os
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from dotenv import load_dotenv
from app.models.users import User
from app.models.user_preference import UserPreference
from app.models.newsletter import Newsletter
from app.models.newsletter_article import NewsletterArticle
from app.models.roles import Role
from app.models.article import Article
from app.db.database import SessionLocal
from app.models.category import Category

load_dotenv()


class NewsletterService:
    """
    Service responsible for generating, ranking, and managing
    personalized newsletters for students.
    """
    
    JSON_FILE = r"C:\campus_pulse\scraper\webscraping\campuspulse_posts.json"
    ARTICLES_CACHE = None

    WEIGHT_CATEGORY = 0.45
    WEIGHT_SIMILARITY = 0.35
    WEIGHT_RECENCY = 0.20

    # =========================================================================
    # 1. CORE UTILITIES
    # =========================================================================

    @staticmethod
    def cosine(v1, v2):
        """Calculate cosine similarity between two vectors."""
        if v1 is None or v2 is None:
            return 0.0
        try:
            v1, v2 = np.array(v1, dtype=float), np.array(v2, dtype=float)
            if v1.shape != v2.shape:
                return 0.0
            norm = np.linalg.norm(v1) * np.linalg.norm(v2)
            return float(np.dot(v1, v2) / norm) if norm != 0 else 0.0
        except Exception:
            return 0.0

    @staticmethod
    def get_score(user_vec, cat_score, article, has_vector: bool = True):
        """Calculate weighted score for an article."""
        if has_vector and user_vec is not None:
            sim = NewsletterService.cosine(user_vec, article.get("embedding"))
        else:
            sim = 0.0
        
        try:
            pub_str = article.get("published_at") or article.get("published_date")
            if pub_str:
                pub = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
                if pub.tzinfo is None:
                    pub = pub.replace(tzinfo=timezone.utc)
                hours = (datetime.now(timezone.utc) - pub).total_seconds() / 3600
                recency = 1 / (1 + (hours / 24))
            else:
                recency = 0.0
        except Exception:
            recency = 0.0
        
        cat_score = cat_score if cat_score is not None else 1.0
        
        if has_vector:
            return (0.45 * cat_score) + (0.35 * sim) + (0.20 * recency)
        else:
            return (0.70 * cat_score) + (0.30 * recency)

    @staticmethod
    def _safe_int_attr(obj, attr_name: str, default: int = 0) -> int:
        """Safely retrieve an integer attribute from an object."""
        try:
            val = getattr(obj, attr_name, None)
            return int(val) if val is not None else default
        except (AttributeError, TypeError, ValueError):
            return default

    # =========================================================================
    # 2. DATA LOADING
    # =========================================================================

    @staticmethod
    def load_json_articles(force_reload: bool = False):
        """
        Load articles from JSON file with caching.
        Use force_reload=True to refresh the cache.
        """
        if force_reload:
            NewsletterService.ARTICLES_CACHE = None
        
        if NewsletterService.ARTICLES_CACHE is None:
            print(f"📂 [JSON Loader] Looking for file at: {NewsletterService.JSON_FILE}")
            
            if not os.path.exists(NewsletterService.JSON_FILE):
                print(f"❌ [JSON Loader] File NOT found at path above!")
                return []
            
            with open(NewsletterService.JSON_FILE, "r", encoding="utf8") as f:
                NewsletterService.ARTICLES_CACHE = json.load(f)
            
            print(f"✅ [JSON Loader] Loaded {len(NewsletterService.ARTICLES_CACHE)} articles from JSON")
            sample_ids = [str(a.get("article_id")) for a in NewsletterService.ARTICLES_CACHE[:5]]
            print(f"🔍 [JSON Loader] Sample IDs: {sample_ids}")
        
        return NewsletterService.ARTICLES_CACHE

    @staticmethod
    def load_db_articles(db: Session):
        """Load all published articles from database."""
        articles = db.query(Article).filter(func.lower(Article.status) == "published").all()
        db_map = {}
        for a in articles:
            db_map[str(a.article_id)] = {
                "article_id": str(a.article_id),
                "category_id": str(a.category_id),
                "published_at": str(a.published_at),
                "embedding": a.embedding,
                "status": a.status
            }
        return db_map

    @staticmethod
    def merge_articles(json_articles, db_map):
        """Merge JSON articles with database articles."""
        merged = []
        for art in json_articles:
            art_id = str(art.get("article_id"))
            if art_id in db_map:
                merged.append({**art, **db_map[art_id]})
        return merged

    # =========================================================================
    # 3. TIME RANGE CALCULATION
    # =========================================================================
    @staticmethod
    def get_newsletter_time_range(weeks_back: int = 0):
        """
        حساب الـ time range للأسبوع اللي فات
        من الجمعة 14:00 للجمعة التالية 14:30
        """
        now = datetime.now(timezone.utc)
        
        # حساب الأيام منذ آخر جمعة
        days_since_friday = (now.weekday() - 4) % 7
        
        # آخر جمعة الساعة 14:00
        last_friday_14 = (now - timedelta(days=days_since_friday)).replace(
            hour=14, minute=0, second=0, microsecond=0
        )
        
        # ✅ المنطق الجديد (معكوس)
        if now >= last_friday_14:
            # عدينا الـ anchor → الأسبوع اللي فات بدأ من الجمعة اللي فاتت
            start_date = last_friday_14 - timedelta(days=7)
        else:
            # لسه ما عديناش → الأسبوع اللي فات بدأ من الجمعة قبل اللي فاتت
            start_date = last_friday_14 - timedelta(days=14)
        
        # الرجوع للوراء لو weeks_back > 0
        if weeks_back > 0:
            start_date -= timedelta(weeks=weeks_back)
        
        # نهاية الأسبوع
        end_date = start_date + timedelta(days=7, minutes=30)
        
        print(f"📅 [Time Range] Checking articles between:")
        print(f"   Start: {start_date} (Friday 14:00)")
        print(f"   End:   {end_date} (Next Friday 14:30)")
        print(f"   Weeks back: {weeks_back}")
        
        return start_date, end_date

    # =========================================================================
    # 4. NEWSLETTER GENERATION
    # =========================================================================

    @staticmethod
    async def generate_single_newsletter(db: Session, user: User):
        """Generate a personalized newsletter for a single user."""
        
        # 1. Validate preference vector
        vec = user.preference_vector
        has_vector = vec is not None and (not hasattr(vec, '__len__') or len(vec) > 0)
        if not has_vector:
            print(f"⚠️ User {user.user_id}: Missing preference vector. Will rank by Category + Recency only.")
        
        # 2. Load user preferences
        prefs = db.query(UserPreference).filter(UserPreference.user_id == user.user_id).all()
        if not prefs:
            print(f"⚠️ User {user.user_id}: No preferences found. Showing ALL categories.")
            categories = None
            cat_map = {}
        else:
            categories = {str(p.category_id).strip() for p in prefs if p.category_id is not None}
            cat_map = {str(p.category_id).strip(): float(p.category_score or 0.0) for p in prefs if p.category_id is not None}
            print(f"🔍 [DEBUG] User {user.user_id} ALLOWED Categories: {sorted(categories)}")

        # 3. Load articles from DB and JSON
        db_candidates = db.query(Article).filter(
            func.lower(Article.status) == "published",
            Article.published_at.isnot(None)
        ).all()
        json_articles = NewsletterService.load_json_articles()
        json_map = {str(art.get("article_id")): art for art in json_articles}

        # 4. Calculate time range ONCE (outside the loop)
        start_dt, end_dt = NewsletterService.get_newsletter_time_range(weeks_back=0)
        
        # 5. Filter and merge articles
        merged = []
        for db_art in db_candidates:
            if db_art.category_id is None:
                continue
            
            art_cat = str(db_art.category_id).strip()
            if categories is not None and art_cat not in categories:
                continue
            
            pub_dt = db_art.published_at
            if pub_dt.tzinfo is None:
                pub_dt = pub_dt.replace(tzinfo=timezone.utc)
            
            if not (start_dt <= pub_dt <= end_dt):
                continue
            
            art_id = str(db_art.article_id)
            json_art = json_map.get(art_id)
            if not json_art:
                continue
            
            merged.append({
                "article_id": art_id,
                "category_id": art_cat,
                "published_at": str(pub_dt),
                "embedding": db_art.embedding,
                "title": json_art.get("title", "No Title"),
                "summary": json_art.get("summary", ""),
                "image_url": json_art.get("image_url") or json_art.get("photo", ""),
                "content": json_art.get("content", ""),
                "category": json_art.get("category") or json_art.get("category_name", ""),
                "source": json_art.get("source", "")
            })
        
        merged_cats = {a["category_id"] for a in merged}
        mode_msg = "ALL MODE" if categories is None else "FILTERED MODE"
        print(f"✅ [{mode_msg}] Articles passed: {len(merged)} | Categories: {merged_cats}")
        
        # 6. If no articles, return latest newsletter or None
        if not merged:
            latest = db.query(Newsletter).filter(Newsletter.user_id == user.user_id)\
                       .order_by(Newsletter.newsletter_id.desc()).first()
            if latest:
                return NewsletterService.fetch_dashboard(db, latest.newsletter_id, user.full_name or user.email)
            return None

        # 7. Calculate scores and rank
        ranked = []
        try:
            for a in merged:
                cat_sc = cat_map.get(a["category_id"], 1.0)
                score = NewsletterService.get_score(user.preference_vector, cat_sc, a, has_vector=has_vector)
                ranked.append({
                    "article_id": a["article_id"],
                    "score": round(score, 4),
                    "cat_score": cat_sc,
                    "published_at": a["published_at"]
                })
        except Exception as e:
            print(f"❌ ERROR during scoring loop for User {user.user_id}: {e}")
            traceback.print_exc()
            raise
        
        ranked.sort(key=lambda x: (x["score"], x["article_id"]), reverse=True)
        top = ranked
        
        # 8. Save newsletter to database
        try:
            new_nl = Newsletter(
                user_id=user.user_id,
                edition=(db.query(Newsletter).filter(Newsletter.user_id == user.user_id).count() + 1),
                articles_count=len(top),
                published_date=datetime.now(timezone.utc)
            )
            db.add(new_nl)
            db.flush()

            for i, a in enumerate(top):
                db.add(NewsletterArticle(
                    newsletter_id=new_nl.newsletter_id,
                    article_id=a["article_id"],
                    rank_score=a["score"],
                    position=i + 1
                ))
            db.commit()
            print(f"✅ DB Committed Successfully | User: {user.user_id} | NL ID: {new_nl.newsletter_id} | Articles: {len(ranked)}")
            
        except Exception as e:
            db.rollback()
            print(f"❌ CRITICAL ERROR during DB Commit for User {user.user_id}: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Newsletter save failed: {str(e)}")

        return NewsletterService.fetch_dashboard(db, new_nl.newsletter_id, user.full_name or user.email)

    # =========================================================================
    # 5. BATCH PROCESSING
    # =========================================================================

    @staticmethod
    async def run_weekly_batch():
        """Generate newsletters for all students."""
        print("--- [DEBUG START] ---")
        db_main = SessionLocal()
        try:
            students = db_main.query(User).join(Role).filter(func.lower(Role.name) == "student").all()
            print(f"🔍 Found {len(students)} students: {[s.user_id for s in students]}")
        finally:
            db_main.close()

        for student in students:
            print(f"👉 Processing Student {student.user_id}...")
            student_db = SessionLocal()
            try:
                await NewsletterService.generate_single_newsletter(student_db, student)
                print(f"✅ DONE for Student {student.user_id}")
            except HTTPException as e:
                print(f"🛑 API Error (Student {student.user_id}): {e.status_code} - {e.detail}")
            except Exception as e:
                print(f"❌ CRASH (Student {student.user_id}): {str(e)}")
                print(traceback.format_exc())
            finally:
                student_db.close()
        print("--- [DEBUG END] ---")

    # =========================================================================
    # 6. NEWSLETTER RETRIEVAL
    # =========================================================================

    @staticmethod
    def get_newsletter_archive(db: Session, email: str) -> List[dict]:
        """Get all newsletters for a user."""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        newsletters = db.query(Newsletter).filter(Newsletter.user_id == user.user_id)\
                        .order_by(Newsletter.newsletter_id.desc()).all()
        archive = []
        for nl in newsletters:
            archive.append({
                "newsletter_id": nl.newsletter_id,
                "edition": nl.edition or 0,
                "published_date": str(nl.published_date) if nl.published_date else "",
                "articles_count": nl.articles_count
            })
        return archive

    @staticmethod
    def fetch_dashboard(db: Session, nl_id: int, student_email: str):
        """Fetch the dashboard view for a newsletter."""
        from sqlalchemy.orm import joinedload
        from app.services.user_image_service import UserImageService
        
        nl = db.query(Newsletter).filter(Newsletter.newsletter_id == nl_id).first()
        if not nl:
            raise HTTPException(status_code=404, detail="Newsletter not found")
        
        nl_articles = db.query(NewsletterArticle).filter(NewsletterArticle.newsletter_id == nl_id)\
                        .order_by(NewsletterArticle.position).all()
        
        json_map = {str(a["article_id"]): a for a in NewsletterService.load_json_articles()}

        # Get student profile picture
        student_image_data = UserImageService.get_user_image_by_email(student_email)
        if isinstance(student_image_data, dict):
            student_profile_pic = student_image_data.get("profile_picture_url", "/static/profiles/default_user.png")
        elif isinstance(student_image_data, str):
            student_profile_pic = student_image_data or "/static/profiles/default_user.png"
        else:
            student_profile_pic = "/static/profiles/default_user.png"
        
        # Get student display name
        student = db.query(User).filter(User.email == student_email).first()
        student_display_name = student.full_name if student and student.full_name else student_email.split('@')[0]

        output = []
        for na in nl_articles:
            art_json = json_map.get(str(na.article_id), {})
            db_article = db.query(Article).options(joinedload(Article.category))\
                            .filter(Article.article_id == na.article_id).first()
            
            if db_article and db_article.category_id:
                category_id = db_article.category_id
                category_name = db_article.category.name if db_article.category else ""
            else:
                category_id = art_json.get("category_id", 0)
                category_name = art_json.get("category") or art_json.get("category_name", "")
            
            published_at = str(db_article.published_at) if (db_article and db_article.published_at) else art_json.get("published_at", "")
            open_count = NewsletterService._safe_int_attr(na, 'open_counter', 0)
            share_count = NewsletterService._safe_int_attr(na, 'share_counter', 0)
            
            output.append({
                "article_id": na.article_id,
                "title": art_json.get("title") or "No Title",
                "content": art_json.get("content") or "",
                "summary": art_json.get("summary") or "",
                "image_url": art_json.get("photo") or art_json.get("image_url") or "",
                "category_id": category_id,
                "category": category_name,
                "open_counter": open_count,
                "share_counter": share_count,
                "position": na.position,
                "published_at": published_at,
                "source": art_json.get("source", "")
            })

        return {
            "student_name": student_display_name,
            "student_profile_picture": student_profile_pic,
            "edition": nl.edition or 1,
            "newsletter_date": str(nl.published_date),
            "newsletter_id": nl_id,
            "articles": output
        }

    @staticmethod
    async def get_daily_newsletter(db: Session, email: str):
        """Get the latest newsletter for a user."""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        latest = db.query(Newsletter).filter(Newsletter.user_id == user.user_id)\
                .order_by(Newsletter.published_date.desc()).first()

        if not latest:
            result = await NewsletterService.generate_single_newsletter(db, user)
            if result is None:
                raise HTTPException(status_code=404, detail="No newsletter available")
            return result

        return NewsletterService.fetch_dashboard(db, latest.newsletter_id, email)

    @staticmethod
    def get_specific_newsletter(db: Session, newsletter_id: int):
        """Get a specific newsletter by ID."""
        nl = db.query(Newsletter).filter(Newsletter.newsletter_id == newsletter_id).first()
        if not nl:
            raise HTTPException(status_code=404, detail="Newsletter not found")
        
        user = db.query(User).filter(User.user_id == nl.user_id).first()
        student_email = user.email if user else "unknown@example.com"
        
        return NewsletterService.fetch_dashboard(db, newsletter_id, student_email)

    # =========================================================================
    # 7. PREFERENCE CHANGE HANDLING
    # =========================================================================

    @staticmethod
    async def update_newsletter_on_preference_change(
        db: Session,
        email: str,
        removed_categories: List[str],
        added_categories: List[str]
    ):
        """
        Update newsletter when user preferences change.
        - If user has preferences: update current newsletter
        - If user has no preferences: create new newsletter with ALL articles
        """
        # 1. Get user and latest newsletter
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        latest_nl = db.query(Newsletter).filter(Newsletter.user_id == user.user_id)\
                    .order_by(Newsletter.published_date.desc()).first()
        
        if not latest_nl:
            return await NewsletterService.generate_single_newsletter(db, user)
        
        # 2. Calculate time range (current week)
        start_dt, end_dt = NewsletterService.get_newsletter_time_range(weeks_back=0)
        
        # 3. Delete articles from removed categories
        if removed_categories:
            removed_cat_ids = [c.category_id for c in db.query(Category).filter(
                Category.name.in_(removed_categories)
            ).all()]
            
            if removed_cat_ids:
                deleted_count = db.query(NewsletterArticle).filter(
                    NewsletterArticle.newsletter_id == latest_nl.newsletter_id,
                    NewsletterArticle.article_id.in_(
                        db.query(Article.article_id).filter(Article.category_id.in_(removed_cat_ids))
                    )
                ).delete(synchronize_session=False)
                
                # Update articles_count immediately
                latest_nl.articles_count = max(0, (latest_nl.articles_count or 0) - deleted_count)
                db.commit()
        
        # 4. Rebuild and reorder if there are changes
        if added_categories or removed_categories:
            prefs = db.query(UserPreference).filter(
                UserPreference.user_id == user.user_id
            ).all()
            
            # Validate preference vector
            vec = user.preference_vector
            has_vector = vec is not None and (not hasattr(vec, '__len__') or len(vec) > 0)

            # If no preferences, create new newsletter with ALL articles
            if not has_vector or not prefs:
                print(f"⚠️ [Preferences] No preferences for {user.email}")
                print(f"   → Creating NEW newsletter with ALL articles in time range")
                
                all_articles = db.query(Article).filter(
                    Article.published_at >= start_dt,
                    Article.published_at <= end_dt,
                    func.lower(Article.status) == "published",
                    Article.published_at.isnot(None)
                ).order_by(Article.published_at.desc()).all()
                
                print(f"📰 [Articles] Found {len(all_articles)} articles in time range")
                
                if not all_articles:
                    print(f"⚠️ No articles found in time range, returning old newsletter")
                    return NewsletterService.fetch_dashboard(db, latest_nl.newsletter_id, user.full_name or user.email)
                
                # Create new newsletter
                new_edition = db.query(Newsletter).filter(Newsletter.user_id == user.user_id).count() + 1
                
                new_nl = Newsletter(
                    user_id=user.user_id,
                    edition=new_edition,
                    articles_count=len(all_articles),
                    published_date=datetime.now(timezone.utc),
                )
                db.add(new_nl)
                db.flush()
                
                for i, art in enumerate(all_articles):
                    db.add(NewsletterArticle(
                        newsletter_id=new_nl.newsletter_id,
                        article_id=art.article_id,
                        rank_score=1.0,
                        position=i + 1
                    ))
                
                db.commit()
                print(f"✅ NEW Newsletter Created | User: {user.user_id} | NL ID: {new_nl.newsletter_id} | Articles: {len(all_articles)}")
                
                return NewsletterService.fetch_dashboard(db, new_nl.newsletter_id, user.full_name or user.email)
            
            # If user has preferences, filter and rank normally
            active_cat_ids = {str(p.category_id) for p in prefs}
            cat_map = {str(p.category_id): p.category_score for p in prefs}
            
            db_candidates = db.query(Article).filter(
                func.lower(Article.status) == "published",
                Article.category_id.in_(active_cat_ids),
                Article.published_at >= start_dt,
                Article.published_at <= end_dt,
                Article.published_at.isnot(None)
            ).all()
            
            json_map = {str(art.get("article_id")): art for art in NewsletterService.load_json_articles()}
            
            ranked = []
            for db_art in db_candidates:
                art_id = str(db_art.article_id)
                json_art = json_map.get(art_id)
                if not json_art:
                    continue
                
                pub_dt = db_art.published_at
                if pub_dt.tzinfo is None:
                    pub_dt = pub_dt.replace(tzinfo=timezone.utc)
                
                cat_sc = cat_map.get(str(db_art.category_id), 1.0)
                score = NewsletterService.get_score(user.preference_vector, cat_sc, {
                    "embedding": db_art.embedding,
                    "published_at": str(pub_dt),
                    "article_id": art_id,
                    "source": json_art.get("source", "")
                })
                
                ranked.append({
                    "article_id": art_id,
                    "score": round(score, 4),
                    "published_at": str(pub_dt)
                })
            
            ranked.sort(key=lambda x: (x["score"], x["article_id"]), reverse=True)
            
            # Replace old articles with new ranked ones
            db.query(NewsletterArticle).filter(
                NewsletterArticle.newsletter_id == latest_nl.newsletter_id
            ).delete(synchronize_session=False)
            
            for i, a in enumerate(ranked):
                db.add(NewsletterArticle(
                    newsletter_id=latest_nl.newsletter_id,
                    article_id=a["article_id"],
                    rank_score=a["score"],
                    position=i + 1
                ))
            
            latest_nl.articles_count = len(ranked)
            latest_nl.last_update = datetime.now(timezone.utc)
            
            db.commit()
            print(f"✅ Newsletter Re-ranked for {email} | New Count: {len(ranked)} | Last Update: {latest_nl.last_update}")
        
        return NewsletterService.fetch_dashboard(db, latest_nl.newsletter_id, user.full_name or user.email)

    # =========================================================================
    # 8. NEWSLETTER RE-RANKING
    # =========================================================================

    @staticmethod
    def _rerank_current_newsletter(db: Session, user: User, newsletter_id: int) -> bool:
        """
        Re-rank articles in a specific newsletter based on updated preferences.
        """
        try:
            print(f"🔍 [RERANK START] User: {user.user_id} | Newsletter: {newsletter_id}")
            
            # 1. Get the specific newsletter
            nl = db.query(Newsletter).filter(
                Newsletter.newsletter_id == newsletter_id,
                Newsletter.user_id == user.user_id
            ).first()
            
            if not nl:
                print(f"⚠️ [RERANK] Newsletter {newsletter_id} not found for user {user.user_id}")
                return False
            
            # 2. Get articles in this newsletter
            nl_articles = db.query(NewsletterArticle).filter(
                NewsletterArticle.newsletter_id == newsletter_id
            ).order_by(NewsletterArticle.position).all()
            
            if not nl_articles:
                print(f"⚠️ [RERANK] Newsletter {newsletter_id} has no articles")
                return False
            
            print(f"✅ [RERANK] Found {len(nl_articles)} articles in newsletter {newsletter_id}")
            
            # 3. Get user preferences
            prefs = db.query(UserPreference).filter(
                UserPreference.user_id == user.user_id
            ).all()
            cat_scores = {str(p.category_id): float(p.category_score or 0.0) for p in prefs}
            
            user_vec = user.preference_vector
            
            ranked_items = []
            for nl_art in nl_articles:
                art_id = nl_art.article_id
                
                db_art = db.query(Article).filter(Article.article_id == art_id).first()
                if not db_art:
                    print(f"   ⚠️ Article {art_id} not found in DB, skipping")
                    continue
                
                cat_score = cat_scores.get(str(db_art.category_id), 1.0)
                
                pub_dt = db_art.published_at
                if pub_dt and pub_dt.tzinfo is None:
                    pub_dt = pub_dt.replace(tzinfo=timezone.utc)
                
                if pub_dt:
                    hours_old = (datetime.now(timezone.utc) - pub_dt).total_seconds() / 3600
                    recency = 1.0 / (1.0 + (hours_old / 24.0))
                else:
                    recency = 0.0  # ✅ Safe fallback
                
                if db_art.embedding is not None and user_vec is not None and len(user_vec) > 0:
                    similarity = NewsletterService.cosine(user_vec, db_art.embedding)
                else:
                    similarity = 0.0  # ✅ Safe fallback
                    if db_art.embedding is None:
                        print(f"   ⚠️ Article {art_id}: Using fallback similarity = 0.0 (no embedding)")
                
                new_score = (
                    NewsletterService.WEIGHT_CATEGORY * cat_score +
                    NewsletterService.WEIGHT_SIMILARITY * similarity +
                    NewsletterService.WEIGHT_RECENCY * recency
                )
                
                print(f"   ✅ Article {art_id}: score={new_score:.4f} (cat={cat_score:.3f}, sim={similarity:.3f}, rec={recency:.3f})")
                
                ranked_items.append({
                    "article_id": art_id,
                    "new_score": round(new_score, 4),
                    "old_position": nl_art.position
                })
            
            # 5. Sort and update
            ranked_items.sort(key=lambda x: -x["new_score"])
            print(f"📊 New Order for Newsletter {newsletter_id}: {[i['article_id'] for i in ranked_items]}")
            
            if ranked_items:
                for new_pos, item in enumerate(ranked_items, start=1):
                    db.query(NewsletterArticle).filter(
                        NewsletterArticle.newsletter_id == newsletter_id,
                        NewsletterArticle.article_id == item["article_id"]
                    ).update({
                        "rank_score": item["new_score"],
                        "position": new_pos
                    }, synchronize_session='fetch')
                
                nl.last_update = datetime.now(timezone.utc)
                db.commit()
                print(f"✅ [RERANK DONE] Newsletter {newsletter_id} updated successfully")
                return True
            else:
                print(f"⚠️ [RERANK] No articles were scored for newsletter {newsletter_id}")
                return False
            
        except Exception as e:
            db.rollback()
            print(f"❌ [RERANK ERROR] {e}")
            traceback.print_exc()
            return False