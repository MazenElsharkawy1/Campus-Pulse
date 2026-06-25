import re
import json
import time
import os
import random
import requests 
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from supabase import create_client, Client

# --- إعدادات Supabase ---
SUPABASE_URL = "https://imlydashdkziznmjhfgy.supabase.co" 
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbHlkYXNoZGt6aXpubWpoZmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTI2MDEsImV4cCI6MjA4NTg2ODYwMX0.MR0PyzmIwXlz06HOhyZt9dYypL9BV4YboVqbpuEAF-8" 
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- بيانات تسجيل الدخول ---
FB_EMAIL = "01006414502"
FB_PASS = "fatmah6414502"

MEDIA_FOLDER = "downloaded_media"
if not os.path.exists(MEDIA_FOLDER):
    os.makedirs(MEDIA_FOLDER)

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
        return "No Image/Video or Blob URL"
    
    try:
        response = requests.get(url, stream=True, timeout=15)
        if response.status_code == 200:
            file_path = os.path.join(MEDIA_FOLDER, file_name)
            with open(file_path, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            return file_path
    except Exception as e:
        print(f"❌ خطأ في تحميل الميديا ({url}): {e}")
    return "Download Failed"

pages_to_scrape = {
    "MTI University": "https://www.facebook.com/MTI.University.Official",
    "كلية الإدارة وذكاء الأعمال": "https://www.facebook.com/profile.php?id=61587611053685",
    "كلية الصيدلة": "https://www.facebook.com/profile.php?id=61588085336255",
    "كلية التمريض": "https://www.facebook.com/profile.php?id=61588108495330",
    "كلية الحاسبات والذكاء الإصطناعي": "https://www.facebook.com/profile.php?id=61587538787244",
    "كلية الهندسة": "https://www.facebook.com/profile.php?id=61588130994112",
    "كلية العلاج الطبيعي": "https://www.facebook.com/profile.php?id=61587948032452",
    "كلية طب الفم و الأسنان": "https://www.facebook.com/profile.php?id=61587649242936",
    "كلية الطب البشري": "https://www.facebook.com/profile.php?id=61588168942181",
    "كلية الاعلام" : "https://www.facebook.com/profile.php?id=61587730989586"
}

chrome_options = Options()
chrome_options.add_argument("--disable-notifications")
driver = webdriver.Chrome(options=chrome_options)

def close_popups(driver):
    x_paths = ["//div[@aria-label='Close']", "//div[@aria-label='إغلاق']", "//div[contains(@class, 'x92rt8a')]//i"]
    for path in x_paths:
        try:
            elements = driver.find_elements(By.XPATH, path)
            for el in elements:
                if el.is_displayed():
                    driver.execute_script("arguments[0].click();", el)
        except: pass

def start_mass_scraping():
    file_path = 'campuspulse_posts.json'
    target_per_page = 5
   
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

    try:
        for source_name, url in pages_to_scrape.items():
            print(f"\n--- جاري فحص: {source_name} ---")
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
                    if new_count >= target_per_page: break
                    try:
                        try:
                            btn = post.find_element(By.XPATH, ".//div[contains(text(), 'See more') or contains(text(), 'عرض المزيد')]")
                            driver.execute_script("arguments[0].click();", btn)
                            time.sleep(1)
                        except: pass

                        content_area = post.find_element(By.XPATH, ".//div[@data-ad-preview='message'] | .//div[@data-ad-comet-preview='post_contents']")
                        raw_text = content_area.text
                        cleaned_text = clean_text(raw_text)

                        if not cleaned_text or cleaned_text in existing_contents: continue

                        post_title = cleaned_text[:55] + "..." if len(cleaned_text) > 55 else cleaned_text

                        # --- استخراج وتحميل الصور والفيديوهات ---
                        media_url = None
                        media_type = "image"
                        
                        # 1. البحث عن فيديو أولاً
                        try:
                            videos = post.find_elements(By.TAG_NAME, "video")
                            for vid in videos:
                                src = vid.get_attribute("src")
                                if src:
                                    media_url = src
                                    media_type = "video"
                                    break
                        except: pass

                        # 2. لو مفيش فيديو، نبحث عن صور
                        if not media_url:
                            try:
                                valid_images = []
                                # الفلتر الأول: البحث عن الصور اللي جوه رابط ألبوم/صورة
                                photo_links = post.find_elements(By.XPATH, ".//a[contains(@href, 'photo') or contains(@href, 'fbid=')]//img")
                                if photo_links:
                                    for img in photo_links:
                                        src = img.get_attribute("src")
                                        if src and "scontent" in src:
                                            valid_images.append(src)
                                
                                # الفلتر التاني: لو الفلتر الأول ملقاش حاجة، هنستبعد البروفايل والإيموجي بالحجم
                                if not valid_images:
                                    all_images = post.find_elements(By.TAG_NAME, "img")
                                    for img in all_images:
                                        src = img.get_attribute("src")
                                        if not src or "scontent" not in src: 
                                            continue
                                        
                                        # استبعاد أي صورة عرضها أو طولها أقل من 100 بيكسل (البروفايل والإيموجي)
                                        w = img.get_attribute("width")
                                        h = img.get_attribute("height")
                                        try:
                                            if w and int(w) < 100: continue
                                            if h and int(h) < 100: continue
                                        except: pass
                                        
                                        valid_images.append(src)
                                
                                # هناخد أول صوره عدت من الفلاتر (دي هتكون صورة البوست الأصلية)
                                if valid_images:
                                    media_url = valid_images[0]
                            except: pass

                        # عملية التحميل
                        local_file_path = "No Media"
                        if media_url:
                            if media_url.startswith('blob:'):
                                local_file_path = "Video (Blob URL) - Cannot download directly"
                            else:
                                ext = ".mp4" if media_type == "video" else ".jpg"
                                file_name = f"post_{current_id}{ext}"
                                print(f"جاري تحميل: {file_name} ...")
                                local_file_path = download_media(media_url, file_name)

                        # حفظ البيانات كاملة في ملف الـ JSON
                        full_data = {
                            "article_id": current_id,
                            "source": source_name,
                            "title": post_title,
                            "summary": None,
                            "content": cleaned_text,
                            "photo": local_file_path, # هنا هيتسجل مسار الملف على جهازك بدل الرابط
                            "original_media_url": media_url # حفظ الرابط الأصلي للاحتياط
                        }
                        all_results.append(full_data)
                        existing_contents.append(cleaned_text)
                        
                        # --- التعديل المطلوب: إرسال الـ ID والـ Status فقط لـ Supabase ---
                        try:
                            db_data = {
                                "article_id": current_id,
                                "status": "cleaned"
                            }
                            supabase.table("articles").insert(db_data).execute()
                            print(f"✅ تم الحفظ في الـ DB (ID: {current_id})")
                        except Exception as e:
                            print(f"❌ خطأ في قاعدة البيانات: {e}")

                        current_id += 1
                        new_count += 1
                    except: continue

            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(all_results, f, ensure_ascii=False, indent=4)

    finally:
        driver.quit()

start_mass_scraping()