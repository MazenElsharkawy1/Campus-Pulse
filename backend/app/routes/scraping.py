import re
import json
import time
import os
import random
import requests
from typing import Optional, List
from fastapi import APIRouter, FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from supabase import create_client, Client

# ================= إعداداتك الأصلية =================
SUPABASE_URL = "https://imlydashdkziznmjhfgy.supabase.co" 
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbHlkYXNoZGt6aXpubWpoZmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTI2MDEsImV4cCI6MjA4NTg2ODYwMX0.MR0PyzmIwXlz06HOhyZt9dYypL9BV4YboVqbpuEAF-8" 
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

FB_EMAIL = "01006414502"
FB_PASS = "fatmah6414502"

MEDIA_FOLDER = "downloaded_media"
if not os.path.exists(MEDIA_FOLDER):
    os.makedirs(MEDIA_FOLDER)

# ================= دوالك الأصلية =================
def clean_text(text):
    if not text: return ""
    text = re.sub(r'See more|عرض المزيد', '', text)
    text = re.sub(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\s+العنوان)', r'KEEP_EMAIL_\1 \2', text)
    text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
                  lambda m: m.group(0) if 'KEEP_EMAIL_' in text and m.group(0) in text else '', text)
    text = re.sub(r'العنوان.*', '', text, flags=re.DOTALL)
    text = re.sub(r'#\w+', '', text)
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'[^\w\s\u0600-\u06FF]', ' ', text)
    text = text.replace('\n', ' ').replace('\r', ' ').replace(',', ' ').replace('،', ' ')
    text = re.sub(r'\s+', ' ', text)
    return text.replace('KEEP_EMAIL_', '').strip()

def download_media(url, file_name):
    if not url or url.startswith('blob:'): 
        return "No Media"
    try:
        response = requests.get(url, stream=True, timeout=15)
        if response.status_code == 200:
            file_path = os.path.join(MEDIA_FOLDER, file_name)
            with open(file_path, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            return file_path
    except Exception as e:
        print(f"❌ Error downloading media: {e}")
    return "Download Failed"

pages_to_scrape = {
    "كلية الاعلام": "https://www.facebook.com/profile.php?id=61587730989586",
    "MTI University": "https://www.facebook.com/MTI.University.Official",
    "كلية الإدارة وذكاء الأعمال": "https://www.facebook.com/profile.php?id=61587611053685",
    "كلية الصيدلة": "https://www.facebook.com/profile.php?id=61588085336255",
    "كلية التمريض": "https://www.facebook.com/profile.php?id=61588108495330",
    "كلية الحاسبات والذكاء الإصطناعي": "https://www.facebook.com/profile.php?id=61587538787244",
    "كلية الهندسة": "https://www.facebook.com/profile.php?id=61588130994112",
    "كلية العلاج الطبيعي": "https://www.facebook.com/profile.php?id=61587948032452",
    "كلية طب الفم و الأسنان": "https://www.facebook.com/profile.php?id=61587649242936",
    "كلية الطب البشري": "https://www.facebook.com/profile.php?id=61588168942181"
}

def close_popups(driver):
    x_paths = ["//div[@aria-label='Close']", "//div[@aria-label='إغلاق']", "//div[contains(@class, 'x92rt8a')]//i"]
    for path in x_paths:
        try:
            elements = driver.find_elements(By.XPATH, path)
            for el in elements:
                if el.is_displayed():
                    driver.execute_script("arguments[0].click();", el)
        except: pass

# ================= الدالة الرئيسية (نفس هيكل البيانات الأصلي) =================

def run_scraper(file_path: str, target_per_page: int, pages_override: Optional[dict] = None, headless: bool = True):
    pages = pages_override if pages_override else pages_to_scrape
    chrome_options = Options()
    if headless:
        chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-notifications")
    driver = webdriver.Chrome(options=chrome_options)
    try:
        driver.get("https://www.facebook.com")
        time.sleep(3)
        try:
            driver.find_element(By.ID, "email").send_keys(FB_EMAIL)
            driver.find_element(By.ID, "pass").send_keys(FB_PASS + Keys.ENTER)
            time.sleep(8)
        except: pass
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                try: all_results = json.load(f)
                except: all_results = []
        else: all_results = []
        existing_contents = [post['content'] for post in all_results]
        current_id = max([post['article_id'] for post in all_results]) + 1 if all_results else 1
        print(f"\n🚀 Starting scraping | Pages: {len(pages)} | Required: {target_per_page}/page")
        for source_name, url in pages.items():
            print(f"\n📄 Checking: {source_name}")
            driver.get(url)
            time.sleep(7)
            close_popups(driver)
            new_count = 0
            attempts = 0
            while new_count < target_per_page and attempts < 10:
                driver.execute_script("window.scrollBy(0, 1000);")
                time.sleep(3)
                attempts += 1
                posts = driver.find_elements(By.XPATH, '//div[@role="article"]')
                for post in posts:
                    if new_count >= target_per_page: 
                        break
                    try:
                        try:
                            btn = post.find_element(By.XPATH, ".//div[contains(text(), 'See more') or contains(text(), 'عرض المزيد')]")
                            driver.execute_script("arguments[0].click();", btn)
                            time.sleep(1)
                        except: pass
                        content_area = post.find_element(By.XPATH, ".//div[@data-ad-preview='message'] | .//div[@data-ad-comet-preview='post_contents']")
                        raw_text = content_area.text
                        cleaned_text = clean_text(raw_text)

                        # ✅ منع التكرار
                        if not cleaned_text or cleaned_text in existing_contents: 
                            continue

                        post_title = cleaned_text[:55] + "..." if len(cleaned_text) > 55 else cleaned_text

                        media_url = None
                        media_type = "image"
                        
                        try:
                            videos = post.find_elements(By.TAG_NAME, "video")
                            for vid in videos:
                                src = vid.get_attribute("src")
                                if src:
                                    media_url = src
                                    media_type = "video"
                                    break
                        except: pass

                        if not media_url:
                            try:
                                valid_images = []
                                photo_links = post.find_elements(By.XPATH, ".//a[contains(@href, 'photo') or contains(@href, 'fbid=')]//img")
                                if photo_links:
                                    for img in photo_links:
                                        src = img.get_attribute("src")
                                        if src and "scontent" in src:
                                            valid_images.append(src)
                                if not valid_images:
                                    all_images = post.find_elements(By.TAG_NAME, "img")
                                    for img in all_images:
                                        src = img.get_attribute("src")
                                        if not src or "scontent" not in src: continue
                                        w, h = img.get_attribute("width"), img.get_attribute("height")
                                        try:
                                            if w and int(w) < 100: continue
                                            if h and int(h) < 100: continue
                                        except: pass
                                        valid_images.append(src)
                                if valid_images:
                                    media_url = valid_images[0]
                            except: pass
                        
                        local_file_path = "No Media"
                        if media_url:
                            if media_url.startswith('blob:'):
                                local_file_path = "Video (Blob URL)"
                            else:
                                ext = ".mp4" if media_type == "video" else ".jpg"
                                file_name = f"post_{current_id}{ext}"
                                print(f"  📥 Downloading: {file_name}")
                                local_file_path = download_media(media_url, file_name)

                        # ✅ نفس الهيكل الأصلي بتاعك بالظبط
                        full_data = {
                            "article_id": current_id,
                            "source": source_name,
                            "title": post_title,
                            "summary": None,
                            "content": cleaned_text,
                            "photo": local_file_path,
                            "original_media_url": media_url 
                        }
                        
                        all_results.append(full_data)
                        existing_contents.append(cleaned_text)
                        
                        # ✅ نفس البيانات اللي بتروح للداتا بيز بالظبط
                        try:
                            db_data = {
                                "article_id": current_id,
                                "status": "cleaned"
                            }
                            supabase.table("articles").insert(db_data).execute()
                            print(f"  ✅ تم الحفظ في DB (ID: {current_id})")
                        except Exception as e:
                            print(f"  ❌ خطأ في DB: {e}")

                        current_id += 1
                        new_count += 1
                        print(f"  ✨ New post ({new_count}/{target_per_page})")
                        
                    except: continue

            print(f"✅ Finished: {source_name} | Added {new_count} posts")
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(all_results, f, ensure_ascii=False, indent=4)

        print(f"\n🎉 Finished scraping!")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        driver.quit()

# ================= Pydantic Model =================
class ScrapingRequest(BaseModel):
    pages: Optional[List[str]] = None
    limit: Optional[int] = 5
    headless: Optional[bool] = True

# ================= API Endpoints =================

router = APIRouter( tags=["Scraping"])
@router.post("/api/start-scraping", status_code=202)
async def trigger_scraping(request: ScrapingRequest, background_tasks: BackgroundTasks):
    
    # ✅ الباك إند يتحكم: يستخدم كل الصفحات دايماً
    target_pages = pages_to_scrape
    
    limit = request.limit if request.limit and request.limit > 0 else 5
    headless = request.headless if request.headless is not None else True
    
    print(f"\n🚀 Starting scraping on {len(target_pages)} pages | Required: {limit}/page")
    
    background_tasks.add_task(
        run_scraper,
        file_path=r"C:\\campus_pulse\\scraper\\webscraping\\campuspulse_posts.json",
        target_per_page=limit,
        pages_override=target_pages,
        headless=headless
    )
    
    return {
        "success": True,
        "message": "✅ Started the process on all pages. Check logs for details.",
        "pages_count": len(target_pages),
        "limit": limit
    }

