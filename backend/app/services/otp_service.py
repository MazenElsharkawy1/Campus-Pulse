# ============================================================================
# 🔐 Campus Pulse - OTP Service (Email + SMS + WhatsApp)
# ============================================================================

import os
import re
import json
import random
import logging
import httpx
import base64
import threading
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple

from twilio.rest import Client  # ✅ Twilio SDK

logger = logging.getLogger(__name__)

# ✅ إعدادات الـ OTP
OTP_EXPIRE_MINUTES = 3
MAX_OTP_ATTEMPTS = 3

# ✅ Twilio Credentials (تُحمّل مرة واحدة)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_MESSAGING_SERVICE_SID = os.getenv("TWILIO_MESSAGING_SERVICE_SID")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

# ✅ SendGrid Credentials
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "noreply@campuspulse.edu.eg")


# ============================================================================
# 🔐 OTP Tracker (In-memory storage)
# ============================================================================

class OTPTracker:
    _codes: Dict[str, dict] = {}
    _lock = threading.Lock()
    
    @classmethod
    def generate_otp(cls) -> str:
        return "".join(random.choices("0123456789", k=4))
    
    @classmethod
    def store_otp(cls, email: str, otp: str, phone: Optional[str] = None, 
                  otp_type: str = "registration") -> bool:
        email = email.lower()
        expiry = OTP_EXPIRE_MINUTES if otp_type == "registration" else 3
        
        with cls._lock:
            cls._codes[email] = {
                "otp": otp,
                "phone": phone,
                "type": otp_type,
                "expires_at": datetime.now(timezone.utc) + timedelta(minutes=expiry),
                "attempts": 0,
                "is_blocked": False,
                "created_at": datetime.now(timezone.utc)
            }
            logger.info(f"🔐 OTP stored for {email}: {otp} (expires in {expiry} min)")
        return True
    
    @classmethod
    def verify_otp(cls, email: str, otp: str) -> Tuple[bool, str]:
        email = email.lower()
        
        with cls._lock:
            record = cls._codes.get(email)
            
            if not record:
                return False, "OTP does not exist. Please request a new one."
            
            if record.get("is_blocked"):
                return False, "Too many failed attempts. Please request a new OTP."
            
            if record["expires_at"] < datetime.now(timezone.utc):
                cls._codes.pop(email, None)
                return False, "OTP has expired. Please request a new OTP."
            
            if record["otp"] != otp:
                record["attempts"] += 1
                if record["attempts"] >= MAX_OTP_ATTEMPTS:
                    record["is_blocked"] = True
                    return False, "Too many failed attempts. Please request a new OTP."
                remaining = MAX_OTP_ATTEMPTS - record["attempts"]
                return False, f"OTP is incorrect. You have {remaining} attempts remaining."
            
            cls._codes.pop(email, None)
            return True, "OTP verified successfully"
    
    @classmethod
    def get_status(cls, email: str) -> dict:
        email = email.lower()
        record = cls._codes.get(email)
        if not record:
            return {"exists": False}
        
        now = datetime.now(timezone.utc)
        remaining = int((record["expires_at"] - now).total_seconds() / 60)
        
        return {
            "exists": True,
            "expires_in_minutes": max(0, remaining),
            "attempts": record["attempts"],
            "is_blocked": record["is_blocked"]
        }
    
    @classmethod
    def cleanup_expired(cls):
        """Remove expired OTPs (call periodically)"""
        now = datetime.now(timezone.utc)
        with cls._lock:
            expired = [
                email for email, record in cls._codes.items()
                if record["expires_at"] < now
            ]
            for email in expired:
                cls._codes.pop(email, None)
        return len(expired)


# ✅ Instance عالمية
otp_tracker = OTPTracker()


# ============================================================================
# 📧 Email Service (SendGrid)
# ============================================================================

def _print_dev_otp(identifier: str, otp: str, method: str = "email"):
    """طباعة الـ OTP في الكونسول لوضع التطوير"""
    print("\n" + "🔐" * 30)
    print(f"   🚀 DEVELOPMENT MODE - {method.upper()} NOT SENT")
    print(f"   📱 To: {identifier}")
    print(f"   🔐 OTP CODE: {otp}")
    print(f"   ⏰ Expires: {OTP_EXPIRE_MINUTES} minutes")
    print(f"   🕐 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("🔐" * 30 + "\n")


async def send_email_sendgrid(to_email: str, otp: str) -> bool:
    """إرسال OTP عبر Email باستخدام SendGrid API"""
    
    if os.getenv("DEV_MODE") == "true":
        _print_dev_otp(to_email, otp, "email")
        return True
    
    if not SENDGRID_API_KEY:
        print("❌ [SendGrid] API Key not configured")
        return False
    
    url = "https://api.sendgrid.com/v3/mail/send"
    headers = {
        "Authorization": f"Bearer {SENDGRID_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "personalizations": [{
            "to": [{"email": to_email}],
            "subject": "🔐 CampusPulse - OTP Verification"
        }],
        "from": {"email": SENDER_EMAIL, "name": "CampusPulse"},
        "content": [{
            "type": "text/html",
            "value": f"""
            <html><body style="font-family:Arial;direction:rtl;text-align:right;">
                <h2 style="color:#4361ee;">🔐 OTP Verification</h2>
                <p>Welcome to CampusPulse!</p>
                <p>Your verification code is:</p>
                <h1 style="color:#e74c3c;letter-spacing:8px;font-size:40px;
                           text-align:center;background:#f0f4ff;padding:20px;
                           border-radius:10px;">{otp}</h1>
                <p>This code is valid for {OTP_EXPIRE_MINUTES} minutes only.</p>
                <hr><p style="font-size:12px;color:#888;">
                    CampusPulse Team - MTI University</p>
            </body></html>
            """
        }]
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=data, headers=headers)
            
            if response.status_code == 202:
                print(f"✅ [SendGrid] Email sent to {to_email}")
                return True
            else:
                error_data = response.json() if response.content else {}
                print(f"❌ [SendGrid] Error {response.status_code}: {error_data}")
                return False
                
    except Exception as e:
        print(f"❌ [SendGrid] Exception: {e}")
        return False


async def send_email_otp(email: str, otp: str) -> bool:
    """Wrapper function for sending email OTP"""
    if SENDGRID_API_KEY:
        return await send_email_sendgrid(email, otp)
    
    # Fallback to dev mode
    print("⚠️ [Email] No SendGrid key, using DEV_MODE")
    _print_dev_otp(email, otp, "email")
    return True


# ============================================================================
# 📱 Twilio Service (SMS + WhatsApp)
# ============================================================================

class TwilioService:
    """خدمة إرسال SMS/WhatsApp باستخدام Twilio SDK"""
    
    def __init__(self):
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
            self.client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        else:
            self.client = None
        self.messaging_service_sid = TWILIO_MESSAGING_SERVICE_SID
    
    def _format_phone_for_twilio(self, phone: str) -> str:
        """تنسيق الرقم المصري لـ E.164 format"""
        phone_clean = re.sub(r'[\s\-\(\)]', '', phone)
        
        if phone_clean.startswith('01'):
            return '+20' + phone_clean[1:]  # 010xxx → +2010xxx
        elif phone_clean.startswith('20'):
            return '+' + phone_clean  # 2010xxx → +2010xxx
        elif phone_clean.startswith('+'):
            return phone_clean  # Already formatted
        else:
            return '+20' + phone_clean  # Fallback
    
    async def send_sms_otp(self, phone: str, otp: str) -> bool:
        """إرسال OTP عبر SMS"""
        
        if os.getenv("DEV_MODE") == "true":
            _print_dev_otp(phone, otp, "sms")
            return True
        
        if not self.client:
            print("❌ [SMS] Twilio client not initialized")
            return False
        
        phone_formatted = self._format_phone_for_twilio(phone)
        
        message_body = f"""🔐 CampusPulse Verification

Your OTP code is: {otp}

Valid for {OTP_EXPIRE_MINUTES} minutes.
Do not share this code with anyone.

- CampusPulse Team"""

        print(f"📱 [SMS] Sending to: {phone_formatted}")
        
        try:
            if self.messaging_service_sid:
                # ✅ استخدام Messaging Service (أفضل ممارسة)
                message = self.client.messages.create(
                    messaging_service_sid=self.messaging_service_sid,
                    body=message_body,
                    to=phone_formatted
                )
            else:
                # Fallback لرقم عادي
                message = self.client.messages.create(
                    from_=os.getenv("TWILIO_PHONE_NUMBER"),
                    body=message_body,
                    to=phone_formatted
                )
            
            print(f"✅ [SMS] Sent! SID: {message.sid}, Status: {message.status}")
            return True
            
        except Exception as e:
            print(f"❌ [SMS] Error: {type(e).__name__}: {e}")
            return False
    
    async def send_whatsapp_otp(self, phone: str, otp: str) -> bool:
        """إرسال OTP عبر WhatsApp"""
        
        if os.getenv("DEV_MODE") == "true":
            _print_dev_otp(phone, otp, "whatsapp")
            return True
        
        if not self.client:
            print("❌ [WhatsApp] Twilio client not initialized")
            return False
        
        phone_formatted = self._format_phone_for_twilio(phone)
        whatsapp_to = f"whatsapp:{phone_formatted}"
        
        message_body = f"""🔐 *CampusPulse Verification Code*

Your OTP is: *{otp}*

⏰ Valid for {OTP_EXPIRE_MINUTES} minutes.
🔒 Do not share this code with anyone."""

        print(f"💬 [WhatsApp] Sending to: {whatsapp_to}")
        
        try:
            message = self.client.messages.create(
                from_=TWILIO_WHATSAPP_NUMBER,
                body=message_body,
                to=whatsapp_to
            )
            
            print(f"✅ [WhatsApp] Sent! SID: {message.sid}")
            return True
            
        except Exception as e:
            print(f"❌ [WhatsApp] Error: {type(e).__name__}: {e}")
            return False


# ✅ Instance عالمية
twilio_service = TwilioService()


# ============================================================================
# 🎯 Unified Send Function (اختياري - للتسهيل)
# ============================================================================

async def send_otp(identifier: str, otp: str, method: str = "email", 
                   phone: Optional[str] = None) -> bool:
    """
    دالة موحدة لإرسال OTP عبر أي وسيلة
    
    Args:
        identifier: email أو phone
        otp: كود التحقق
        method: "email" أو "sms" أو "whatsapp"
        phone: رقم الهاتف (لو مختلف عن identifier)
    """
    if method == "email":
        return await send_email_otp(identifier, otp)
    elif method == "sms":
        return await twilio_service.send_sms_otp(phone or identifier, otp)
    elif method == "whatsapp":
        return await twilio_service.send_whatsapp_otp(phone or identifier, otp)
    else:
        print(f"⚠️ [OTP] Unknown method: {method}")
        return False