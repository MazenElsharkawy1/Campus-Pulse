# ============================================================================
# 🌐 Campus Pulse - Home Page Router (API Endpoints)
# ============================================================================

from fastapi import APIRouter, HTTPException
from datetime import datetime

from app.services.home_service import HomeService
from app.schemas.home import HomeFeedResponse, DebugResponse


router = APIRouter(prefix="/api/v1", tags=["Home"])

@router.get("/home", response_model=HomeFeedResponse) 
async def get_home_feed():
    """
    🏠 Get ALL posts in one unified feed
    
    Sources:
    • Announcements from scraper JSON
    • Stakeholder posts (published only) from submissions JSON
    
    Returns:
    • Single list of all posts, sorted by date (newest first)
    • No pagination, no filtering, no division
    """
    try:
        posts = HomeService.get_unified_home_feed()
        
        return HomeFeedResponse(
            posts=posts,
            total_count=len(posts),
            last_updated=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"❌ Error in get_home_feed: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to load home feed: {str(e)}"
        )


@router.get("/home/debug", response_model=DebugResponse)
async def debug_feed():
    """
    🔍 Debug endpoint للتحقق من البيانات
    (احذفه في الإنتاج)
    """
    return HomeService.get_debug_info()