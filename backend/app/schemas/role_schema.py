from pydantic import BaseModel, ConfigDict 
from typing import Optional, List

class RoleBase(BaseModel):
    name: str

class RoleResponse(RoleBase):
    role_id: int

    model_config = ConfigDict(from_attributes=True)

class UserWithRoleResponse(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: RoleResponse
    preference_vector: Optional[List[float]] = None 

    model_config = ConfigDict(from_attributes=True)