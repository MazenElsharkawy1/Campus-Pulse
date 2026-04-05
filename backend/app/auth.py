# auth.py
from fastapi import Request, HTTPException
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def get_current_user(request: Request):
    """استخرج بيانات المستخدم من جلسة Supabase"""
    session_data = request.session.get("user")
    if not session_data:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return session_data