from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    question: str
    answer: str
    matched_keyword: Optional[str] = None