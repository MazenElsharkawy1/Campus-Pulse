# app/routes/chatbot_route.py
from fastapi import APIRouter, Depends, HTTPException, Request,Form
from realtime import Optional
from app.schemas.chatbot_schema import ChatRequest, ChatResponse
from app.services.chatbot_service import ChatService
router = APIRouter(prefix="/api/chat", tags=["Chatbot"])

def get_chat_service(request: Request):
    service = request.app.state.chat_service= ChatService()
    if service is None:
        raise HTTPException(status_code=503, detail="Chatbot service not initialized yet")
    return service

@router.post("", response_model=ChatResponse)
async def chat_endpoint(
    query: str = Form(..., min_length=1, max_length=500, description="سؤال المستخدم"),
    mode: str = Form(default="news", description="نوع البحث: 'help' للمساعدة أو 'news' للأخبار"),
    user_role: Optional[str] = Form(default="student", description="student | media_advisor | manager"),
    user_id: Optional[int] = Form(default=None, description="معرف المستخدم"),
    service=Depends(get_chat_service)):
    if not query.strip():
        raise HTTPException(status_code=400, detail="السؤال مش لازم يكون فاضي")
    
    user_role = user_role.lower() if user_role else "student"
    user_id = user_id if user_id is not None else 99999
    
    # ✅ نمرر الـ mode هنا عشان البوت يعرف يدور فين
    result = await service.process_query(
        query=query, 
        mode=mode, 
        user_role=user_role, 
        user_id=user_id
    )
    
    return ChatResponse(
        response=result["response"],
        intent=result["intent"],
        source=result["source"],
        articles=result.get("articles")
    )