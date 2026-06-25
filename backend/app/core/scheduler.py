from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.newsletter_service import NewsletterService

def start_newsletter_scheduler():
    scheduler = AsyncIOScheduler()
    
    async def weekly_job():
        print("🔔 [Batch Run] Starting Weekly Newsletter (Saturday -> Friday)...")
        await NewsletterService.run_weekly_batch()
        print("✅ [Batch Run] Weekly Newsletter Job Done.")

    scheduler.add_job(
    weekly_job, 
    'cron', 
    day_of_week='fri', 
    hour=14,   
    minute=30
    )
    
    scheduler.start()
    print("🚀 Scheduler is set to run every Friday at 2:30 PM")