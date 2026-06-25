# app/services/whatsapp_service.py
import os
import httpx
import base64
from typing import Optional
from datetime import datetime, timezone


class WhatsAppService:
    """خدمة إرسال رسائل WhatsApp باستخدام Twilio WhatsApp API"""
    
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.whatsapp_number = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
    
    async def send_whatsapp_message(self, to_phone: str, message: str) -> bool:
        """إرسال رسالة WhatsApp لرقم معين"""
        
        # ✅ Dev Mode: طباعة الرسالة في الكونسول
        if os.getenv("DEV_MODE") == "true":
            self._print_dev_message(to_phone, message)
            return True
        
        # ✅ التحقق من الـ Credentials
        if not self.account_sid or not self.auth_token:
            print("❌ [WhatsApp] Twilio credentials not configured")
            return False
        
        # ✅ تنسيق رقم الهاتف
        phone_clean = self._format_phone_number(to_phone)
        whatsapp_to = f"whatsapp:{phone_clean}"
        
        # ✅ Twilio WhatsApp API endpoint
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        
        # ✅ Basic Auth
        credentials = base64.b64encode(f"{self.account_sid}:{self.auth_token}".encode()).decode()
        
        headers = {
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {
            "From": self.whatsapp_number,
            "To": whatsapp_to,
            "Body": message
        }
        
        print(f"💬 [WhatsApp] Sending to: {whatsapp_to}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, data=data, headers=headers)
                
                if response.status_code == 201:
                    result = response.json()
                    print(f"✅ [WhatsApp] Sent! SID: {result.get('sid')}")
                    return True
                else:
                    error_data = response.json() if response.content else {}
                    print(f"❌ [WhatsApp] Error: {error_data.get('message', 'Unknown')}")
                    return False
                    
        except Exception as e:
            print(f"❌ [WhatsApp] Exception: {e}")
            return False
    
    def _format_phone_number(self, phone: str) -> str:
        """تنسيق رقم الهاتف لـ E.164"""
        phone_clean = phone.replace('whatsapp:', '').replace('sms:', '').strip()
        if phone_clean.startswith('01'):
            phone_clean = '+20' + phone_clean[1:]
        elif phone_clean.startswith('20'):
            phone_clean = '+' + phone_clean
        elif not phone_clean.startswith('+'):
            phone_clean = '+20' + phone_clean
        return phone_clean
    
    def _print_dev_message(self, to_phone: str, message: str):
        """طباعة الرسالة في الكونسول لوضع التطوير"""
        print("\n" + "💬" * 30)
        print(f"   🚀 DEV MODE - WhatsApp NOT sent")
        print(f"   📱 To: {to_phone}")
        print(f"   💬 Message: {message}")
        print("💬" * 30 + "\n")
    
    # ✅✅✅ الدالة دي هي اللي ناقصة - تأكد إنها موجودة ✅✅✅
    async def send_otp_whatsapp(self, phone: str, otp: str) -> bool:
        """إرسال OTP عبر WhatsApp (مخصص للـ OTP)"""
        message = f"""🔐 *CampusPulse Verification Code*

Your OTP is: *{otp}*

⏰ Valid for 3 minutes.
🔒 Do not share this code with anyone.

If you didn't request this, please ignore this message."""
        
        return await self.send_whatsapp_message(phone, message)
    
    async def send_newsletter_whatsapp(self, phone: str, user_name: str, 
                                       newsletter_link: str) -> bool:
        """إرسال Notification عن الـ Newsletter عبر WhatsApp"""
        message = f"""📰 *CampusPulse Weekly Newsletter*

Hello {user_name}! 👋

This week's top stories are now available.

🔗 Read now: {newsletter_link}

- CampusPulse Team 🎓"""
        
        return await self.send_whatsapp_message(phone, message)


# ✅✅✅ Instance عالمية - تأكد إن السطر ده موجود في آخر الملف ✅✅✅
whatsapp_service = WhatsAppService()