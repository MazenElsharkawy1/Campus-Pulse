# app/routes/gallery_route.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.services.gallery_service import GalleryService
from pydantic import BaseModel

router = APIRouter(prefix="/gallery", tags=["Gallery"])

class VideoResponse(BaseModel):
    video_id: int
    video_url: str
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[str] = None
    published_at: Optional[str] = None
    category: Optional[str] = None

@router.get("", response_model=List[VideoResponse])
async def get_gallery_videos(
    
    db: Session = Depends(get_db)
):
    try:
        videos = GalleryService.get_all_videos()
        return videos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load videos: {str(e)}")

@router.get("/{video_id}", response_model=VideoResponse)
async def get_video_by_id(
    video_id: int,
    db: Session = Depends(get_db)
):
    return GalleryService.get_video_by_id(video_id)