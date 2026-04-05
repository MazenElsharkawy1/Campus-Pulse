import numpy as np
import json
import os
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException
from dotenv import load_dotenv

# استيراد الموديلات بنفس المسميات القديمة
from app.models.users import User
from app.models.user_preference import UserPreference
from app.models.newsletter import Newsletter
from app.models.newsletter_article import NewsletterArticle
from app.models.roles import Role 
from app.models.article import Article

load_dotenv()

class NewsletterService:
    JSON_FILE = r"D:\fastApi11\Campus_pulse\scraper\webscraping\campuspulse_posts.json"
    ARTICLES_CACHE = None
    DB_ARTICLES_CACHE = None

    # 1. دالة حساب التشابه (بدون تغيير)
    @staticmethod
    def cosine(v1, v2):
        if v1 is None or v2 is None: return 0.0
        try:
            v1, v2 = np.array(v1, dtype=float), np.array(v2, dtype=float)
            if v1.shape != v2.shape: return 0.0
            norm = (np.linalg.norm(v1) * np.linalg.norm(v2))
            return float(np.dot(v1, v2) / norm) if norm != 0 else 0.0
        except: return 0.0

    # 2. دالة حساب السكور (التعديل فقط في منطق الحداثة ليكون أدق)
    @staticmethod
    def get_score(user_vec, cat_score, article):
        embedding = article.get("embedding")
        sim = NewsletterService.cosine(user_vec, embedding)
        try:
            pub_str = article.get("published_at") or article.get("published_date")
            pub = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
            if pub.tzinfo is None: pub = pub.replace(tzinfo=timezone.utc)
            hours = (datetime.now(timezone.utc) - pub).total_seconds() / 3600
            recency = 1 / (1 + (hours / 24))
        except: recency = 0.0
        return (0.45 * cat_score) + (0.35 * sim) + (0.20 * recency)

    # 3. الدوال المساعدة لتحميل البيانات (بدون تغيير في المنطق)
    @staticmethod
    def load_json_articles():
        if NewsletterService.ARTICLES_CACHE is None:
            if not os.path.exists(NewsletterService.JSON_FILE): return []
            with open(NewsletterService.JSON_FILE, "r", encoding="utf8") as f:
                NewsletterService.ARTICLES_CACHE = json.load(f)
        return NewsletterService.ARTICLES_CACHE

    @staticmethod
    def load_db_articles(db: Session):
        articles = db.query(Article).filter(Article.status == "published").all()
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
        merged = []
        for art in json_articles:
            art_id = str(art.get("article_id"))
            if art_id in db_map:
                merged.append({**art, **db_map[art_id]})
            else: merged.append(art)
        return merged

    # 4. دالة حساب الوقت (التعديل المطلوب للجمعة 2 مساءً)
    @staticmethod
    def get_newsletter_time_range():
        now = datetime.now(timezone.utc)
        days_since_fri = (now.weekday() - 4) % 7
        last_fri_2pm = (now - timedelta(days=days_since_fri)).replace(hour=14, minute=0, second=0, microsecond=0)

        if now.weekday() == 4 and now < last_fri_2pm:
            end_date = last_fri_2pm - timedelta(days=7)
        else:
            end_date = last_fri_2pm

        start_date = end_date - timedelta(days=7) + timedelta(seconds=30)
        return start_date, end_date

    # 5. الدالة الرئيسية المطلوبة من الـ Route
    @staticmethod
    async def get_daily_newsletter(db: Session, email: str):
        user = db.query(User).filter(User.email == email).first()
        if not user: raise HTTPException(status_code=404, detail="User not found")
        
        start_win, end_win = NewsletterService.get_newsletter_time_range()
        
        latest = db.query(Newsletter).filter(Newsletter.user_id == user.user_id)\
                   .order_by(Newsletter.published_date.desc()).first()

        # لو النشرة مش موجودة أو تاريخها قديم عن الجمعة اللي فاتت الساعة 2
        if not latest or latest.published_date.replace(tzinfo=timezone.utc) < start_win:
            return await NewsletterService.generate_single_newsletter(db, user)

        return NewsletterService.fetch_dashboard(db, latest.newsletter_id, user.full_name or user.email)

    # 6. دالة التوليد (بناءً على طلبك: فلترة صارمة + منع أخبار قديمة)
    @staticmethod
    async def generate_single_newsletter(db: Session, user: User):
        start_dt, end_dt = NewsletterService.get_newsletter_time_range()
        
        prefs = db.query(UserPreference).filter(UserPreference.user_id == user.user_id).all()
        if not prefs: raise HTTPException(status_code=400, detail="Set preferences first")
        
        categories = [str(p.category_id) for p in prefs]
        cat_map = {str(p.category_id): p.category_score for p in prefs}

        all_articles = NewsletterService.merge_articles(NewsletterService.load_json_articles(), NewsletterService.load_db_articles(db))

        filtered = []
        for art in all_articles:
            art_cat = str(art.get("category_id", ""))
            if art_cat in categories:
                pub_str = art.get("published_at")
                if pub_str:
                    pub_dt = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
                    if pub_dt.tzinfo is None: pub_dt = pub_dt.replace(tzinfo=timezone.utc)
                    # الشرط الصارم: الجمعة للجمعة
                    if start_dt <= pub_dt <= end_dt:
                        filtered.append(art)

        # لو مفيش أخبار في الأسبوع ده، مش هنعمل FALLBACK قديم
        if not filtered:
            # بنرجع آخر نشرة قديمة لو موجودة بدل ما نطلع ايرور
            latest = db.query(Newsletter).filter(Newsletter.user_id == user.user_id).order_by(Newsletter.published_date.desc()).first()
            if latest: return NewsletterService.fetch_dashboard(db, latest.newsletter_id, user.full_name)
            raise HTTPException(status_code=404, detail="No articles found for this week.")

        ranked = []
        for a in filtered:
            score = NewsletterService.get_score(user.preference_vector, cat_map.get(str(a.get("category_id")), 0), a)
            ranked.append({"article_id": a["article_id"], "score": score})

        ranked.sort(key=lambda x: x["score"], reverse=True)
        top = ranked[:6]

        new_nl = Newsletter(
            user_id=user.user_id,
            edition=(db.query(Newsletter).filter(Newsletter.user_id == user.user_id).count() + 1),
            articles_count=len(top),
            published_date=datetime.now(timezone.utc)
        )
        db.add(new_nl)
        db.flush()

        for i, a in enumerate(top):
            db.add(NewsletterArticle(newsletter_id=new_nl.newsletter_id, article_id=a["article_id"], rank_score=a["score"], position=i + 1))
        
        db.commit()
        return NewsletterService.fetch_dashboard(db, new_nl.newsletter_id, user.full_name or user.email)

    # 7. دالة المجدول (المطلوبة في main.py)
    @staticmethod
    async def run_weekly_batch(db: Session):
        print("⏰ Starting Batch Update...")
        students = db.query(User).join(Role).filter(Role.name.lower() == "student").all()
        for student in students:
            try:
                await NewsletterService.generate_single_newsletter(db, student)
            except: continue

    # 8. دالة الداشبورد (للعرض)
    @staticmethod
    def fetch_dashboard(db: Session, nl_id: int, student_name: str):
        nl = db.query(Newsletter).filter(Newsletter.newsletter_id == nl_id).first()
        nl_articles = db.query(NewsletterArticle).filter(NewsletterArticle.newsletter_id == nl_id).order_by(NewsletterArticle.position).all()
        json_map = {str(a["article_id"]): a for a in NewsletterService.load_json_articles()}

        output = []
        for na in nl_articles:
            art = json_map.get(str(na.article_id), {})
            output.append({
                "article_id": na.article_id,
                "title": art.get("title", "No Title"),
                "summary": art.get("summary", ""),
                "image_url": art.get("photo") or art.get("image_url") or "",
                "category_id": art.get("category_id", 0),
                "is_opened": na.is_opened,
                "position": na.position,
                "published_at": str(art.get("published_at", ""))
            })

        return {
            "student_name": student_name,
            "edition": nl.edition,
            "newsletter_date": str(nl.published_date),
            "newsletter_id": nl_id,
            "articles": output
        }