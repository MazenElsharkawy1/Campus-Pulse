
# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker, declarative_base
# import os
# from dotenv import load_dotenv


# load_dotenv()  # يحمل .env

# DATABASE_URL = os.getenv("DATABASE_URL")  # اللينك من .env

# engine = create_engine(DATABASE_URL , pool_pre_ping=True)

# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base = declarative_base()


from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# تحميل بيانات الـ .env
load_dotenv()

DATABASE_URL="postgresql://postgres.imlydashdkziznmjhfgy:karen20fatmah@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # مهم جدًا مع pooler عشان يتأكد الاتصال حي
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
)


# إنشاء الجلسة (Session)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# القاعدة اللي الموديلز بتورث منها
Base = declarative_base()

# الفانكشن اللي الـ Routes بتستخدمها عشان تفتح وتقفل الداتا بيز
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        

# # ضيفي دول في آخر ملف database.py مؤقتاً
chat_history = []
