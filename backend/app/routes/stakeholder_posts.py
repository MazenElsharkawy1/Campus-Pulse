# routes/stakeholder_posts.py
from fastapi import APIRouter, HTTPException
from typing import List

from app.utils.json_storage import (
    create_submission,
    get_submission,
    get_submissions_by_stakeholder,
    get_all_submissions
)
from app.schemas.post_submission import PostSubmissionCreate, PostSubmissionResponse

router = APIRouter(prefix="/stakeholder/posts", tags=["Stakeholder Posts"])

@router.post("/submit", response_model=PostSubmissionResponse)
async def submit_post(post: PostSubmissionCreate):
    
    try:
        submission_data = {
            "stakeholder_email": post.stakeholder_email,
            "title": post.title,
            "content": post.content,
            "image_url": post.image_url,
            "attachment_url": post.attachment_url
        }
        
        new_submission = create_submission(submission_data)
        return PostSubmissionResponse(**new_submission)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit post: {str(e)}")

@router.get("/my-submissions/{stakeholder_email}")
async def get_my_submissions(stakeholder_email: str):
    """
    عرض كل البوستات اللي قدمها الـ stakeholder (بالإيميل)
    """
    submissions = get_submissions_by_stakeholder(stakeholder_email)
    
    # تحويل للـ response format
    return [PostSubmissionResponse(**sub) for sub in submissions]