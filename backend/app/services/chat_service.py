from ..db.database import faq_data
from typing import Dict

def get_chat_response(question: str) -> Dict[str, str]:
    """الحصول على إجابة من الـ Chatbot"""
    question_lower = question.lower()
    
    for item in faq_data:
        for keyword in item["keywords"]:
            if keyword in question_lower:
                return {
                    "question": question,
                    "answer": item["answer"],
                    "matched_keyword": keyword
                }
    
    return {
        "question": question,
        "answer": "عذرًا، لا توجد إجابة متاحة لهذا السؤال حاليًا."
    }