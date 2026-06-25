from pydantic import BaseModel, ConfigDict

class UserPreferenceBase(BaseModel):
    user_id: int 
    category_id: int
    category_score: float 

class UserPreferenceResponse(UserPreferenceBase):
    model_config = ConfigDict(from_attributes=True)