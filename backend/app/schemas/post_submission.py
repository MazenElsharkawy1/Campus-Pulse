# schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class PostStatusEnum(str, Enum):
    PENDING = "pending"
    PUBLISHED = "published"

# Stakeholder Submit
class PostSubmissionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=10)
    image_url: Optional[str] = None
    attachment_url: Optional[str] = None
    
    # Stakeholder Data
    stakeholder_email: str = Field(...)

# Media Advisor Edit
class PostSubmissionEdit(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = Field(None, min_length=10)
    image_url: Optional[str] = None
    attachment_url: Optional[str] = None
    edit_reason: str = Field(..., min_length=5)  # Required reason for edit

# Review
class PostReviewRequest(BaseModel):
    status: PostStatusEnum
    rejection_reason: Optional[str] = None

# Response Models
class PostSubmissionResponse(BaseModel):
    submission_id: int
    title: str
    content: str
    status: PostStatusEnum
    submitted_at: str
    stakeholder_email: str
    rejection_reason: Optional[str] = None
    published_at: Optional[str] = None
    version: int = 1
    
    class Config:
        from_attributes = True

class PostSubmissionDetailResponse(PostSubmissionResponse):
    image_url: Optional[str] = None
    attachment_url: Optional[str] = None
    
    # Reviewer Data
    reviewed_by_email: Optional[str] = None
    reviewed_at: Optional[str] = None
    
    # Editor Data
    edited_by_email: Optional[str] = None
    edited_at: Optional[str] = None
    edit_reason: Optional[str] = None
    original_title: Optional[str] = None
    original_content: Optional[str] = None

class EditHistoryResponse(BaseModel):
    submission_id: int
    original_title: str
    original_content: str
    current_title: str
    current_content: str
    edited_by: Optional[str]
    edited_by_email: Optional[str]
    edited_at: Optional[str]
    edit_reason: Optional[str]
    version: int