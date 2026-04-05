# app/main.py
import json
import os
from fastapi import  HTTPException, APIRouter
from app.services.ai_modules import AIProcessor
from app.schemas.ai_schema import ArticleOutput
ai_processor = AIProcessor()
router = APIRouter()
@router.get("/process-articles", response_model=list[ArticleOutput])
async def process_articles():
    file_path = "campuspulse_posts.json"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        results = []
        for row in data:
            content = row.get("content", "").strip()
            if not content:
                continue

            ai_result = ai_processor.process_article(content, row.get("title", ""))
            results.append(ArticleOutput(
                post_id=row.get("id", 0),
                title=row.get("title", ""),
                summary=ai_result["summary"],
                category=ai_result["category"],
               # confidence=ai_result["confidence"],
                vector=ai_result["vector"]
            ))

        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))