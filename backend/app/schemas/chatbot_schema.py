# schema/chatbot_schema.py
from pydantic import BaseModel, Field
from typing import Optional, List

class ArticleResult(BaseModel):
    article_id: int
    title: str
    content: str
    summary: str
    category: str
    source: Optional[str] = None
    url: Optional[str] = None
    similarity: float
    published_at: Optional[str] = None

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="سؤال المستخدم")
    mode: str = Field(default="news", description="نوع البحث: 'help' للمساعدة أو 'news' للأخبار")
    user_role: Optional[str] = Field(default="student", description="student | media_advisor | manager")
    user_id: Optional[int] = Field(default=None, description="معرف المستخدم")

class ChatResponse(BaseModel):
    response: str = Field(..., description="رد البوت النصي")
    intent: str = Field(..., description="نية السؤال")
    source: str = Field(default="system", description="مصدر الإجابة")
    articles: Optional[List[ArticleResult]] = Field(default=[], description="قائمة الأخبار")