import json
import os
from typing import List, Dict, Any
from fastapi import HTTPException

class GalleryService:
    VIDEOS_DIR = r"C:\campus_pulse\scraper\webscraping\downNloaded_videos-20260412T161339Z-3-001"
    JSON_FILE_PATH = r"C:\campus_pulse\scraper\webscraping\mTti_videos_data.json"
    
    @staticmethod
    def _load_videos_data() -> List[Dict[str, Any]]:
        if not os.path.exists(GalleryService.JSON_FILE_PATH):
            return []
        
        try:
            with open(GalleryService.JSON_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                return data.get("videos", data.get("data", []))
            else:
                return []
                
        except json.JSONDecodeError as e:
            print(f"❌ JSON decode error: {str(e)}")
            return []
        except Exception as e:
            print(f"❌ Error loading video  {str(e)}")
            return []
    
    @staticmethod
    def _convert_to_public_url(local_path: str) -> str:
        if not local_path:
            return ""
        
        filename = os.path.basename(local_path)
        
        return f"/media/{filename}"
    
    @staticmethod
    def get_all_videos() -> List[Dict[str, Any]]:
        videos_data = GalleryService._load_videos_data()
        
        formatted_videos = []
        for idx, video in enumerate(videos_data):
            local_path = (
                video.get("video_path") or 
                video.get("local_path") or 
                video.get("path") or 
                video.get("file_path") or
                video.get("video_url", "")
            )
            
            public_url = GalleryService._convert_to_public_url(local_path)
            
            formatted_videos.append({
                "video_id": video.get("video_id") or video.get("id") or video.get("news_id") or idx + 1,
                "video_url": public_url,
                "title": video.get("title") or video.get("news_title") or f"Video {idx + 1}",
                "description": video.get("description") or video.get("summary") or "",
                "thumbnail": video.get("thumbnail") or video.get("thumbnail_url") or "",
                "duration": video.get("duration") or "",
                "published_at": video.get("published_at") or video.get("created_at") or "",
                "category": video.get("category") or "General",
            })
        
        return formatted_videos
    
    @staticmethod
    def get_video_by_id(video_id: int) -> Dict[str, Any]:
        videos = GalleryService.get_all_videos()
        for video in videos:
            if video["video_id"] == video_id:
                return video
        raise HTTPException(status_code=404, detail="Video not found")