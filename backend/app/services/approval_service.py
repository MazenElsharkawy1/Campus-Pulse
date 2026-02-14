from app.db.databse import SessionLocal
from app.models.newsletters import News
from app.schemas.news import NewsSubmit

def send_news_to_manager(submit_data: NewsSubmit):
    db = SessionLocal()
    news = db.query(News).filter(News.news_id == submit_data.news_id ).first()
    if not news:
        raise ValueError("News not found")
    news.status = "submitted"
    news.is_verified = True
    news.manager_id = submit_data.manager_id
    db.commit()
    db.refresh(news)
    db.close()
    return news