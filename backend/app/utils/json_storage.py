# utils/json_storage.py
import json
import os
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pathlib import Path
import msvcrt
import time

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
SUBMISSIONS_FILE = DATA_DIR / r"C:\\campus_pulse\\scraper\\webscraping\\post_submission.json"

def _init_file():
    """Initialize JSON file if not exists"""
    if not SUBMISSIONS_FILE.exists():
        with open(SUBMISSIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump({"submissions": [], "next_id": 1}, f, ensure_ascii=False, indent=2)

def _lock_file(f):
    """Lock file for exclusive access (Windows)"""
    try:
        msvcrt.locking(f.fileno(), msvcrt.LK_LOCK, 1)
    except:
        pass

def _unlock_file(f):
    """Unlock file (Windows)"""
    try:
        msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
    except:
        pass

def load_submissions() -> Dict[str, Any]:
    """Load all submissions with retry logic"""
    _init_file()
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with open(SUBMISSIONS_FILE, 'r', encoding='utf-8') as f:
                _lock_file(f)
                try:
                    data = json.load(f)
                finally:
                    _unlock_file(f)
            return data
        except (json.JSONDecodeError, PermissionError) as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(0.1)
    return {"submissions": [], "next_id": 1}

def save_submissions(data: Dict[str, Any]):
    """Save submissions with retry logic"""
    _init_file()
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with open(SUBMISSIONS_FILE, 'r+', encoding='utf-8') as f:
                _lock_file(f)
                try:
                    f.seek(0)
                    json.dump(data, f, ensure_ascii=False, indent=2)
                    f.truncate()
                finally:
                    _unlock_file(f)
            return
        except (PermissionError, IOError) as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(0.1)

def create_submission(submission_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create new submission - ONLY adds new record, doesn't affect others
    """
    data = load_submissions()
    
    new_submission = {
        "submission_id": data["next_id"],
        "stakeholder_email": submission_data.get("stakeholder_email", ""),
        "title": submission_data["title"],
        "content": submission_data["content"],
        "image_url": submission_data.get("image_url"),
        "attachment_url": submission_data.get("attachment_url"),
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        
        # Media Advisor Data
        "reviewed_by_email": None,
        "reviewed_at": None,
        "rejection_reason": None,
        
        # Edit History
        "edited_by_email": None,
        "edited_at": None,
        "edit_reason": None,
        "original_title": submission_data["title"],  # Keep original for tracking
        "original_content": submission_data["content"],
        
        # Publication
        "published_at": None,
        "version": 1  # Track edits
    }
    
    data["submissions"].append(new_submission)
    data["next_id"] += 1
    save_submissions(data)
    
    return new_submission

def get_submission(submission_id: int) -> Optional[Dict[str, Any]]:
    """Get single submission by ID - READ ONLY"""
    data = load_submissions()
    for sub in data["submissions"]:
        if sub["submission_id"] == submission_id:
            return sub
    return None

def get_submissions_by_stakeholder(stakeholder_email: str) -> List[Dict[str, Any]]:
    """Get all submissions by stakeholder - READ ONLY"""
    data = load_submissions()
    return [
        sub for sub in data["submissions"] 
        if sub["stakeholder_email"] == stakeholder_email
    ]

def get_pending_submissions() -> List[Dict[str, Any]]:
    """Get pending submissions - READ ONLY"""
    data = load_submissions()
    return [
        sub for sub in data["submissions"] 
        if sub["status"] == "pending"
    ]

def get_all_submissions(status: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get all submissions with optional filter - READ ONLY"""
    data = load_submissions()
    submissions = data["submissions"]
    if status:
        submissions = [sub for sub in submissions if sub["status"] == status]
    return sorted(submissions, key=lambda x: x["submitted_at"], reverse=True)

def update_submission_review(submission_id: int, updates: Dict[str, Any], 
                             reviewer_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update submission for review (approve/reject) - ONLY updates specific post
    """
    data = load_submissions()
    
    for i, sub in enumerate(data["submissions"]):
        if sub["submission_id"] == submission_id:
            if sub["status"] != "pending":
                return None  # Already reviewed
            
            # Update review data
            data["submissions"][i].update(updates)
            data["submissions"][i]["reviewed_by_email"] = reviewer_data.get("email")
            data["submissions"][i]["reviewed_at"] = datetime.now(timezone.utc).isoformat()
            
            save_submissions(data)
            return data["submissions"][i]
    
    return None

def update_submission_edit(submission_id: int, edits: Dict[str, Any], 
                           editor_data: Dict[str, Any], 
                           edit_reason: str) -> Optional[Dict[str, Any]]:
    """
    Edit submission content (Media Advisor can edit before publishing)
    ONLY updates the specific post, doesn't affect others
    """
    data = load_submissions()
    
    for i, sub in enumerate(data["submissions"]):
        if sub["submission_id"] == submission_id:
            # Can only edit if pending or approved (not rejected)
            if sub["status"] == "rejected":
                return None
            
            # Save edit history
            data["submissions"][i]["edited_by_email"] = editor_data.get("email")
            data["submissions"][i]["edited_at"] = datetime.now(timezone.utc).isoformat()
            data["submissions"][i]["edit_reason"] = edit_reason
            data["submissions"][i]["version"] = sub.get("version", 1) + 1
            
            # Update content (only fields that are provided)
            if "title" in edits:
                data["submissions"][i]["title"] = edits["title"]
            if "content" in edits:
                data["submissions"][i]["content"] = edits["content"]
            if "image_url" in edits:
                data["submissions"][i]["image_url"] = edits["image_url"]
            if "attachment_url" in edits:
                data["submissions"][i]["attachment_url"] = edits["attachment_url"]
            
            save_submissions(data)
            return data["submissions"][i]
    
    return None

def delete_submission(submission_id: int) -> bool:
    """Delete submission - ONLY removes specific post"""
    data = load_submissions()
    
    original_len = len(data["submissions"])
    data["submissions"] = [
        sub for sub in data["submissions"] 
        if sub["submission_id"] != submission_id
    ]
    
    if len(data["submissions"]) < original_len:
        save_submissions(data)
        return True
    return False

def get_edit_history(submission_id: int) -> Optional[Dict[str, Any]]:
    """Get edit history for a submission"""
    submission = get_submission(submission_id)
    if not submission:
        return None
    
    return {
        "submission_id": submission_id,
        "original_title": submission.get("original_title"),
        "original_content": submission.get("original_content"),
        "current_title": submission.get("title"),
        "current_content": submission.get("content"),
        "edited_by_email": submission.get("edited_by_email"),
        "edited_at": submission.get("edited_at"),
        "edit_reason": submission.get("edit_reason"),
        "version": submission.get("version", 1)
    }