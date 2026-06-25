# routes/media_advisor_posts.py
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from app.utils.json_storage import (
    get_pending_submissions,
    get_all_submissions,
    get_submission,
    update_submission_review,
    update_submission_edit,
    delete_submission,
    get_edit_history
)
from app.schemas.post_submission import (
    PostSubmissionDetailResponse, 
    PostReviewRequest, 
    PostStatusEnum,
    PostSubmissionEdit,
    EditHistoryResponse
)

router = APIRouter(prefix="/media-advisor/posts", tags=["Media Advisor Posts"])

@router.get("/pending", response_model=List[PostSubmissionDetailResponse])
async def get_pending(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """عرض البوستات المستنية مراجعة"""
    submissions = get_pending_submissions()
    paginated = submissions[skip:skip + limit]
    return [PostSubmissionDetailResponse(**sub) for sub in paginated]

@router.get("/all", response_model=List[PostSubmissionDetailResponse])
async def get_all(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    """عرض كل البوستات مع الفلترة"""
    submissions = get_all_submissions(status)
    paginated = submissions[skip:skip + limit]
    return [PostSubmissionDetailResponse(**sub) for sub in paginated]

@router.post("/review/{submission_id}")
async def review_post(submission_id: int, review: PostReviewRequest,
                      reviewer_email: str = "advisor@campus.edu"):
    """
    مراجعة بوست: موافقة أو رفض
    """
    submission = get_submission(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission["status"] != "pending":
        raise HTTPException(status_code=400, detail="Submission already reviewed")
    
    reviewer_data = {
        "email": reviewer_email
    }
    
    updates = {
        "status": review.status.value
    }
    
    # if review.status == PostStatusEnum.REJECTED:
    #     if not review.rejection_reason or not review.rejection_reason.strip():
    #         raise HTTPException(status_code=400, detail="Rejection reason is required")
    #     updates["rejection_reason"] = review.rejection_reason.strip()
    
    # if review.status == PostStatusEnum.APPROVED:
    #     updates["announcement_id"] = f"ann_{submission_id}"
    #     updates["published_at"] = submission.get("reviewed_at")
    #     updates["status"] = "published"
    
    updated = update_submission_review(submission_id, updates, reviewer_data)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update submission")
    
    return {
        "message": f"Post {review.status.value} successfully",
        "submission_id": submission_id,
        "status": updated["status"],
        "reviewed_by": reviewer_email
    }

@router.put("/edit/{submission_id}", response_model=PostSubmissionDetailResponse)
async def edit_post(
    submission_id: int,
    edit: PostSubmissionEdit,
    editor_email: str = "advisor@campus.edu"
):
    """
    تعديل بوست (Media Advisor يقدر يعدل المحتوى قبل النشر)
    """
    submission = get_submission(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission["status"] == "rejected":
        raise HTTPException(status_code=400, detail="Cannot edit rejected submission")
    
    editor_data = {
        "email": editor_email
    }
    
    # تحضير الـ edits
    edits = {}
    if edit.title:
        edits["title"] = edit.title
    if edit.content:
        edits["content"] = edit.content
    if edit.image_url:
        edits["image_url"] = edit.image_url
    if edit.attachment_url:
        edits["attachment_url"] = edit.attachment_url
    
    if not edits:
        raise HTTPException(status_code=400, detail="No edits provided")
    
    updated = update_submission_edit(submission_id, edits, editor_data, edit.edit_reason)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to edit submission")
    
    return PostSubmissionDetailResponse(**updated)

@router.delete("/{submission_id}")
async def delete_submission_endpoint(submission_id: int):
    """حذف بوست"""
    deleted = delete_submission(submission_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": "Submission deleted successfully", "submission_id": submission_id}