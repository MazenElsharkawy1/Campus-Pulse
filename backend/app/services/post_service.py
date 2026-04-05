from app.models.post import Post
from typing import List

def create_post(title: str, content: str, category: str) -> dict:
    """إنشاء بوست جديد"""
    post = {
        "id": len(Post) + 1,
        "title": title,
        "content": content,
        "category": category,
        "created_at": __import__('datetime').datetime.now().isoformat()
    }
    Post.append(post)
    return post

def get_all_posts() -> List[dict]:
    """الحصول على كل البوستات"""
    return Post

