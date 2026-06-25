# app/services/login_security.py
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple
import threading

# ✅ إعدادات الحظر
MAX_ATTEMPTS = 3
BLOCK_MINUTES = 30


class LoginAttemptTracker:
    """تتبع محاولات تسجيل الدخول في الذاكرة"""
    _attempts: Dict[str, dict] = {}
    _lock = threading.Lock()
    
    @classmethod
    def get_attempt(cls, email: str) -> Optional[dict]:
        """جلب سجل محاولات الإيميل"""
        with cls._lock:
            return cls._attempts.get(email.lower())
    
    @classmethod
    def is_blocked(cls, email: str) -> Tuple[bool, int]:
        email = email.lower()
        attempt = cls.get_attempt(email)
        if not attempt or not attempt.get("is_blocked"):
            return False, 0
        blocked_until = attempt.get("blocked_until")
        if blocked_until and blocked_until > datetime.now(timezone.utc):
            remaining = int((blocked_until - datetime.now(timezone.utc)).total_seconds() / 60)
            return True, remaining
        else:
            cls.reset(email)
            return False, 0
    
    @classmethod
    def record_failed(cls, email: str) -> Tuple[bool, int, int]:
        email = email.lower()
        with cls._lock:
            if email not in cls._attempts:
                cls._attempts[email] = {
            "failed_count": 0,"is_blocked": False,"blocked_until": None,"last_attempt": None
                }
            attempt = cls._attempts[email]
            attempt["failed_count"] += 1
            attempt["last_attempt"] = datetime.now(timezone.utc)
            
            if attempt["failed_count"] >= MAX_ATTEMPTS:
                attempt["is_blocked"] = True
                attempt["blocked_until"] = datetime.now(timezone.utc) + timedelta(minutes=BLOCK_MINUTES)
                remaining = BLOCK_MINUTES
                return True, remaining, attempt["failed_count"]
            return False, 0, attempt["failed_count"]
    
    @classmethod
    def reset(cls, email: str):
        """ريست للعداد (عند النجاح)"""
        email = email.lower()
        with cls._lock:
            if email in cls._attempts:
                cls._attempts[email] = {
                    "failed_count": 0,
                    "is_blocked": False,
                    "blocked_until": None,
                    "last_attempt": None
                }
    
    @classmethod
    def block(cls, email: str, minutes: Optional[int] = None):
        """
        حظر حساب يدوياً (للأدمن)
        
        Args:
            email: إيميل المستخدم
            minutes: مدة الحظر بالدقائق (None = حظر دائم)
        """
        email = email.lower()
        with cls._lock:
            if email not in cls._attempts:
                cls._attempts[email] = {
                    "failed_count": 0,
                    "is_blocked": False,
                    "blocked_until": None,
                    "last_attempt": None
                }
            
            cls._attempts[email]["is_blocked"] = True
            
            # ✅ لو في مدة، نحسب وقت الانتهاء
            if minutes:
                cls._attempts[email]["blocked_until"] = datetime.now(timezone.utc) + timedelta(minutes=minutes)
            else:
                # ✅ حظر دائم (بدون وقت انتهاء)
                cls._attempts[email]["blocked_until"] = None
    
    @classmethod
    def unblock(cls, email: str) -> bool:
        """فك الحظر عن حساب يدوياً"""
        email = email.lower()
        with cls._lock:
            if email in cls._attempts:
                cls._attempts[email]["is_blocked"] = False
                cls._attempts[email]["blocked_until"] = None
                cls._attempts[email]["failed_count"] = 0
                return True
            return False
    
    @classmethod
    def get_all_blocked(cls) -> list:
        """جلب جميع الحسابات المحظورة حالياً"""
        with cls._lock:
            blocked = []
            now = datetime.now(timezone.utc)
            
            for email, attempt in cls._attempts.items():
                if not attempt.get("is_blocked"):
                    continue  # ✅ نتخطى اللي مش محظورين
                
                blocked_until = attempt.get("blocked_until")
                
                # ✅ حالة 1: حظر مؤقت (فيه وقت انتهاء)
                if blocked_until and blocked_until > now:
                    remaining = int((blocked_until - now).total_seconds() / 60)
                    blocked.append({
                        "email": email,
                        "failed_count": attempt.get("failed_count", 0),
                        "blocked_until": str(blocked_until),
                        "remaining_minutes": remaining,
                        "block_type": "temporary"
                    })
                
                # ✅ حالة 2: حظر دائم (مفيش وقت انتهاء)
                elif blocked_until is None:
                    blocked.append({
                        "email": email,
                        "failed_count": attempt.get("failed_count", 0),
                        "blocked_until": "دائم",
                        "remaining_minutes": None,
                        "block_type": "permanent"
                    })
                
                # ✅ حالة 3: الحظر انتهى (نحذفه من القائمة)
                else:
                    # الحظر انتهى، نريست تلقائياً
                    cls._attempts[email]["is_blocked"] = False
                    cls._attempts[email]["blocked_until"] = None
            
            return blocked


# ✅ Instance عالمية
login_tracker = LoginAttemptTracker()