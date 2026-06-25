# app/services/sms_service.py
import asyncio
import os
import httpx
import base64
from typing import Dict
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.users import User
from app.models.newsletter import Newsletter


class SMSService:
    """خدمة إرسال إشعارات SMS الأسبوعية للنشرات - باستخدام Twilio"""
    
    @staticmethod
    async def send_newsletter_sms(
        phone: str,
        newsletter_edition: int,
        newsletter_date: str
    ) -> bool:
        """إرسال إشعار SMS لرقم واحد باستخدام Twilio"""
        
        # ✅ 1. التحقق من الـ Credentials
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        from_number = os.getenv("TWILIO_PHONE_NUMBER")
        
        print(f"📱 [Twilio SMS] Attempting to send to: {phone}")
        print(f"📱 [Twilio SMS] From: {from_number}")
        print(f"📱 [Twilio SMS] Account SID present: {'✅' if account_sid else '❌'}")
        
        if not account_sid or not auth_token:
            print("❌ [Twilio SMS] Credentials not configured in .env")
            return False
        
        if not from_number:
            print("❌ [Twilio SMS] TWILIO_PHONE_NUMBER not configured in .env")
            return False
        
        # ✅ 2. تنسيق رقم المستلم (E.164 Format - مطلوب من Twilio)
        phone_clean = phone.replace('whatsapp:', '').replace('sms:', '').strip()
        
        # لمصر: تحويل الأرقام المحلية لـ E.164
        if phone_clean.startswith('01'):
            phone_clean = '+20' + phone_clean[1:]  # 010xxxxxxx → +2010xxxxxxx
        elif phone_clean.startswith('20'):
            phone_clean = '+' + phone_clean  # 2010xxxxxxx → +2010xxxxxxx
        elif not phone_clean.startswith('+'):
            phone_clean = '+20' + phone_clean  # 10xxxxxxx → +2010xxxxxxx
        
        # ✅ التأكد النهائي من التنسيق
        if not phone_clean.startswith('+') or len(phone_clean) < 10:
            print(f"❌ [Twilio SMS] Invalid phone format: {phone_clean}")
            return False
        
        # ✅ 3. رسالة بسيطة وواضحة (تجنب الـ Spam)
        message = f"""CampusPulse Newsletter #{newsletter_edition} is now available.

📅 Date: {newsletter_date}
🔗 Read now: https://campuspulse.edu.eg/newsletter

- CampusPulse Team"""
        
        # ✅ 4. Twilio Messages API
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        
        # ✅ Twilio uses Basic Auth: base64(SID:Token)
        credentials = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()
        
        headers = {
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {
            "From": from_number,
            "To": phone_clean,
            "Body": message
        }
        
        print(f"📱 [Twilio SMS] Sending to: {phone_clean}")
        print(f"📱 [Twilio SMS] URL: {url}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(str(url), data=data, headers=headers)
                
                print(f"📱 [Twilio SMS] Response status: {response.status_code}")
                
                # ✅ Twilio returns 201 on success
                if response.status_code == 201:
                    result = response.json()
                    message_sid = result.get("sid", "N/A")
                    print(f"✅ [Twilio SMS] Sent successfully to {phone_clean}")
                    print(f"✅ [Twilio SMS] Message SID: {message_sid}")
                    return True
                else:
                    # ✅ تحليل الخطأ
                    error_data = response.json() if response.content else {}
                    print(f"❌ [Twilio SMS] API error: {response.status_code}")
                    print(f"❌ [Twilio SMS] Error: {error_data.get('message', 'Unknown error')}")
                    print(f"❌ [Twilio SMS] Code: {error_data.get('code', 'N/A')}")
                    
                    # ✅ نصائح للأخطاء الشائعة
                    error_msg = error_data.get('message', '').lower()
                    error_code = error_data.get('code')
                    
                    if error_code == 21211 or 'invalid' in error_msg:
                        print(f"💡 [Twilio SMS] FIX: Check phone number format (must be E.164: +20...)")
                    elif error_code == 21606 or 'not verified' in error_msg:
                        print(f"💡 [Twilio SMS] FIX: Verify recipient number in Twilio Console (trial mode)")
                    elif error_code == 21408 or 'permission' in error_msg:
                        print(f"💡 [Twilio SMS] FIX: Upgrade from trial to send to unverified numbers")
                    elif error_code == 21402 or 'from' in error_msg:
                        print(f"💡 [Twilio SMS] FIX: Verify TWILIO_PHONE_NUMBER is a valid Twilio number")
                    elif 'country' in error_msg:
                        print(f"💡 [Twilio SMS] FIX: Check if Egypt is enabled in your Twilio Console")
                    
                    return False
                    
        except httpx.ConnectError as e:
            print(f"❌ [Twilio SMS] Connection error: {e}")
            print(f"💡 [Twilio SMS] Check your internet connection or firewall")
            return False
        except httpx.TimeoutException as e:
            print(f"❌ [Twilio SMS] Timeout error: {e}")
            return False
        except Exception as e:
            print(f"❌ [Twilio SMS] Unexpected error: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    @staticmethod
    async def send_weekly_sms_to_all_users(
        db: Session,
        newsletter: Newsletter
    ) -> Dict[str, int]:
        """إرسال إشعارات SMS لجميع المستخدمين الذين لديهم نشرة جديدة"""
        
        # ✅ جلب جميع المستخدمين المفعلين الذين لديهم أرقام
        users = db.query(User).filter(
            User.sms_notifications_enabled == True,
            User.phone != None,
            User.phone != ''
        ).all()
        
        stats = {
            "total": len(users),
            "sent": 0,
            "failed": 0
        }
        
        newsletter_date = newsletter.published_date.strftime("%Y-%m-%d") if newsletter.published_date else ""
        
        print(f"📊 [SMS] Starting weekly SMS dispatch to {len(users)} users...")
        
        for i, user in enumerate(users, 1):
            print(f"📱 [{i}/{len(users)}] Sending to {user.phone}...")
            
            success = await SMSService.send_newsletter_sms(
                phone=user.phone,
                newsletter_edition=newsletter.edition,
                newsletter_date=newsletter_date
            )
            
            if success:
                stats["sent"] += 1
            else:
                stats["failed"] += 1
            
            # ✅ تأخير بسيط لتجنب Rate Limiting
            if i % 10 == 0:
                print(f"⏳ [SMS] Pausing to avoid rate limiting...")
                await asyncio.sleep(1)
        
        # ✅ تحديث معلومات النشرة
        newsletter.sms_sent_at = datetime.now(timezone.utc)
        newsletter.sms_sent_count = stats["sent"]
        db.commit()
        
        print(f"📊 [SMS] Weekly Stats: {stats}")
        return stats