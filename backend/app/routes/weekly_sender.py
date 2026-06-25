# app/services/weekly_sender.py
from sqlalchemy.orm import Session
from app.services.email_service import send_newsletter_by_user_id
from app.models.users import User
from app.models.newsletter import Newsletter

def send_all_ready_newsletters(db: Session):
    newsletters = db.query(Newsletter).all()

    for nl in newsletters:
        user = db.query(User).filter(User.user_id == nl.user_id).first()
        if user and user.email:
            try:
                success = send_newsletter_by_user_id(db, user.user_id)
                if success:
                    print(f"✅ A newsletter was sent to user {user.user_id} ({user.email})")
                else:
                    print(f"⚠️ Failed to send newsletter to user {user.user_id}")
            except Exception as e:
                print(f"❌ Error when sending newsletter to user {user.user_id}: {e}")

                