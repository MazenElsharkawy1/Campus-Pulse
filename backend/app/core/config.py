from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # حطيت لك بياناتك هنا عشان تبقى جاهزة
    SUPABASE_URL: str = "https://imlydashdkziznmjhfgy.supabase.co"
    SUPABASE_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbHlkYXNoZGt6aXpubWpoZmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTI2MDEsImV4cCI6MjA4NTg2ODYwMX0.MR0PyzmIwXlz06HOhyZt9dYypL9BV4YboVqbpuEAF-8"
from pydantic import BaseSettings

class Settings(BaseSettings):
    # إعدادات قاعدة البيانات
    DATABASE_URL: str = "sqlite:///./campuspulse.db"
    
    # إعدادات الأمان
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # إعدادات التطبيق
    APP_NAME: str = "CampusPulse"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"

settings = Settings()