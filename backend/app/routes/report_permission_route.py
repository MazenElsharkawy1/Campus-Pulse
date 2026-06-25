from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.report_permission_service import ReportPermissionService
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/report_permissions", tags=["Report Permissions"])

class PermissionGrantRequest(BaseModel):
    stakeholder_id: int = Field(..., ge=1)
    view_name: str = Field(..., min_length=1, max_length=255)

class PermissionItemResponse(BaseModel):
    id: int
    view_name: str
    assigned_at: datetime
    is_read: bool
    
    class Config:
        from_attributes = True

@router.post("/", response_model=PermissionItemResponse, status_code=status.HTTP_201_CREATED)
async def grant_access(
    payload: PermissionGrantRequest,
    db: Session = Depends(get_db)
):
    try:
        permission = await ReportPermissionService.grant_access(
            db=db,
            stakeholder_id=payload.stakeholder_id,
            view_name=payload.view_name
        )
        return PermissionItemResponse.model_validate(permission)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to grant access: {str(e)}")


@router.get("/", response_model=list[PermissionItemResponse])
async def get_accessible_items(
    stakeholder_id: int = Query(..., ge=1),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    try:
        items = await ReportPermissionService.get_accessible_items(
            db=db,
            stakeholder_id=stakeholder_id,
            unread_only=unread_only
        )
        return [PermissionItemResponse.model_validate(item) for item in items]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch items: {str(e)}")


@router.get("/{permission_id}/mark-read")
async def mark_as_read(
    permission_id: int,
    stakeholder_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db)
):
    try:
        success = await ReportPermissionService.mark_as_read(
            db=db,
            permission_id=permission_id,
            stakeholder_id=stakeholder_id
        )
        if not success:
            raise HTTPException(status_code=404, detail="Item not found or access denied")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")


@router.delete("/{permission_id}")
async def revoke_access(
    permission_id: int,
    stakeholder_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db)
):
    try:
        success = await ReportPermissionService.revoke_access(
            db=db,
            permission_id=permission_id,
            stakeholder_id=stakeholder_id
        )
        if not success:
            raise HTTPException(status_code=404, detail="Item not found or access denied")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")