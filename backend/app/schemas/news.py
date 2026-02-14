from pydantic import BaseModel

class NewsSubmit(BaseModel):
    news_id: int
    manager_id: int

class News(BaseModel):
    id: int
    content: str
    status: str
    pr_id: int
    manager_id: int | None

    class Config:
        from_attributes = True