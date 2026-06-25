# app/services/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.newsletter import Newsletter
from app.services.sms_service import SMSService
import logging
# import pytz

logger = logging.getLogger(__name__)

class WeeklySMSScheduler:
    """مجدول إرسال SMS الأسبوعي (كل جمعة الساعة 2 ظهراً)"""
    
    scheduler = AsyncIOScheduler()
    
    @staticmethod
    async def send_weekly_sms_task():
        """المهمة التي تُنفذ كل جمعة الساعة 2 ظهراً"""
        
        logger.info("🕐 [Scheduler] Running weekly SMS task...")
        
        db = None
        try:
            # ✅ الحصول على Session من الداتابيز
            db = next(get_db())
            
            # ✅ جلب آخر نشرة تم نشرها
            latest_newsletter = db.query(Newsletter).order_by(
                Newsletter.published_date.desc()
            ).first()
            
            if not latest_newsletter:
                logger.warning("⚠️ [Scheduler] No newsletter found")
                return
            
            # ✅ التحقق من عدم الإرسال مسبقاً
            if latest_newsletter.sms_sent_at:
                logger.info("ℹ️ [Scheduler] SMS already sent for this newsletter")
                return
            
            # ✅ إرسال SMS لجميع المستخدمين في الداتابيز
            stats = await SMSService.send_weekly_sms_to_all_users(
                db=db,
                newsletter=latest_newsletter
            )
            
            logger.info(f"✅ [Scheduler] Weekly SMS completed: {stats}")
            
        except Exception as e:
            logger.error(f"❌ [Scheduler] Error: {str(e)}")
            if db:
                db.rollback()
        finally:
            if db:
                db.close()
    
    @staticmethod
    def start_scheduler():
        """بدء المجدول"""
        
        # ✅ كل جمعة الساعة 2 ظهراً (14:00) بتوقيت مصر
        # egypt_tz = pytz.timezone('Africa/Cairo')
        
        WeeklySMSScheduler.scheduler.add_job(
            func=WeeklySMSScheduler.send_weekly_sms_task,
            trigger=CronTrigger(day_of_week='fri', hour=2, minute=43),
            id='weekly_sms_newsletter',
            name='Weekly Newsletter SMS',
            replace_existing=True
        )
        
        WeeklySMSScheduler.scheduler.start()
        logger.info("🚀 [Scheduler] Weekly SMS scheduler started (Every Friday at 2 PM Cairo Time)")
        logger.info(f"📱 Will send to all users with phone numbers in Users table")
    
    @staticmethod
    def stop_scheduler():
        """إيقاف المجدول"""
        WeeklySMSScheduler.scheduler.shutdown()
        logger.info("🛑 [Scheduler] Weekly SMS scheduler stopped")