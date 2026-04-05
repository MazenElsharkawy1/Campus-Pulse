# app/services/email_service.py
import os
import json
from pathlib import Path
from sqlalchemy.orm import Session
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv
from app.models.users import User
from app.models.newsletter import Newsletter
from app.models.newsletter_article import NewsletterArticle

load_dotenv()

# تحديد مسار JSON نسبيًا
BASE_DIR = Path(r"C:\campus_pulse\scraper\webscraping\articles.json").resolve().parent.parent.parent
JSON_PATH = BASE_DIR / "scraper" / "webscraping" / "articles.json"
STATIC_URL_PREFIX = r"C:\campus_pulse\scraper\webscraping\downloaded_media"
def load_articles_map():
    with open(JSON_PATH, "r", encoding="utf8") as f:
        articles = json.load(f)
    return {a["article_id"]: a for a in articles}

def send_newsletter_by_user_id(db: Session, user_id: int):
    # التحقق من المتغيرات البيئية
    api_key = os.getenv("SENDGRID_API_KEY")
    sender_email = os.getenv("SENDER_EMAIL")
    if not api_key or not sender_email:
        print("❌ .env غير مكتمل: تأكد من وجود SENDGRID_API_KEY و SENDER_EMAIL")
        return False

    # 1. جلب بيانات المستخدم (باستخدام User.id)
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or not user.email:
        print(f"❌ مستخدم غير موجود أو بدون بريد: {user_id}")
        return False
    # 2. جلب آخر نشرة للمستخدم (بدون شرط التاريخ للتجربة)
    newsletter = db.query(Newsletter).filter(
        Newsletter.user_id == user_id
    ).order_by(Newsletter.newsletter_id.desc()).first()

    if not newsletter: 
        print(f"❌ لا توجد نشرة للمستخدم: {user_id}")
        return False

    # 3. جلب مقالات النشرة
    nl_articles = db.query(NewsletterArticle).filter(
        NewsletterArticle.newsletter_id == newsletter.newsletter_id
    ).all()

    if not nl_articles:
        print(f"❌ لا توجد مقالات في النشرة: {newsletter.newsletter_id}")
        return False

   # 4. تحميل تفاصيل المقالات من JSON
    articles_map = load_articles_map()
    articles = []
    for na in nl_articles:
        art = articles_map.get(na.article_id, {})
        if not art:
            continue

        # ✅ معالجة الصورة لكل مقالة على حدة
        image_url = None
        if art.get("photo"):
            filename = art["photo"].split("\\")[-1]  # للمسارات على Windows
            image_url = f"{STATIC_URL_PREFIX}/{filename}"

        articles.append({
            "title": art.get("title", "No Title"),
            "summary": art.get("summary", "No Summary"),
            "image_url": image_url  # ← هنا يتم ربط الصورة بالمقالة
        })
    if not nl_articles:
        print(f"ℹ️ النشرة {newsletter.newsletter_id} فارغة — تم تخطيها.")
        return False  # أو True إذا كنت تعتبرها "ناجحة"
    # 5. إرسال الإيميل
    article_html = "".join([
        f"<li><b>{art['title']}</b><br>{art['summary']}<br><img src='{art['image_url']}' alt='image_url' style='max-width: 100%; height: auto;'></li>"
        for art in articles
    ])

    html_content = f"""
    <h2>مرحباً {user.full_name or user.email.split('@')[0]}!</h2>
    <p>هذا نشرتك الأسبوعية من <b>Campus Pulse</b>:</p>
    <ul>{article_html}</ul>
    """
    message = Mail(
        from_email=os.getenv("SENDER_EMAIL"),
        to_emails=user.email,
        subject="Campus Pulse 📰",
        html_content=html_content
    )

    message.template_id = "d-a2e6d38ca41f41bbbf7b8ac96f6df0cd"
    message.dynamic_template_data = {
    "user_name": user.full_name,
    "articles": [
        {"title": art["title"], "summary": art["summary"], "photo": art["image_url"]}
        for art in articles
    ]
    }  
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)
    for item in raw_data:
        photo_url = None
        if item.get("photo"):
            filename = item["photo"].split("\\")[-1]  # للمسارات على Windows
            photo_url = f"{STATIC_URL_PREFIX}/{filename}"
          
    message.dynamic_template_data = {
        "user_name": user.full_name or user.email.split('@')[0],
        "university_logo_url": "https://www.mti.edu.eg/assets/img/logo.png",
        "project_logo_url": "https://yourdomain.com/logos/campuspulse.png",
        "articles": [
            {
                "title": art["title"],
                "summary": art["summary"] or "لا يوجد ملخص",
                "image_url": art["image_url"], # قد يكون None
                "url": f"https://mti.edu.eg"  # رابط الخبر على الموقع
            }
            for art in articles 
        ]
    } 

   
    try:
        sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
        response = sg.send(message)
        print(response.status_code)
        print(response.body)
        print(response.headers)
        print(f"✅ إيميل أُرسل إلى: {user.email}")
        return True
    except Exception as e:
        print(f"❌ فشل إرسال إلى {user.email}: {e}")
        return False 

