from app.services.ai_modules import AIProcessor
ai_processor = AIProcessor()

def process_text(text: str):
    return ai_processor.process_article(content=text)
