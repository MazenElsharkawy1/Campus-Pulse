import warnings

import supabase
from tokenizers import Tokenizer
from torchgen import model
warnings.filterwarnings("ignore")

import torch
import torch.nn.functional as F
import numpy as np
import re
import json
import os
from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    pipeline
)
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from fastapi import FastAPI, HTTPException

# تحديد الـ Seed لضمان ثبات النتائج
torch.manual_seed(42)

class CampusPulsePipeline:
    def __init__(self, user_interests=None):
        # الاهتمامات الافتراضية للمستخدم (يمكن تغييرها لاحقاً)
        self.user_interests = user_interests or ["ذكاء اصطناعي", "امتحانات", "فعاليات"]

        # ── 1. Summarization (mT5) ──
        # تأكدي أن هذا المسار يحتوي على ملفات الموديل (config.json, pytorch_model.bin, etc.)
       # ── 1. Summarization (mT5) ──
        model_path = r"C:\mt5_arabic_summarizer1"

        self.summ_tokenizer = None
        self.summ_model = None

        try:
            # محاولة تحميل الموديل المحلي
            self.summ_tokenizer = AutoTokenizer.from_pretrained(model_path)
            self.summ_model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
            print("✅ تم تحميل الموديل المحلي بنجاح.")
        except Exception as fallback_error:
            raise RuntimeError(f"فشل تحميل الموديل محليًا وعبر الإنترنت: {fallback_error}")

# الآن نقل الموديل للجهاز
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.summ_model.to(self.device)

        self.classifier = pipeline(
            "zero-shot-classification",
            model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
            device=0 if self.device == "cuda" else -1
        )
        self.labels = ["culture", "finance", "medical", "tech", "sports"]
    
        # ── 3. Similarity & Personalization (SBERT) ──
        self.sbert = SentenceTransformer(
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )

    def summarize(self, text: str) -> str:
        input_text = "summarize: " + text
        inputs = self.summ_tokenizer(
            input_text,
            return_tensors="pt",
            truncation=True,
            max_length=512
        ).to(self.device)

        with torch.no_grad():
            output_ids = self.summ_model.generate(
                **inputs,
                max_length=150,
                min_length=40,
                num_beams=4,
                no_repeat_ngram_size=3,
                repetition_penalty=2.0,
                early_stopping=True
            )

        summary = self.summ_tokenizer.decode(output_ids[0], skip_special_tokens=True)
        # تنظيف الـ Tokens الخاصة بموديلات T5
        summary = re.sub(r"<extra_id_\d+>", "", summary).strip()
        return summary

    def classify(self, text: str):
        result = self.classifier(text, candidate_labels=self.labels, multi_label=False)
        top_label = result["labels"][0]
        top_conf = result["scores"][0]
        
        scores = {lbl: round(sc, 3) for lbl, sc in zip(result["labels"], result["scores"])}
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        return {
            "category": top_label,
            "confidence": round(top_conf, 3),
            "top_3": sorted_scores[:3]
        }

    def personalize(self, content: str, interests=None) -> float:
        interests = interests or self.user_interests
        interests_text = " ".join(interests)
        embeddings = self.sbert.encode([interests_text, content], normalize_embeddings=True)
        score = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        return round(float(score * 100), 2)

    def process(self, text: str, interests=None):
        # تشغيل المراحل بالترتيب
        summary = self.summarize(text)
        cls = self.classify(summary)
        relevance = self.personalize(summary, interests)

        return {
            "summary": summary,
            "category": cls["category"],
            "confidence": cls["confidence"],
            "top_predictions": cls["top_3"],
            "relevance_score": relevance,
            "decision": "Relevant" if relevance > 25 else "Not Relevant"
        }

# 🔥 إنشاء نسخة من الـ Pipeline
ai_pipeline = CampusPulsePipeline()

# ── FastAPI Application ──
app = FastAPI()

@app.get("/process-campus-data")
async def process_json_file():
    # اسم الملف الذي يحتوي على الـ rows
    json_filename = "final_clean_posts.json"
    
    if not os.path.exists(json_filename):
        raise HTTPException(status_code=404, detail=f"File {json_filename} not found in directory.")

    try:
        with open(json_filename, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        final_output = []

        # اللوب لسحب الـ content من كل row
        for row in data:
            content_to_process = row.get("content", "")
            post_id = row.get("id", "unknown")
            
            if content_to_process:
                # إرسال المحتوى للـ AI Pipeline
                ai_results = ai_pipeline.process(content_to_process)
                
                # تجميع البيانات الأصلية مع نتائج الـ AI
                final_output.append({
                    "post_id": post_id,
                    "title": row.get("title", ""),
                    "ai_analysis": ai_results
                })

        return {
            "status": "success",
            "count": len(final_output),
            "results": final_output
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# تشغيل السيرفر
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)





# إعدادات الموديل

@app.get("/summarize-content")
async def get_content_and_summarize():
    try:
        # 1. فتح وقراءة ملف الـ JSON
        with open("final_clean_posts.json", "r", encoding="utf-8") as file:
            data = json.load(file)
        
        # 2. استخراج الـ content من كل صف (row) في الملف
        # سنقوم بتخزين النتائج في قائمة
        all_summaries = []
        
        for row in data:
            # الوصول المباشر للمحتوى المطلوب
            news_text = row.get("content") 
            
            if news_text:
                # 3. تمرير الـ content للموديل للتلخيص
                input_text = "summarize: " + news_text
                inputs = Tokenizer.encode(input_text, return_tensors="pt", max_length=512, truncation=True)
                
                outputs = model.generate(
                    inputs, 
                    max_length=150, 
                    num_beams=4, 
                    early_stopping=True
                )
                
                summary = Tokenizer.decode(outputs[0], skip_special_tokens=True)
                
                all_summaries.append({
                    "id": row.get("id"),
                    "pulse_summary": summary
                })
        
        return {"summaries": all_summaries}

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))