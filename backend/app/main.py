from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import engine
from app.routes import (auth,posts,feedback,reports,home,manual_email,profile,article_route,help,scraping,
                        newsletter_route,category_route,interaction_route,report_permission_route,auth_reset,
                        user_image_route,monitoring_route,admin_routes,gallery_route,user_register,sms_route,
                        media_adviser,stakeholder_posts,chatbot_route,monitor_route)
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv 
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.routes.weekly_sender import send_all_ready_newsletters
from app.db.database import Base, SessionLocal
from sqlalchemy.orm import Session
from app.core.scheduler import start_newsletter_scheduler
from contextlib import asynccontextmanager
from app.services.scheduler import WeeklySMSScheduler


app = FastAPI(title="University Newsletter System", default_response_class=JSONResponse)
load_dotenv() 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
app.mount(
    "/media",
    StaticFiles(directory=os.path.join(os.getcwd(), "C:\\campus_pulse\\backend\\downloaded_media")),
    name="media"
)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "profiles"), exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

def job_wrapper():
    db: Session = SessionLocal()
    try:
        send_all_ready_newsletters(db)
    finally:
        db.close()

scheduler = BackgroundScheduler()

scheduler.add_job(
    func=job_wrapper,
    trigger=CronTrigger(day_of_week="fri", hour=15, minute=0),
    id="weekly_newsletter",
    replace_existing=True
)
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"⚠️ Could not create tables: {str(e)}")
    yield
    print("🛑 Application shutdown")

os.makedirs("app/static/profiles", exist_ok=True)
os.makedirs("app/data", exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.on_event("startup")
def start_scheduler():
    scheduler.start()

@app.on_event("shutdown")
def shutdown_scheduler():
    scheduler.shutdown()

@app.on_event("startup")
async def startup_event():
    start_newsletter_scheduler()
MEDIA_DIR = r"C:\campus_pulse\scraper\webscraping\downloaded_videos"
os.makedirs(MEDIA_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")    

# ✅ Lifecycle manager لبدء وإيقاف المجدول
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ✅ بدء المجدول عند تشغيل السيرفر
    WeeklySMSScheduler.start_scheduler()
    yield
    # ✅ إيقاف المجدول عند إيقاف السيرفر
    WeeklySMSScheduler.stop_scheduler()

app.include_router(sms_route.router)
app.include_router(auth.router)
app.include_router(user_register.router)
app.include_router(posts.router)
app.include_router(feedback.router)
app.include_router(chatbot_route.router)
app.include_router(reports.router)
app.include_router(article_route.router)
app.include_router(newsletter_route.router)
app.include_router(home.router)
app.include_router(manual_email.router)
app.include_router(profile.router)
app.include_router(category_route.router)
app.include_router(interaction_route.router)
app.include_router(report_permission_route.router)
app.include_router(user_image_route.router, prefix="/api/v1", tags=["User Images"])
app.include_router(monitoring_route.router)
app.include_router(admin_routes.router)
app.include_router(gallery_route.router)
app.include_router(auth_reset.router)
app.include_router(help.router)
app.include_router(scraping.router)
app.include_router(media_adviser.router)
app.include_router(stakeholder_posts.router)
app.include_router(monitor_route.router)
@app.get("/")
def read_root():
    return {"message": "Welcome to University Newsletter API - Articles System"}
