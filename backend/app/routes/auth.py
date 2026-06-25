from fastapi import APIRouter, Form, HTTPException, Depends, logger
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.user_service import _validate_mti_email, authenticate_user
from app.models.users import User
from app.models.stakeholder import Stakeholder
import traceback
from app.models.roles import Role
from app.services.auth_service import login_tracker  

router = APIRouter( tags=["users login"])

@router.post("/login")
async def login(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    email = email.lower().strip()  
    try:
        if not _validate_mti_email(email):
            raise HTTPException(status_code=400, detail="Invalid email format. Only MTI emails are allowed." )
        is_blocked, remaining = login_tracker.is_blocked(email)
        if is_blocked:
            print(f"🚫 Blocked login attempt: {email}")
            raise HTTPException(status_code=403,
                detail=f"Account temporarily blocked due to multiple failed login attempts. Try again in {remaining} minutes")
        user = db.query(User).filter(User.email == email).first()
        stakeholder = db.query(Stakeholder).filter(Stakeholder.official_email == email).first()
        if not user and not stakeholder:
            login_tracker.record_failed(email)
            raise HTTPException(status_code=401,detail="Invalid email or password")
        auth_success = False
        role_name = None
        if user:
            role = db.query(Role).filter(Role.role_id == user.role_id).first()
            if not role:
                raise HTTPException(status_code=401, detail="Role not found for the user")
            role_name = role.name
            if not authenticate_user(db, email, password):
                is_blocked, remaining, failed_count = login_tracker.record_failed(email)
                if is_blocked:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Account blocked after {failed_count} failed attempts. Try again in {remaining} minutes"
                    )
                else:
                    remaining_attempts = 3 - failed_count
                    raise HTTPException(
                        status_code=401,
                        detail=f"Incorrect password. You have {remaining_attempts} more attempt(s) before temporary block."
                    )
            
            auth_success = True
            
        elif stakeholder:
            if stakeholder.password != password: 
                is_blocked, remaining, failed_count = login_tracker.record_failed(email)
                if is_blocked:
                    raise HTTPException(status_code=403,
                        detail=f"Account blocked after {failed_count} failed attempts. Try again in {remaining} minutes")
                else:
                    remaining_attempts = 3 - failed_count
                    raise HTTPException( status_code=401,
                        detail=f"Incorrect password. You have {remaining_attempts} more attempt(s) before temporary block.")
            role_name = "stakeholder"
            auth_success = True

        if auth_success:
            login_tracker.reset(email)
            print(f"✅ Successful login: {email} as {role_name}")
            return JSONResponse(
                status_code=200,
                content={
                    "status": "success",
                    "message": "Logged in successfully",
                    "user": {
                        "email": email,
                        "role": role_name,
                        "user_id": user.user_id if user else stakeholder.stakeholder_id,
                        "full_name": user.full_name if user else stakeholder.name
                    }
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/admin/blocked_accounts")
async def get_blocked_accounts():
    blocked = login_tracker.get_all_blocked()
    return {"status": "success", "count": len(blocked), "accounts": blocked}


@router.post("/admin/unblock/{email}")
async def unblock_account(email: str):
    login_tracker.reset(email.lower())
    return {"status": "success", "message": f"تم فك الحظر عن: {email}"}

@router.post("/admin/block/{email}")
async def block_account(email: str):
    """حظر حساب يدوياً"""
    login_tracker.block(email.lower())
    return {"status": "success", "message": f"تم حظر: {email}"}