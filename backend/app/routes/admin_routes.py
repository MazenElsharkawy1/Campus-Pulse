# ============================================================
# 🔧 IMPORTS
# ============================================================
import os
import tempfile
import time
import json
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from supabase import create_client, Client
from datetime import datetime
import matplotlib.pyplot as plt
from fpdf import FPDF
from collections import Counter
import arabic_reshaper   
from bidi.algorithm import get_display

# ============================================================
# 🔧 SUPABASE CONFIGURATION
# ============================================================
SB_URL = "https://imlydashdkziznmjhfgy.supabase.co"
SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbHlkYXNoZGt6aXpubWpoZmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTI2MDEsImV4cCI6MjA4NTg2ODYwMX0.MR0PyzmIwXlz06HOhyZt9dYypL9BV4YboVqbpuEAF-8"

supabase: Client = create_client(SB_URL, SB_KEY)

router = APIRouter(tags=["Admin Dashboard"])
# ============================================================
# 🔧 HELPERS
# ============================================================
def safe_text(text):
    """تحويل النص لـ ASCII آمن عشان الـ PDF"""
    if text is None: 
        return ""
    return ''.join(char for char in str(text) if ord(char) < 128)

def safe_number(num, default=0):
    """تحويل آمن للأرقام"""
    try: 
        return int(num) if num is not None else default
    except: 
        return default

def fix_ar(text):
    """دالة لتشكيل النصوص العربية"""
    if not text or str(text).strip() == "None": 
        return ""
    try: 
        return get_display(arabic_reshaper.reshape(str(text)))
    except: 
        return str(text)

def is_number(n):
    """التحقق مما إذا كانت القيمة رقمية"""
    try: 
        float(n)
        return True
    except: 
        return False

def get_logo_path(name):
    """البحث عن مسار اللوجو في مجلدات مختلفة"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    paths = [
        os.path.join(current_dir, 'static', 'profiles', name),
        os.path.join(current_dir, '..', 'static', 'profiles', name),
        os.path.join(os.getcwd(), 'backend', 'static', 'profiles', name)
    ]
    
    for p in paths:
        if os.path.exists(p): 
            return p
    return None

# ============================================================
# 🎨 ADMIN PDF CLASS
# ============================================================
class AdminPDF(FPDF):
    def __init__(self):
        super().__init__()
        current_dir = os.path.dirname(os.path.abspath(__file__))
        fp = os.path.join(current_dir, 'assets', 'Amiri-Regular.ttf')
        if os.path.exists(fp):
            self.add_font('Amiri', '', fp, uni=True)
            self.add_font('Amiri', 'B', fp, uni=True)
            self.has_amiri = True
        else: 
            self.has_amiri = False

    def header(self):
        # 1️⃣ رسم الإطار الخارجي
        self.set_draw_color(220, 220, 220)
        self.set_line_width(0.2)
        self.rect(10, 10, 190, 277)

        # 2️⃣ وضع اللوجوهات
        for name, x in [('logoL.jpeg', 12), ('logoR.jpeg', 95), ('logoC.jpeg', 175)]:
            p = get_logo_path(name)
            if p:
                try: 
                    h = 18 if name == 'logoR.jpeg' else 14
                    self.image(p, x=x, y=12, h=h)
                except: 
                    pass

        # 3️⃣ الخط البرتقالي الفاصل
        self.set_draw_color(243, 156, 18)
        self.set_line_width(0.8)
        self.line(18, 32, 188, 32)

        # 4️⃣ عنوان التقرير - كحلي وينزل تحت أكتر
        self.ln(25)
        self.set_font('Arial', 'B', 16)
        self.set_text_color(30, 58, 138)
        self.cell(0, 10, 'ADMINISTRATIVE DASHBOARD REPORT', 0, 1, 'C')
        
        self.ln(8)
                
    def footer(self):
        self.set_y(-25) 
        self.set_font("Arial", "I", 8)
        self.set_text_color(160, 160, 160)
        self.set_x(15)
        self.cell(90, 10, "CampusPulse System", 0, 0, "L")
        self.set_x(-35) 
        self.cell(20, 10, f"Page {self.page_no()}", 0, 0, "R")

# ============================================================
# 📊 CHART GENERATORS
# ============================================================
def create_stats_chart(data_dict, output_path):
    fig, ax = plt.subplots(figsize=(8, 1.5), dpi=150, facecolor='white')
    ax.axis('off')
    labels = [safe_text(k) for k in data_dict.keys()]
    values = list(data_dict.values())
    colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444']
    for i, (label, value) in enumerate(zip(labels, values)):
        color = colors[i % len(colors)]
        ax.text(i*2 + 0.5, 0.5, f"{value}\n{label}", ha='center', va='center', fontsize=9, fontweight='bold',
               bbox=dict(boxstyle='round,pad=0.3', facecolor=color, alpha=0.1, edgecolor=color))
    ax.set_xlim(0, len(labels)*2)
    ax.set_ylim(0, 1)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close()

def add_compact_table(pdf, headers, rows, title=""):
    """دالة محسّنة لرسم جدول احترافي - كل المحتوى في النص"""
    
    # ✅ عنوان الجدول
    pdf.set_font('Arial', 'B', 11)
    pdf.set_text_color(30, 58, 138)  # كحلي غامق
    pdf.cell(0, 6, safe_text(title), 0, 1)
    pdf.ln(1)
    
    col_width = 190 / len(headers)
    
    # ✅ Header
    pdf.set_font('Arial', 'B', 8)
    pdf.set_fill_color(99, 102, 241)  # Indigo
    pdf.set_text_color(255, 255, 255)  # أبيض
    pdf.set_draw_color(79, 70, 229)  # حدود أغمق
    
    for header in headers:
        pdf.cell(col_width, 6, safe_text(header)[:15], 1, 0, 'C', fill=True)
    pdf.ln()
    
    # ✅ Rows
    pdf.set_font('Arial', '', 8)
    pdf.set_text_color(71, 85, 105)
    pdf.set_draw_color(226, 232, 240)  # رمادي فاتح للحدود
    
    for i, row in enumerate(rows[:12]):
        # ألوان متناوبة
        if i % 2 == 0:
            pdf.set_fill_color(248, 250, 252)  # رمادي فاتح جداً
        else:
            pdf.set_fill_color(255, 255, 255)  # أبيض
        
        for j, cell in enumerate(row):
            # ✅ جميع الأعمدة في النص (مركز)
            pdf.cell(col_width, 5.5, safe_text(str(cell))[:15], 1, 0, 'C', fill=(i % 2 == 0))
        pdf.ln()
    
    pdf.ln(3)

# ============================================================
# 📊 CORE ENDPOINTS
# ============================================================
@router.get("/admin/stats")
async def get_admin_stats():
    try:
        res = supabase.from_("admin_system_stats").select("*").execute()
        if not res.data or len(res.data) == 0:
            return {"users": 0, "usersGrowth": "0%", "newsletters": 0, "articles": 0, "feedbackCount": 0}
        row = res.data[0]
        total_users = safe_number(row.get("total_users"), 0)
        new_users_6mo = safe_number(row.get("new_users_6mo"), 0)
        old_users = max(total_users - new_users_6mo, 1)
        users_growth = "+" + str(round((new_users_6mo / old_users) * 100)) + "%" if new_users_6mo > 0 else "0%"
        return {
            "users": total_users, "usersGrowth": users_growth,
            "newsletters": safe_number(row.get("total_newsletters"), 0),
            "articles": safe_number(row.get("total_articles"), 0),
            "feedbackCount": safe_number(row.get("feedback_6mo"), 0)
        }
    except:
        return {"users": 0, "usersGrowth": "0%", "newsletters": 0, "articles": 0, "feedbackCount": 0}

@router.get("/admin/db-status")
async def get_database_status():
    try:
        start = time.perf_counter()

        # اختبار الاتصال
        supabase.from_("admin_system_stats").select("*").limit(1).execute()

        latency = round((time.perf_counter() - start) * 1000, 2)

        # ✅ استدعاء function مباشرة
        result = supabase.rpc("count_tables").execute()

        # 👇 دي أهم نقطة (شكل الريسبونس)
        tables_count = result.data if isinstance(result.data, int) else result.data[0]

        return {
            "status": "ok",
            "latency_ms": latency,
            "tables_count": tables_count,
            "message": "Database connected successfully"
        }

    except Exception as e:
        return {
            "status": "error",
            "latency_ms": 0,
            "tables_count": 0,
            "message": str(e)
        }
@router.get("/admin/activity")
async def get_recent_activity(limit: int = 20):
    try:
        res = supabase.from_("admin_recent_activity").select("*").order("created_at", desc=True).limit(limit).execute()
        return {"activities": res.data or []}
    except:
        return {"activities": []}

@router.get("/admin/categories/stats")
async def get_category_statistics():
    try:
        res = supabase.from_("admin_category_stats").select("*").order("total_articles", desc=True).execute()
        return {"categories": res.data or []}
    except:
        return {"categories": []}

@router.get("/admin/feedback/summary")
async def get_feedback_summary():
    try:
        res = supabase.from_("admin_feedback_summary").select("*").order("edition", desc=True).limit(20).execute()
        return {"feedback": res.data or []}
    except:
        return {"feedback": []}

@router.post("/admin/backup")
async def run_backup():
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        tables_data = {}
        for tbl in ["users", "newsletters", "articles", "feedback", "categories"]:
            try:
                res = supabase.from_(tbl).select("*").execute()
                tables_data[tbl] = res.data or []
            except:
                tables_data[tbl] = []
        backup_json = json.dumps({"timestamp": timestamp, "data": tables_data}, indent=2, default=str)
        return Response(content=backup_json, media_type="application/json", 
                        headers={"Content-Disposition": f"attachment; filename=backup_{timestamp}.json"})
    except Exception as e:
        raise HTTPException(500, "Backup failed: " + str(e))

@router.get("/admin/report/export")
async def export_maintenance_report():
    try:
        stats = await get_admin_stats()
        db_status = await get_database_status()
        activity = await get_recent_activity(limit=50)
        categories = await get_category_statistics()
        feedback = await get_feedback_summary()
        return {
            "generatedAt": datetime.now().isoformat(),
            "systemStatistics": stats, "databaseStatus": db_status,
            "recentActivity": activity, "categoryStatistics": categories,
            "feedbackSummary": feedback
        }
    except Exception as e:
        raise HTTPException(500, "Export failed: " + str(e))

# ============================================================
# 📄 REPORT ENDPOINTS
# ============================================================

@router.get("/admin/reports/engagement/pdf")
async def generate_engagement_report():
    try:
        res = supabase.from_("admin_system_stats").select("*").execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(404, "No stats data")
        
        row = res.data[0]
        pdf = AdminPDF()
        pdf.add_page()
        
        pdf.set_font('Arial', 'B', 12)
        pdf.set_text_color(30, 58, 138)
        pdf.cell(0, 6, '6-Month Engagement Dashboard', 0, 1, 'C')
        
        y_charts = pdf.get_y() + 24
        
        # Left: Area Chart
        labels = ['Users', 'News', 'Arts', 'Feed']
        values = [
            safe_number(row.get('new_users_6mo'), 0),
            safe_number(row.get('newsletters_6mo'), 0),
            safe_number(row.get('articles_6mo'), 0),
            safe_number(row.get('feedback_6mo'), 0)
        ]
        
        fig_area, ax_area = plt.subplots(figsize=(4, 3), dpi=150, facecolor='white')
        ax_area.fill_between(range(len(values)), values, alpha=0.3, color='#6366f1')
        ax_area.plot(range(len(values)), values, linewidth=2, color='#6366f1', marker='o', markersize=3)
        ax_area.set_xticks(range(len(labels)))
        ax_area.set_xticklabels(labels, fontsize=7, rotation=45)
        ax_area.set_title('Growth Trends', fontsize=9, fontweight='bold')
        ax_area.grid(axis='y', linestyle=':', alpha=0.2)
        ax_area.spines['top'].set_visible(False)
        ax_area.spines['right'].set_visible(False)
        plt.tight_layout()
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp: c1_path = tmp.name
        plt.savefig(c1_path, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        pdf.image(c1_path, x=15, y=y_charts, w=85, h=50)
        if os.path.exists(c1_path): os.remove(c1_path)
        
        # Right: Pie Chart
        dist_labels = ['Users', 'Articles', 'News']
        dist_values = [
            safe_number(row.get('total_users'), 0), 
            safe_number(row.get('total_articles'), 0), 
            safe_number(row.get('total_newsletters'), 0)
        ]
        
        fig_pie, ax_pie = plt.subplots(figsize=(4.5, 4.5), dpi=150, facecolor='white')
        wedges, texts, autotexts = ax_pie.pie(
            dist_values, 
            labels=[safe_text(l) for l in dist_labels], 
            autopct='%1.0f%%', 
            colors=['#6366f1', '#10b981', '#f59e0b'], 
            wedgeprops=dict(width=0.5, edgecolor='white', linewidth=2),
            startangle=90
        )
        
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')
            autotext.set_fontsize(10)
        
        for text in texts:
            text.set_color('#1e293b')
            text.set_fontweight('bold')
            text.set_fontsize(9)
        
        ax_pie.set_title('Distribution', fontsize=10, fontweight='bold', pad=15)
        plt.tight_layout()
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp: c2_path = tmp.name
        plt.savefig(c2_path, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        pdf.image(c2_path, x=110, y=y_charts, w=85, h=55)
        if os.path.exists(c2_path): os.remove(c2_path)

        # Table
        pdf.set_y(y_charts + 58)
        
        total_users = safe_number(row.get('total_users'), 0)
        new_users = safe_number(row.get('new_users_6mo'), 0)
        growth_rate = ((new_users / max(total_users - new_users, 1)) * 100) if total_users > new_users else 0
        
        table_rows = [
            ['Total Users', str(total_users)],
            ['New Users', str(new_users)],
            ['Growth Rate', f"{growth_rate:.1f}%"],
            ['Total Articles', str(safe_number(row.get('total_articles'), 0))],
            ['Total Newsletters', str(safe_number(row.get('total_newsletters'), 0))]
        ]
        add_compact_table(pdf, ['Metric', 'Value'], table_rows, 'Key Performance Metrics')
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp: output_path = tmp.name
        pdf.output(output_path)
        return FileResponse(path=output_path, filename="engagement_report.pdf", media_type='application/pdf')
    except HTTPException: 
        raise
    except Exception as e:
        print("Error:", e)
        raise HTTPException(500, "PDF failed: " + str(e))

@router.get("/admin/reports/impact/pdf")
async def generate_impact_report():
    try:
        res = supabase.from_("admin_category_stats").select("*").order("total_articles", desc=True).limit(8).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(404, "No category data")
        
        pdf = AdminPDF()
        pdf.add_page()
        
        pdf.set_font('Arial', 'B', 12)
        pdf.set_text_color(30, 58, 138)
        pdf.cell(0, 6, 'Category Impact Dashboard', 0, 1, 'C')
        pdf.ln(6)
        
        categories = res.data[:8]
        labels = [safe_text(c.get("category_name", "Unknown")[:15]) for c in categories]
        articles = [safe_number(c.get("total_articles"), 0) for c in categories]
        scores = [round((c.get("avg_interest_score", 0) or 0) * 100, 1) for c in categories]
        
        y_charts = pdf.get_y()
        
        # Left: Pie
        fig_p, ax_p = plt.subplots(figsize=(4.5, 4.5), dpi=150, facecolor='white')
        wedges, texts, autotexts = ax_p.pie(
            articles[:5], 
            labels=[safe_text(l)[:10] for l in labels[:5]], 
            autopct='%1.0f%%', 
            colors=['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'], 
            wedgeprops=dict(width=0.5, edgecolor='white', linewidth=2),
            startangle=90
        )
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')
            autotext.set_fontsize(10)
        for text in texts:
            text.set_color('#1e293b')
            text.set_fontweight('bold')
            text.set_fontsize(9)
        ax_p.set_title('Top Categories', fontsize=10, fontweight='bold', pad=15)
        plt.tight_layout()
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp: p_path = tmp.name
        plt.savefig(p_path, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        pdf.image(p_path, x=15, y=y_charts, w=85, h=55)
        if os.path.exists(p_path): os.remove(p_path)
        
        # Right: Bar
        fig_b, ax_b = plt.subplots(figsize=(4, 3), dpi=150, facecolor='white')
        safe_lbls = [safe_text(str(l))[:15] for l in labels[:5]]
        ax_b.barh(range(len(articles[:5])), articles[:5], color='#6366f1', edgecolor='white')
        ax_b.set_yticks(range(len(safe_lbls)))
        ax_b.set_yticklabels(safe_lbls, fontsize=7)
        ax_b.set_title('Article Count', fontsize=9, fontweight='bold')
        ax_b.invert_yaxis()
        ax_b.spines['top'].set_visible(False)
        ax_b.spines['right'].set_visible(False)
        plt.tight_layout()
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp: b_path = tmp.name
        plt.savefig(b_path, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        pdf.image(b_path, x=110, y=y_charts, w=85, h=50)
        if os.path.exists(b_path): os.remove(b_path)
        pdf.ln(7)

        # Table
        pdf.set_y(y_charts + 58)
        table_rows = [[safe_text(cat.get("category_name", "Unknown")[:15]), str(safe_number(cat.get("total_articles"), 0)), str(scores[i])] for i, cat in enumerate(categories[:8])]
        add_compact_table(pdf, ['Category', 'Articles', 'Score %'], table_rows, 'Category Details')
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp: output_path = tmp.name
        pdf.output(output_path)
        return FileResponse(path=output_path, filename="impact_report.pdf", media_type='application/pdf')
    except HTTPException: 
        raise
    except Exception as e:
        print("Error:", e)
        raise HTTPException(500, "PDF failed: " + str(e))

@router.get("/admin/reports/activity/pdf")
async def generate_activity_report():
    try:
        res = supabase.from_("admin_recent_activity").select("*").order("created_at", desc=True).limit(50).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(404, "No activity data")
        
        pdf = AdminPDF()
        pdf.add_page()
        
        pdf.set_font('Arial', 'B', 12)
        pdf.set_text_color(30, 58, 138)
        pdf.cell(0, 6, 'Activity Dashboard', 0, 1, 'C')
        pdf.ln(6)
        
        activities = res.data
        types = [safe_text(a.get("activity_type", "unknown")).title() for a in activities]
        type_counts = Counter(types)
        
        y_charts = pdf.get_y()
        
        # Left: Pie
        labels = list(type_counts.keys())
        values = list(type_counts.values())
        fig_p, ax_p = plt.subplots(figsize=(4.5, 4.5), dpi=150, facecolor='white')
        wedges, texts, autotexts = ax_p.pie(
            values, 
            labels=[safe_text(l)[:10] for l in labels], 
            autopct='%1.0f%%', 
            colors=['#6366f1', '#10b981', '#f59e0b', '#ef4444'], 
            wedgeprops=dict(width=0.5, edgecolor='white', linewidth=2),
            startangle=90
        )
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')
            autotext.set_fontsize(10)
        for text in texts:
            text.set_color('#1e293b')
            text.set_fontweight('bold')
            text.set_fontsize(9)
        ax_p.set_title('Activity Types', fontsize=10, fontweight='bold', pad=15)
        plt.tight_layout()
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp: p_path = tmp.name
        plt.savefig(p_path, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        pdf.image(p_path, x=15, y=y_charts, w=85, h=55)
        if os.path.exists(p_path): os.remove(p_path)
        
        # Right: Stats Text Chart
        fig_t, ax_t = plt.subplots(figsize=(4, 3), dpi=150, facecolor='white')
        ax_t.axis('off')
        for i, (lbl, val) in enumerate(type_counts.most_common(4)):
            ax_t.text(0.5, 0.8 - (i*0.15), f"{lbl}: {val}", ha='center', fontsize=9, fontweight='bold', color='#1e293b')
        ax_t.set_ylim(0, 1)
        ax_t.set_title('Top Activities', fontsize=9, fontweight='bold')
        plt.tight_layout()
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp: t_path = tmp.name
        plt.savefig(t_path, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        pdf.image(t_path, x=110, y=y_charts, w=85, h=50)
        if os.path.exists(t_path): os.remove(t_path)
        pdf.ln(7)

        # Table
        pdf.set_y(y_charts + 58)
        table_rows = [[act, str(count), f"{(count/len(activities)*100):.1f}%"] for act, count in type_counts.most_common(8)]
        add_compact_table(pdf, ['Type', 'Count', 'Ratio'], table_rows, 'Activity Breakdown')
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp: output_path = tmp.name
        pdf.output(output_path)
        return FileResponse(path=output_path, filename="activity_report.pdf", media_type='application/pdf')
    except HTTPException: 
        raise
    except Exception as e:
        print("Error:", e)
        raise HTTPException(500, "PDF failed: " + str(e))

@router.get("/admin/reports/feedback/pdf")
async def generate_feedback_report():
    try:
        res = supabase.from_("admin_feedback_summary").select("*").order("edition", desc=True).limit(10).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(404, "No feedback data")
        
        pdf = AdminPDF()
        pdf.add_page()
        
        pdf.set_font('Arial', 'B', 12)
        pdf.set_text_color(30, 58, 138)
        pdf.cell(0, 6, 'Feedback Dashboard', 0, 1, 'C')
        pdf.ln(6)
        
        feedback_data = res.data
        editions = [f"Ed. {safe_number(f.get('edition'), i+1)}" for i, f in enumerate(feedback_data)]
        likes = [safe_number(f.get("likes"), 0) for f in feedback_data]
        dislikes = [safe_number(f.get("dislikes"), 0) for f in feedback_data]
        comments = [safe_number(f.get("comments"), 0) for f in feedback_data]
        
        total_likes = sum(likes)
        total_dislikes = sum(dislikes)
        
        y_charts = pdf.get_y()
        
        # Left: Grouped Bar
        fig_b, ax_b = plt.subplots(figsize=(4, 3), dpi=150, facecolor='white')
        x = range(len(editions[:6]))
        width = 0.35
        safe_lbls = [safe_text(str(l))[:8] for l in editions[:6]]
        ax_b.bar([i - width/2 for i in x], likes[:6], width, color='#10b981', edgecolor='white')
        ax_b.bar([i + width/2 for i in x], dislikes[:6], width, color='#ef4444', edgecolor='white')
        ax_b.set_xticks(x)
        ax_b.set_xticklabels(safe_lbls, fontsize=7)
        ax_b.set_title('Likes vs Dislikes', fontsize=9, fontweight='bold')
        ax_b.spines['top'].set_visible(False)
        ax_b.spines['right'].set_visible(False)
        plt.tight_layout()
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp: b_path = tmp.name
        plt.savefig(b_path, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        pdf.image(b_path, x=15, y=y_charts, w=85, h=50)
        if os.path.exists(b_path): os.remove(b_path)
        
        # Right: Pie
        fig_p, ax_p = plt.subplots(figsize=(4.5, 4.5), dpi=150, facecolor='white')
        wedges, texts, autotexts = ax_p.pie(
            [total_likes, total_dislikes], 
            labels=['Likes', 'Dislikes'], 
            autopct='%1.0f%%', 
            colors=['#10b981', '#ef4444'], 
            wedgeprops=dict(width=0.5, edgecolor='white', linewidth=2),
            startangle=90
        )
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')
            autotext.set_fontsize(10)
        for text in texts:
            text.set_color('#1e293b')
            text.set_fontweight('bold')
            text.set_fontsize(9)
        ax_p.set_title('Sentiment', fontsize=10, fontweight='bold', pad=15)
        plt.tight_layout()
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp: p_path = tmp.name
        plt.savefig(p_path, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        pdf.image(p_path, x=110, y=y_charts, w=85, h=55)
        if os.path.exists(p_path): os.remove(p_path)
        pdf.ln(7)

        # Table
        pdf.set_y(y_charts + 58)
        table_rows = []
        for i, fb in enumerate(feedback_data[:8]):
            eid = safe_number(fb.get('edition'), i+1)
            l = safe_number(fb.get("likes"), 0)
            d = safe_number(fb.get("dislikes"), 0)
            c = safe_number(fb.get("comments"), 0)
            rate = (l / (l + d) * 100) if (l + d) > 0 else 0
            table_rows.append([f"Ed. {eid}", str(l), str(d), str(c), f"{rate:.0f}%"])
        
        add_compact_table(pdf, ['Edition', 'Likes', 'Dislikes', 'Cmts', 'Appr'], table_rows, 'Edition Details')
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp: output_path = tmp.name
        pdf.output(output_path)
        return FileResponse(path=output_path, filename="feedback_report.pdf", media_type='application/pdf')
    except HTTPException: 
        raise
    except Exception as e:
        print("Error:", e)
        raise HTTPException(500, "PDF failed: " + str(e))
