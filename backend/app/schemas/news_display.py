from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
class NewsSummaryResponse(BaseModel):
    newsletter_id: int      
    title: str
    summary: str
    category_id: int          
    publish_date: datetime   
    views_content: int = 0    
    
    model_config = ConfigDict(from_attributes=True)


class NewsDetailResponse(NewsSummaryResponse):
   raw_content: Optional[str] = None 

class PersonalizedNewsItem(BaseModel):
    newsletter_id: int
    title: str
    summary: str
    category_id: int
    publish_date: datetime
    relevance_score: Optional[float] = None 
    
    model_config = ConfigDict(from_attributes=True)

class CategoryGroupResponse(BaseModel):
    category_id: int
    category_name: str
    news_list: List[NewsSummaryResponse]