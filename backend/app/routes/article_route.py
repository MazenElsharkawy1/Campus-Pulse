from fastapi import APIRouter, Depends, Body, HTTPException, Header
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.article_service import ArticleService
router = APIRouter(prefix="/articles", tags=["Adviser Articles"])

@router.post("/publish/{article_id}")
async def publish_article_route(
    article_id: int,
    x_user_email: str = Header(..., description="Email of the Media Adviser"),
    final_summary: str = Body(None, embed=True), 
    db: Session = Depends(get_db)
):
    try:
        result = await ArticleService.publish_article(
            db=db, 
            email=x_user_email, 
            article_id=article_id, 
            final_summary=final_summary
        )
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/my-articles")
async def get_my_published_articles(email: str, db: Session = Depends(get_db)):
    articles = ArticleService.get_adviser_articles(db, email)
    return articles    

@router.get("/pinned-articles")
async def get_pending_articles(
    email: str, 
    db: Session = Depends(get_db)
):
    articles = ArticleService.get_pending_articles(db, email)
    return  articles