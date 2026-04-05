from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from app.db.database import get_db  # استيراد قاعدة البيانات الخاصة بك

# تحميل .env أول حاجة
load_dotenv()

router = APIRouter()

# نموذج الطلب من الـ Frontend
class ChatRequest(BaseModel):
    message: str
    conversation_history: List[dict] = []  # سياق المحادثة السابقة
    email: Optional[str] = None  # لجلب بيانات المستخدم

# نموذج الرد للـ Frontend
class ChatResponse(BaseModel):
    response: str
    conversation_id: str

# تخزين مؤقت (استخدم Redis أو DB في الإنتاج)
chat_sessions = {}

@router.post("/chat", response_model=ChatResponse)
async def chat(chat_data: ChatRequest, db=Depends(get_db)):
    # 1. جلب بيانات المستخدم من الداتابيز لو موجود email
    user_context = ""
    if chat_data.email:
        # استدعاء دالتك اللي بتجيب المستخدم (عدّل حسب دالتك)
        user =  (chat_data.email)  # ← افترض إن عندك دالة get_user
        if user:
            role = user.get("role", "student")
            interests = user.get("interests", [])
            interests_str = ", ".join([i.get('name', '') for i in interests]) if interests else "غير محدد"
            user_context = f"المستخدم بدور: {role}. اهتماماته: {interests_str}."

    # 2. System Prompt (تخصيص حسب المستخدم)
    system_instruction = f"""
    أنت مساعد ذكي وودود لطلاب وموظفي الجامعات.
    {user_context}
    رد بالعربية الفصحى أو العامية المصرية حسب سياق السؤال.
    كن مفيدًا، دقيقًا، وودودًا.
    """

    # 3. بناء الرسائل
    messages = [
        {"role": "system", "content": system_instruction},
    ]
    messages.extend(chat_data.conversation_history)
    messages.append({"role": "user", "content": chat_data.message})

    # try:
        # 4. الاتصال بـ OpenAI
        # completion = client.chat.completions.create(
        #     model="gpt-4o-mini",  # أو "gpt-3.5-turbo" أو "gpt-4o" حسب الميزانية
        #     messages=messages,
        #     temperature=0.7,
        #     max_tokens=1000,
        # )

        # ai_response = completion.choices[0].message.content.strip()

        # # 5. تحديث سجل المحادثة (مؤقتًا في الذاكرة)
        # new_history = messages + [{"role": "assistant", "content": ai_response}]
        # # هنا ممكن تحفظ في DB لو عندك session_id حقيقي

        # return ChatResponse(
        #     response=ai_response,
        #     conversation_id="session_123"  # غيّره لـ UUID حقيقي لو عايز
        # )

    # except Exception as e:
    #     raise HTTPException(
    #         status_code=500,
    #         detail=f"خطأ في خدمة الـ AI: {str(e)}"
    #     )