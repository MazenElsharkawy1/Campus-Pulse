from pydantic import BaseModel, ConfigDict

class UserPreferenceBase(BaseModel):
    user_id: int # إضافة الـ ID هنا بتسهل العمليات المشتركة
    category_id: int
    category_score: float 

class UserPreferenceResponse(UserPreferenceBase):
    # ممكن نزود هنا تاريخ آخر تحديث للاهتمام ده
    # updated_at: Optional[datetime] = None 
    model_config = ConfigDict(from_attributes=True)