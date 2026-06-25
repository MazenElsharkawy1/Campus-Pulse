# service/chatbot_service.py
import os
import json
import logging
import numpy as np
from typing import Optional, List, Dict, Any
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import text, create_engine, inspect
from app.services.ai_modules import ai_processor
from app.db.database import DATABASE_URL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self):
        self.embedder = ai_processor.sbert
        
        app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.knowledge_file = os.path.join(app_dir, "data", "help_knowledge.json")
        if not os.path.exists(self.knowledge_file):
            fallback = r"C:\campus_pulse\backend\app\data\help_knowledge.json"
            if os.path.exists(fallback):
                self.knowledge_file = fallback

        project_root = os.path.dirname(app_dir)
        self.articles_json_path = os.path.join(
            project_root, "scraper", "webscraping", "campuspulse_posts.json"
        )
        
        if not os.path.exists(self.articles_json_path):
            fallback = r"C:\campus_pulse\scraper\webscraping\campuspulse_posts.json"
            if os.path.exists(fallback):
                self.articles_json_path = fallback
        
        self.documents = []
        self.search_texts = []
        self.roles = []
        self.doc_embeddings = []
        
        self._load_knowledge()
        
        # ✅ إنشاء engine مع إعدادات connection pool محسنة
        self.supabase_engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            pool_recycle=1800,
            echo=False
        )
        
        self._test_supabase_connection()
        print("✅ Chatbot initialized (Semantic Search Only)")

    def _test_supabase_connection(self):
        try:
            with self.supabase_engine.connect() as conn:
                inspector = inspect(self.supabase_engine)
                if "articles" not in inspector.get_table_names():
                    logger.error("❌ Table 'articles' not found in Supabase!")
                    return
                count = conn.execute(text("SELECT COUNT(*) FROM articles WHERE status = 'published'")).scalar()
                logger.info(f"✅ Supabase connected. Found {count} published articles.")
        except Exception as e:
            logger.error(f"❌ Supabase connection test failed: {e}")

    def _load_knowledge(self):
        if not os.path.exists(self.knowledge_file):
            logger.warning(f"⚠️ Knowledge file not found at {self.knowledge_file}")
            return
        
        with open(self.knowledge_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        self.documents = []
        self.search_texts = []
        self.roles = []
        
        for item in data:
            base_doc = {
                "answer": item["answer"],
                "role": item["role"],
                "id": item.get("id")
            }
            for variant in item.get("question_variants", []):
                self.documents.append(base_doc)
                self.search_texts.append(variant)
                self.roles.append(item["role"])
        
        logger.info(f"📚 Loaded {len(self.search_texts)} search entries from {len(data)} help topics")
        
        if self.search_texts:
            self.doc_embeddings = self.embedder.encode(self.search_texts, normalize_embeddings=True)
            logger.info(f"✅ Generated embeddings shape: {self.doc_embeddings.shape}")
        else:
            logger.error("❌ No search texts found to embed!")
            self.doc_embeddings = []

    def _load_articles_json(self) -> Dict[int, Dict[str, Any]]:
        if not os.path.exists(self.articles_json_path):
            logger.error(f"❌ Articles JSON not found at {self.articles_json_path}")
            return {}
        try:
            with open(self.articles_json_path, "r", encoding="utf-8") as f:
                articles_list = json.load(f)
                return {int(art.get("article_id")): art for art in articles_list if art.get("article_id")}
        except Exception as e:
            logger.error(f"❌ Failed to load articles JSON: {e}")
            return {}

    def search_help(self, query: str, user_role: str) -> tuple[str, float]:
        if self.doc_embeddings is None or len(self.doc_embeddings) == 0:
            return "عذراً، نظام المساعدة غير مهيأ حالياً.", 0.0

        query_emb = self.embedder.encode([query], normalize_embeddings=True)[0]
        
        relevant_indices = [i for i, role in enumerate(self.roles) if role in ["public", user_role]]
        if not relevant_indices:
            return None, 0.0
        
        relevant_embeddings = np.array([self.doc_embeddings[i] for i in relevant_indices])
        similarities = cosine_similarity([query_emb], relevant_embeddings)[0]
        
        best_local_idx = np.argmax(similarities)
        best_score = similarities[best_local_idx]
        best_global_idx = relevant_indices[best_local_idx]
        
        if best_score < 0.55:
            return None, best_score
        
        return self.documents[best_global_idx]["answer"], best_score

    def search_articles(self, query: str, top_k: int = 1, similarity_threshold: float = 0.30) -> List[Dict[str, Any]]:
        """
        🔍 البحث الدلالي - يرجع أعلى خبر واحد بالمحتوى الكامل
        """
        logger.info(f"🔍 Semantic search for query: '{query}' (threshold={similarity_threshold})")
        
        # 1. تحويل السؤال لفيكتور
        query_embedding = self.embedder.encode([query], normalize_embeddings=True)[0].tolist()
        embedding_literal = '[' + ','.join(f"{x:.6f}" for x in query_embedding) + ']'
        
        results = []
        
        try:
            with self.supabase_engine.connect() as conn:
                sql_text = f"""
                    SELECT article_id, published_at, 
                           (embedding <=> '{embedding_literal}'::vector) as cosine_distance
                    FROM articles
                    WHERE status = 'published'
                      AND embedding IS NOT NULL
                    ORDER BY (embedding <=> '{embedding_literal}'::vector) ASC
                    LIMIT 20
                """
                
                sql = text(sql_text)
                rows = conn.execute(sql).fetchall()
                logger.info(f"📊 Got {len(rows)} raw results from DB")
                
                # تحميل الـ JSON
                articles_data = self._load_articles_json()
                
                # معالجة النتائج
                for row in rows:
                    article_id, published_at, distance = row
                    
                    if distance is None:
                        continue
                    
                    similarity = 1 - distance
                    
                    if similarity < similarity_threshold:
                        continue
                    
                    # مطابقة الـ ID مع الـ JSON
                    match_id = None
                    if article_id in articles_data:
                        match_id = article_id
                    elif str(article_id) in articles_data:
                        match_id = str(article_id)
                    elif isinstance(article_id, str) and article_id.isdigit() and int(article_id) in articles_data:
                        match_id = int(article_id)
                    
                    if match_id is None:
                        continue
                    
                    article = articles_data[match_id]
                    
                    # ✅ أضفنا content كامل
                    results.append({
                        "article_id": match_id,
                        "title": article.get("title") or "بدون عنوان",
                        "content": article.get("content") or "لا يوجد محتوى",
                        "summary": article.get("summary") or "لا يوجد ملخص",
                        "category": article.get("category") or "عام",
                        "source": article.get("source") or "غير معروف",
                        "original_media_url": article.get("original_media_url") or "",
                        "similarity": round(similarity, 3),
                        "published_at": published_at.isoformat() if published_at else None
                    })
                    
                    # ✅ نوقف عند أول نتيجة (top_k = 1)
                    if len(results) >= top_k:
                        break
                        
        except Exception as e:
            logger.error(f"❌ Supabase query failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return []
        
        logger.info(f"📦 Final results: {len(results)} articles")
        return results
    
    async def process_query(self, query: str, mode: str = "news", user_role: str = "student", user_id: int = None) -> dict:
        logger.info(f"💬 Processing query: '{query}' | Mode: {mode} | Role: {user_role}")
        
        # ✅ المسار الأول: المساعدة (Help)
        if mode == "help":
            help_answer, help_score = self.search_help(query, user_role)
            
            if help_answer and help_score >= 0.55:
                return {
                    "response": help_answer,
                    "intent": "help_ui",
                    "source": "help_knowledge.json",
                    "articles": []
                }
            else:
                return {
                    "response": "عذراً، لم أجد إجابة دقيقة لسؤالك في قاعدة المعرفة. جرب صياغة السؤال بطريقة أخرى أو تواصل مع الدعم الفني.",
                    "intent": "help_ui",
                    "source": "help_fallback",
                    "articles": []
                }
        
        # ✅ المسار الثاني: البحث عن أخبار (News)
        elif mode == "news":
            # ✅ نرجع خبر واحد بس (الأعلى similarity)
            articles = self.search_articles(query, top_k=1, similarity_threshold=0.30)
            
            if articles:
                article = articles[0]  # ✅ الخبر الوحيد (الأعلى تشابه)
                
                # بناء الرد النصي
                response_lines = [f"🔍 وجدت خبر متعلق بسؤالك:\n"]
                response_lines.append(f"📰 العنوان: {article['title']}")
                response_lines.append(f"🏫 المصدر: {article.get('source', 'عام')}")
                response_lines.append(f"📂 التصنيف: {article['category']}")
                response_lines.append(f"🎯 درجة التطابق: {article['similarity']*100:.1f}%")
                if article.get('published_at'):
                    response_lines.append(f"📅 تاريخ النشر: {article['published_at'][:10]}")
                response_lines.append(f"\n📝 المحتوى الكامل:\n{article['content']}")
                
                return {
                    "response": "\n".join(response_lines),
                    "intent": "news_search",
                    "source": "articles_db",
                    "articles": articles
                }
            else:
                return {
                    "response": "عذراً، لم أجد أخبار متعلقة بسؤالك حالياً. جرب تسأل عن موضوع تاني.",
                    "intent": "news_search",
                    "source": "news_fallback",
                    "articles": []
                }
        
        # ✅ مسار افتراضي لو الـ mode غلط
        return {
            "response": "عذراً، حدث خطأ في تحديد نوع الطلب.",
            "intent": "error",
            "source": "system",
            "articles": []
        }