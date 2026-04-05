from pydantic import BaseModel, ConfigDict 
from typing import Optional, List

class RoleBase(BaseModel):
    name: str # اسم الرول (Student, Manager, etc.)

class RoleResponse(RoleBase):
    role_id: int

    model_config = ConfigDict(from_attributes=True)

# سكيما إضافية لو حابة ترجعي اليوزر ومعاه تفاصيل الرول بتاعته
class UserWithRoleResponse(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: RoleResponse
    # زودي دي هنا عشان لما تستخدمي السكيما دي في الـ Service 
    # يكون معاكي الفيكتور جاهز للحسابات فوراً
    preference_vector: Optional[List[float]] = None 

    model_config = ConfigDict(from_attributes=True)