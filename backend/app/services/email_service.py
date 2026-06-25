import os
import json
from pathlib import Path
from tkinter import font
from sqlalchemy.orm import Session
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv
from app.models.users import User
from app.models.newsletter import Newsletter
from app.models.newsletter_article import NewsletterArticle

load_dotenv()

BASE_DIR = Path(r"C:\campus_pulse\scraper\webscraping\campuspulse_posts.json").resolve().parent.parent.parent
JSON_PATH = BASE_DIR / "scraper" / "webscraping" / "campuspulse_posts.json"
STATIC_URL_PREFIX = r"C:\campus_pulse\scraper\webscraping\downloaded_media"
def load_articles_map():
    with open(JSON_PATH, "r", encoding="utf8") as f:
        articles = json.load(f)
    return {a["article_id"]: a for a in articles}

import os
from pathlib import Path
BASE_MEDIA_URL = os.getenv("MEDIA_URL", "STATIC_URL_PREFIX") 
def send_newsletter_by_user_id(db: Session, user_id: int):
    api_key = os.getenv("SENDGRID_API_KEY")
    sender_email = os.getenv("SENDER_EMAIL")
    if not api_key or not sender_email:
        print("❌ .env غير مكتمل: تأكد من وجود SENDGRID_API_KEY و SENDER_EMAIL")
        return False
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or not user.email:
        print(f"❌ مستخدم غير موجود أو بدون بريد: {user_id}")
        return False
    newsletter = db.query(Newsletter).filter(
        Newsletter.user_id == user_id
    ).order_by(Newsletter.newsletter_id.desc()).first()
    if not newsletter: 
        print(f"❌ لا توجد نشرة للمستخدم: {user_id}")
        return False
    nl_articles = db.query(NewsletterArticle).filter(
        NewsletterArticle.newsletter_id == newsletter.newsletter_id
    ).all()
    if not nl_articles:
        print(f"❌ لا توجد مقالات في النشرة: {newsletter.newsletter_id}")
        return False
    articles_map = load_articles_map()
    articles = []
    for na in nl_articles:
        art = articles_map.get(na.article_id, {})
        if not art:
            continue
        
        
        articles.append({
            "article_id": art.get("article_id", "No article_id"),
            "title": art.get("title", "No Title"),
            "summary": art.get("summary", "No Summary"),
            "original_media_url": art.get("original_media_url")
        })
    if not nl_articles:
        print(f"ℹ️ النشرة {newsletter.newsletter_id} فارغة — تم تخطيها.")
        return False 
    article_html = "".join([
        f"""
        <div class="article-card">
            
            <div class="card-image">
                <img src='{art['original_media_url']}' alt='{art['title']}' onerror="this.src='https://via.placeholder.com/400x250?text=No+Image'">
            </div>
            <div class="card-body">
                <div class="card-meta">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                </div>
                <p class="card-summary">{art['summary']}</p>
                <div class="card-title">
                    <a href='http://192.168.1.11:3000/news/{art['article_id']}' target='_blank' class="read-more">
                        <h5>{art['title']}</h5>
                    </a>
                </div>
            </div>
        </div>
        """
        for art in articles
    ])

    html_content = f"""
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>نشرتك الأسبوعية - Campus Pulse</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
              
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #333;
                padding: 20px;
                min-height: 100vh;
            }}
            
            .container {{
                max-width: 1200px;
                margin: 0 auto;
            }}
            
            .header {{
                background: white;
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                text-align: center;
            }}
            
            .header h1 {{
                color: #4361ee;
                font-size: 2.5em;
                margin-bottom: 10px;
                font-weight: 700;
            }}
            
            .header p {{
                color: #666;
                font-size: 1.2em;
            }}
            
            .greeting {{
                background: linear-gradient(135deg, #4361ee, #3a0ca3);
                color: white;
                padding: 20px 30px;
                border-radius: 12px;
                margin-bottom: 30px;
                font-size: 1.3em;
                font-weight: 600;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }}
            
            .articles-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                gap: 25px;
                margin-bottom: 30px;
            }}
            
            .article-card {{
                background: white;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                transition: transform 0.3s, box-shadow 0.3s;
            }}
            
            .article-card:hover {{
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }}
            
            .card-header {{
                padding: 15px 20px;
                background: #f8f9ff;
                border-bottom: 1px solid #eee;
            }}
         
            .card-image {{
                width: 100%;
                height: 250px;
                overflow: hidden;
                background: #f0f0f0;
            }}
            
            .card-image img {{
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s;
            }}
            
            .article-card:hover .card-image img {{
                transform: scale(1.05);
            }}
            
            .card-body {{
                padding: 20px;
            }}
            
            .card-title {{
                font-size: 1.4em;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 10px;
                line-height: 1.4;
            }}
            
            .card-meta {{
                display: flex;
                align-items: center;
                gap: 8px;
                color: #64748b;
                font-size: 0.9em;
                margin-bottom: 15px;
            }}
            
            .card-meta svg {{
                width: 16px;
                height: 16px;
            }}
            
            .card-summary {{
                color: #475569;
                line-height: 1.6;
                margin-bottom: 20px;
                font-size: 0.95em;
            }}
            
            .card-actions {{
                display: flex;
                flex-direction: column;
                gap: 12px;
            }} 
            
            .footer {{
                text-align: center;
                color: white;
                padding: 20px;
                margin-top: 30px;
                font-size: 0.9em;
            }}
            
            @media (max-width: 768px) {{
                .articles-grid {{
                    grid-template-columns: 1fr;
                }}
                
                .header h1 {{
                    font-size: 2em;
                }}
                
                body {{
                    padding: 10px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Campus Pulse</h1>
                <p>Your Weekly Newsletter</p>
            </div>
            
            <div class="articles-grid">
                {article_html}
            </div>
            
            <div class="footer">
                <p>© 2026 Campus Pulse - Modern University for Technology and Information</p>
            </div>
        </div>
    </body>
    </html>
"""
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)     
    message = Mail(
        from_email=os.getenv("SENDER_EMAIL"),
        to_emails=user.email,
        subject="Campus Pulse 📰",
        html_content=html_content
    )
    #message.template_id = "d-a2e6d38ca41f41bbbf7b8ac96f6df0cd"
    # message.template_id = ""  # تأكد من تعيين هذا إلى قالب SendGrid الصحيح
    # with open(JSON_PATH, "r", encoding="utf-8") as f:
    #     raw_data = json.load(f)     
    # message.dynamic_template_data = {
    #     "user_name": user.full_name or user.email.split('@')[0],
    #     "university_logo_url": "https://www.mti.edu.eg/assets/img/logo.png",
    #     "project_logo_url": "https://yourdomain.com/logos/campuspulse.png",
    #     "articles": [
    #         {
    #             "title": art["title"],
    #             "summary": art["summary"] or "لا يوجد ملخص",
    #             #"photo": art["photo"] or art.get("Photo"),
    #             "original_media_url": art.get("original_media_url"),
    #             "image_url": art["image_url"] or "https://yourdomain.com/default-image.png",
    #             "url": f"https://mti.edu.eg"  
    #         }
    #         for art in articles 
    #     ]
    # } 

   
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

