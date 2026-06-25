import torch
import re
from transformers import AutoTokenizer,AutoModelForSeq2SeqLM,pipeline
from sentence_transformers import SentenceTransformer

class AIProcessor:
    def __init__(self, model_path: str = r"C:\mt5_arabic_summarizer"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.summ_tokenizer = AutoTokenizer.from_pretrained(model_path, legacy=False, use_fast=False)
        self.summ_model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
        self.summ_model.to(self.device)
        self.summ_model.eval()
        self.classifier = pipeline(
            "zero-shot-classification",
            model=r"C:\best_mdeberta_arabic_model",
            device=0 if self.device == "cuda" else -1
        )
        self.labels = ["Commerce", "Digital Media", "Medical", "Technology", "Sports", "Announcements","Engineering","Internships"]
        self.sbert = SentenceTransformer(r"C:\SBERT3")

    def summarize(self, text: str) -> str:
        input_text = "summarize: " + text
        inputs = self.summ_tokenizer(
            input_text,
            return_tensors="pt",
            max_length=512,
            truncation=True,
            padding="max_length"
        ).to(self.device)

        with torch.no_grad():
            output_ids = self.summ_model.generate(
                **inputs,
                max_length=120,
                min_length=60,
                num_beams=4,
                no_repeat_ngram_size=3,
                repetition_penalty=2.0,
                early_stopping=True
            )
        summary = self.summ_tokenizer.decode(output_ids[0], skip_special_tokens=True)
        summary = re.sub(r"<extra_id_\d+>", "", summary).strip()
        return summary
    def classify(self, text: str) -> dict:
        result = self.classifier(text, candidate_labels=self.labels, multi_label=False)
        return {
            "category": result["labels"][0],
            "confidence": round(result["scores"][0], 3)
        }
    def get_text_vector(self, text: str) -> list:
        embedding = self.sbert.encode([text], normalize_embeddings=True)
        return embedding[0].tolist()  
    def process_article(self, content: str) -> dict:
        summary = self.summarize(content)
        cls = self.classify(summary)
        vector = self.get_text_vector(summary)
        return {
            "summary": summary,
            "category": cls["category"],
            "confidence": cls["confidence"],
            "text_vector": vector
        }   
ai_processor = AIProcessor()

def process_text(text: str):
    return ai_processor.process_article(content=text)  

