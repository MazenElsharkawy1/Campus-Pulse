import json
import os
from typing import Dict, Any

JSON_FILE = r"C:\campus_pulse\scraper\webscraping\campuspulse_posts.json"

def save_single_article(new_article: Dict[str, Any]):
    
    if os.path.exists(JSON_FILE):
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []
    else:
        data = []

    article_id = new_article.get("article_id")
    if article_id is None:
        raise ValueError("العنصر يجب أن يحتوي على 'article_id'")

    updated = False
    for i, item in enumerate(data):
        if str(item.get("article_id")) == str(article_id):
            data[i] = new_article
            updated = True
            break
    
    if not updated:
        data.append(new_article)

    os.makedirs(os.path.dirname(JSON_FILE), exist_ok=True)
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)