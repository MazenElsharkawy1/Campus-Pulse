# services/interaction_service.py
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.newsletter_article import NewsletterArticle
from app.models.article import Article
from app.models.user_preference import UserPreference
from app.models.users import User
# ✅ لا تحتاجي استيراد NewsletterService هنا إلا لو فيه دوال تانية

logger = logging.getLogger(__name__)

class InteractionService:
    # ⚙️ معاملات التحكم
    DECAY_FACTOR = 0.98
    MIN_BASE_SCORE = 0.05

    @staticmethod
    def _parse_vector(data):
        if data is None:
            return []
        try:
            if isinstance(data, str):
                cleaned = data.strip("[]").replace('"', "")
                return [float(x.strip()) for x in cleaned.split(",") if x.strip()]
            return [float(x) for x in data]
        except Exception:
            return []

    @staticmethod
    def track_interaction(
        db: Session, 
        email: str, 
        newsletter_id: int, 
        article_id: int, 
        action_type: str,  # "open" أو "share"
        db_field: str,     # "open_counter" أو "share_counter"
        weight: float      # الوزن المضاف (يحدد من الراوت)
    ) -> bool:
        try:
            # 1️⃣ جلب بيانات المستخدم وتفاعل النشرة
            user = db.query(User).filter(User.email == email).first()
            if not user: 
                return False
            interaction = db.query(NewsletterArticle).filter_by(
                newsletter_id=newsletter_id, 
                article_id=article_id
            ).first()
            if not interaction: 
                return False
            current_count = getattr(interaction, db_field, 0) or 0
            setattr(interaction, db_field, current_count + 1)

            # 3️⃣ جلب الخبر لتحديد الكاتيجوري والفيكتور
            article = db.query(Article).filter(Article.article_id == article_id).first()
            if not article: 
                db.commit()  # نكتفي بتسجيل الكاونتر
                return True

            # ==========================================
            # 4️⃣ تحديث الـ Category Score (Relative + Decay + Baseline)
            # ==========================================
            all_prefs = db.query(UserPreference).filter(UserPreference.user_id == user.user_id).all()
            pref_dict = {p.category_id: float(p.category_score or 0.0) for p in all_prefs}
            target_cat = article.category_id
            if target_cat is not None:
                old_target_score = pref_dict.get(target_cat, InteractionService.MIN_BASE_SCORE)
            else:
                old_target_score = 0.0
            for cat_id in pref_dict:
                pref_dict[cat_id] *= InteractionService.DECAY_FACTOR
            if target_cat is not None:
                pref_dict[target_cat] = old_target_score + weight
            total = sum(pref_dict.values())
            if total > 0:
                for cat_id in pref_dict:
                    pref_dict[cat_id] /= total
            else:
                if pref_dict:
                    equal_val = 1.0 / len(pref_dict)
                    for cat_id in pref_dict:
                        pref_dict[cat_id] = equal_val
            for pref in all_prefs:
                pref.category_score = pref_dict[pref.category_id]
                pref.updated_at = datetime.now(timezone.utc)
            if target_cat is not None and target_cat not in [p.category_id for p in all_prefs]:
                new_pref = UserPreference(
                    user_id=user.user_id,
                    category_id=target_cat,
                    category_score=pref_dict[target_cat],
                    updated_at=datetime.now(timezone.utc)
                )
                db.add(new_pref)

            # ==========================================
            # 5️⃣ تحديث الـ preference_vector (نفس المنطق المتوازن)
            # ==========================================
            if article.embedding is not None:
                art_vec = InteractionService._parse_vector(article.embedding)
                usr_vec = InteractionService._parse_vector(user.preference_vector)


                if art_vec is not None and len(art_vec) > 0:
                    if usr_vec is None or len(usr_vec) == 0:
                        user.preference_vector = art_vec
                    elif len(usr_vec) == len(art_vec):
                        decayed_usr = [v * InteractionService.DECAY_FACTOR for v in usr_vec]
                        blended = [(u + a * weight) for u, a in zip(decayed_usr, art_vec)]
                        user.preference_vector = blended
                    else:
                        user.preference_vector = art_vec

            db.commit()
            
            # حساب التغير الفعلي للتسجيل في اللوج
            new_target_score = pref_dict.get(target_cat, 0.0) if target_cat else 0.0
            score_change = abs(new_target_score - old_target_score)
            
            print(f"✅ Tracked {action_type.upper()} | User: {email} | Newsletter: {newsletter_id} | Article: {article_id} | Score Change: Δ{score_change:+.4f}")

            # 🔄 Trigger Re-ranking (نمرر الـ newsletter_id عشان نعيد ترتيب النشرة الصح)
            # الشرط: إعادة الترتيب لو كان التفاعل "share" أو لو التغير في السكور > 0.5%
            if action_type == "share" or score_change > 0.005:
                try:
                    from app.services.newsletter_service import NewsletterService
                    # ✅ نمرر newsletter_id هنا عشان الدالة تعيد ترتيب النشرة المحددة فقط
                    result = NewsletterService._rerank_current_newsletter(db, user, newsletter_id)
                    print(f"🔄 Re-rank Result for Newsletter {newsletter_id}: {result}")
                except AttributeError as e:
                    print(f"❌ Re-rank function not found: {e}")
                except Exception as rerank_err:
                    print(f"❌ Re-ranking failed: {rerank_err}")
                    import traceback
                    traceback.print_exc()
            
            return True

        except Exception as e:
            db.rollback()
            print(f"❌ Database Error in track_interaction: {e}")
            import traceback
            traceback.print_exc()
            return False


            #             # 2️⃣ زيادة العداد (نسخة آمنة)
            # try:
            #     # نجرب نقرأ القيمة الحالية
            #     current_count = getattr(interaction, db_field, 0)
            #     # لو None نحولها لـ 0
            #     current_count = current_count if current_count is not None else 0
            #     # نزيد واحد
            #     setattr(interaction, db_field, current_count + 1)
            # except (AttributeError, TypeError):
            #     # لو العمون مش موجود أصلاً، نعمل pass عشان الكود يكمل من غير كراش
            #     # (العداد هيفضل 0 لحد ما الداتابيز تتحدّث)
            #     print(f"⚠️ Column '{db_field}' not ready yet, skipping counter update")
            #     pass