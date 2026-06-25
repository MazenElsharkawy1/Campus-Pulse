# routes/category_route.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["Categories Page"])

@router.get("/preview")
async def get_categories_preview(db: Session = Depends(get_db)):
    return await CategoryService.get_all_categories_with_previews(db)

@router.get("/{category_id}/all")
async def get_full_category(category_id: int, db: Session = Depends(get_db)):
    data = await CategoryService.get_full_category_articles(db, category_id)
    
    if data is None:
        raise HTTPException(status_code=404, detail="Category not found")
        
    return data