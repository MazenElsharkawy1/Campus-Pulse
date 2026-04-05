# app/services/weekly_sender.py
from sqlalchemy.orm import Session
from app.services.email_service import send_newsletter_by_user_id
from app.models.users import User
from app.models.newsletter import Newsletter

def send_all_ready_newsletters(db: Session):
    """
    إرسال جميع النشرات الجاهزة (بغض النظر عن التاريخ)
    """
    # جلب جميع النشرات من قاعدة البيانات
    newsletters = db.query(Newsletter).all()

    for nl in newsletters:
        user = db.query(User).filter(User.user_id == nl.user_id).first()
        if user and user.email:
            try:
                success = send_newsletter_by_user_id(db, user.user_id)
                if success:
                    print(f"✅ أُرسلت نشرة للمستخدم {user.user_id} ({user.email})")
                else:
                    print(f"⚠️ فشل إرسال نشرة للمستخدم {user.user_id}")
            except Exception as e:
                print(f"❌ خطأ عند إرسال نشرة للمستخدم {user.user_id}: {e}")