from sqlalchemy.orm import Session
from app.models.report_permission import ReportPermission
from app.models.stakeholder import Stakeholder
from app.models.users import User
from datetime import datetime

class ReportPermissionService:
    @staticmethod
    async def grant_access(
        db: Session,
        stakeholder_id: int,
        view_name: str
    ) -> ReportPermission:
        stakeholder = db.query(Stakeholder).filter(
            Stakeholder.stakeholder_id == stakeholder_id
        ).first()
        users = db.query(User).filter(
            User.user_id == User.user_id  
        ).all()
        if not stakeholder:
            raise ValueError(f"Stakeholder with ID {stakeholder_id} not found")
        existing = db.query(ReportPermission).filter(
            ReportPermission.stakeholder_id == stakeholder_id,
            ReportPermission.view_name == view_name
        ).first()
        if existing:
            existing.assigned_at = datetime.utcnow()  
            db.commit()
            db.refresh(existing)
            return existing
        new_permission = ReportPermission(
            stakeholder_id=stakeholder_id,
            view_name=view_name,
            manager_id=users.user_id, 
            is_read=False,
            assigned_at=datetime.utcnow()
        )
        db.add(new_permission)
        db.commit()
        db.refresh(new_permission)
        return new_permission
    
    @staticmethod
    async def get_accessible_items(
        db: Session,
        stakeholder_id: int,
        manager_id: int = None,
        unread_only: bool = False
    ) -> list[ReportPermission]:
        query = db.query(ReportPermission).filter(
            ReportPermission.stakeholder_id == stakeholder_id
        )
        if manager_id is not None:
            query = query.filter(ReportPermission.manager_id == manager_id)
        if unread_only:
            query = query.filter(ReportPermission.is_read == False)
        return query.order_by(ReportPermission.assigned_at.desc()).all()
    
    @staticmethod
    async def mark_as_read(
        db: Session,
        permission_id: int,
        stakeholder_id: int = None
    ) -> bool:
        query = db.query(ReportPermission).filter(ReportPermission.id == permission_id)
        if stakeholder_id is not None:
            query = query.filter(ReportPermission.stakeholder_id == stakeholder_id)
        record = query.first()
        if not record:
            return False
        record.is_read = True
        db.commit()
        return True
    
    @staticmethod
    async def revoke_access(
        db: Session,
        permission_id: int,
        stakeholder_id: int = None
    ) -> bool:
        query = db.query(ReportPermission).filter(ReportPermission.id == permission_id)
        if stakeholder_id is not None:
            query = query.filter(ReportPermission.stakeholder_id == stakeholder_id)
        record = query.first()
        if not record:
            return False
        db.delete(record)
        db.commit()
        return True