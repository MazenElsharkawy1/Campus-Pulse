from fastapi import APIRouter, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.user_service import authenticate_user, register_user, get_user_role
from app.models.users import User
import traceback

router = APIRouter()

@router.post("/login")
def login(email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    """معالجة تسجيل الدخول من قاعدة البيانات - استجابة JSON"""
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            raise HTTPException(status_code=401, detail="الإيميل غير موجود في النظام")
        
        auth_result = authenticate_user(db, email, password)
        if not auth_result:
            raise HTTPException(status_code=401, detail="كلمة المرور غير صحيحة")
        
        if user.password == "changeme" and password == "changeme":
            return JSONResponse(
                status_code=200,
                content={
                    "status": "first_login",
                    "message": "يرجى تحديث كلمة المرور الخاصة بك",
                    "email": email
                }
            )
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": "تم تسجيل الدخول بنجاح",
                "email": email
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ خطأ: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="خطأ داخلي في الخادم")


@router.get("/user")
def user(email: str, db: Session = Depends(get_db)):
    """عرض بيانات صفحة التسجيل كـ JSON"""
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="المستخدم غير موجود")
        
        role_id = user.role_id
        is_student = (role_id == 3)
        
        return JSONResponse(
            status_code=200,
            content={
                "email": email,
                "role_id": role_id,
                "is_student": is_student
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="خطأ في جلب بيانات المستخدم")


@router.post("/register")
def register(
    email: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    category_names: list = Form([]),
    phone: str = Form(None),
    full_name: str = Form(None),
    db: Session = Depends(get_db)
):
    print(f"📩 تم استلام: email={email}, password_len={len(password)}")
    print(f"   categories: {category_names}")
    print(f"   full_name: {full_name}, phone: {phone}")
    
    try:
        if password != confirm_password:
            raise HTTPException(status_code=400, detail="كلمات المرور غير متطابقة")
        
        # تنظيف البيانات
        phone = phone.strip() if phone else None
        full_name = full_name.strip() if full_name else email.split("@")[0].replace(".", " ").title()
        selected_category = category_names  # اختر أول فئة
        # في دالة register
        raw_categories = category_names  # قد تكون ['culture,sport'] أو ['culture', 'sport']

        # تحويل إلى قائمة صحيحة
        cleaned_categories = []
        for item in raw_categories:
            if "," in item:
                # تقسيم النص إذا كان يحتوي فواصل
                cleaned_categories.extend([x.strip() for x in item.split(",") if x.strip()])
            else:
                cleaned_categories.append(item.strip())

        # إزالة التكرارات والقيم الفارغة
        selected_category_names = list(set(cleaned_categories))
        # استدعاء الدالة المحدثة
        success = register_user(
            db=db,
            email=email,
            password=password,
            full_name=full_name,
            phone=phone,
            selected_category_name=selected_category_names
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="فشل تحديث الحساب - المستخدم غير موجود")
        
        role_id = get_user_role(db, email)
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": "تم إنشاء الحساب وتحديث البيانات بنجاح",
                "email": email,
                "role_id": role_id,
                "full_name": full_name,
                "phone": phone,
                "selected_category": selected_category_names,
                "is_student": (role_id == 3)
            }
        )
    
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"❌ خطأ في التسجيل: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="خطأ داخلي في الخادم")