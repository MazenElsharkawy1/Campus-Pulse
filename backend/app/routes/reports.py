# main.py - Campus Pulse Backend API (Clean Version)
import os
import matplotlib.pyplot as plt
from fastapi import APIRouter, FastAPI, HTTPException, responses
from supabase import create_client, Client
from fpdf import FPDF
from datetime import datetime
import arabic_reshaper
from bidi.algorithm import get_display
import tempfile
import re

# ============================================================
# CONFIGURATION
# ============================================================
SB_URL = "https://imlydashdkziznmjhfgy.supabase.co"
SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbHlkYXNoZGt6aXpubWpoZmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTI2MDEsImV4cCI6MjA4NTg2ODYwMX0.MR0PyzmIwXlz06HOhyZt9dYypL9BV4YboVqbpuEAF-8"

supabase: Client = create_client(SB_URL, SB_KEY)
router = APIRouter(prefix="/api/reports", tags=["Reports"])



# ============================================================
# HELPERS
# ============================================================
def remove_emojis(text: str) -> str:
    """Remove emojis and non-PDF-safe Unicode characters"""
    if not text:
        return ""
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "]+", 
        flags=re.UNICODE
    )
    return emoji_pattern.sub('', str(text)).strip()

def clean_text_for_pdf(text):
    """Clean text from unsupported characters"""
    if not text:
        return ""
    text = str(text).strip()
    if text.lower() in ('none', 'null', 'undefined', ''):
        return ""
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    return text

def fix_ar(text):
    """Fix Arabic text rendering for PDF"""
    cleaned = remove_emojis(clean_text_for_pdf(text))
    if not cleaned: 
        return ""
    try: 
        reshaped = arabic_reshaper.reshape(cleaned)
        return get_display(reshaped)
    except Exception as e:
        print(f"[fix_ar] Error: {e}")
        return cleaned

def is_number(n):
    try: 
        float(n)
        return True
    except: 
        return False

def get_logo_path(name):
    for p in [os.path.join(os.path.dirname(__file__), 'static', 'profiles', name),
              os.path.join(os.getcwd(), 'app', 'static', 'profiles', name)]:
        if os.path.exists(p): 
            return p
    return None

def get_font_path():
    """Find and validate Amiri font file"""
    font_names = ['Amiri-Regular.ttf', 'amiri-regular.ttf', 'Amiri.ttf', 'amiri.ttf']
    possible_dirs = [
        os.path.join(os.path.dirname(__file__), 'assets'),
        os.path.join(os.getcwd(), 'assets'),
        os.path.join(os.getcwd(), 'backend', 'assets'),
    ]
    for dir_path in possible_dirs:
        for font_name in font_names:
            font_path = os.path.join(dir_path, font_name)
            if os.path.exists(font_path):
                try:
                    if os.path.getsize(font_path) > 100000:
                        return font_path
                except:
                    pass
    return None

# ============================================================
# QUERY METADATA (FOR QUERIES ONLY - Shows Designation Section)
# ============================================================
QUERY_METADATA = {
    'dormant_articles_report': {
        'designation': "Published Unopened Articles Registry",
        'objective': (
            "Identify published articles that have never been opened by any user, "
            "categorized for content review or archival"
        ),
        'logic': {
            'input': (
                "Articles table (filtered by published status), "
                "Newsletter_Articles table with is_opened flag, Categories table"
            ),
            'processing': (
                "Left join articles with newsletter_articles, join categories for naming,"
                "filter where is_opened IS NULL OR FALSE and status = 'published',"
                "apply SELECT DISTINCT to ensure unique records"
            ),
            'output': (
                "Distinct list of unopened published articles with article_id, "
                "category_id, and category_name for audit workflows"
            )
        },
        'tags': ["Content-Audit", "Engagement-Gap", "Archive"]
    },
    'students_interests_by_faculty': {
        'designation': "Faculty-Based Interest Mapper",
        'objective': (
            "Map student category preferences grouped by their faculty affiliation "
            "for targeted content strategy"
        ),
        'logic': {
            'input': "Users table, User_Preferences table, Categories table",
            'processing': (
                "Join users with preferences and categories, select student details "
                "with interest categories and scores, order by faculty and name"
            ),
            'output': (
                "Student records with faculty, interest_category, and category_score "
                "for academic segmentation"
            )
        },
        'tags': ["Preferences", "Faculty", "Interest-Mapping"]
    },
    'recommended_articles': {
        'designation': "AI-Powered Article Recommender",
        'objective': (
            "Suggest personalized articles to users based on category preferences, "
            "excluding already-viewed content"
        ),
        'logic': {
            'input': (
                "Articles, Categories, User_Preferences, Newsletter_Articles tables, "
                "JWT auth context"
            ),
            'processing': (
                "Join articles with user preferences by category, exclude opened "
                "articles via Newsletter_Articles, filter by category_score, "
                "authenticate via auth.jwt(), sort by relevance and date"
            ),
            'output': (
                "Personalized article list with user_id, article_id, category_name, "
                "and published_at for the authenticated user"
            )
        },
        'tags': ["AI", "Personalization", "Recommendations"]
    },
    'my_reactions_history': {
        'designation': "Personal Reaction Timeline",
        'objective': (
            "Display a chronological history of all feedback reactions submitted "
            "by the current user"
        ),
        'logic': {
            'input': "Feedback table, Newsletters table",
            'processing': (
                "Join feedback with newsletters, select user_id, created_at, "
                "reaction, and newsletter_id, order by created_at descending"
            ),
            'output': (
                "User reaction records with timestamp, reaction type, and "
                "associated newsletter for personal activity tracking"
            )
        },
        'tags': ["Personal", "History", "Feedback-Log"]
    },
    'dormant_students_report': {
        'designation': "Inactive Student Identifier",
        'objective': (
            "Find students who joined over 30 days ago but have never submitted "
            "feedback or written queries for re-engagement campaigns"
        ),
        'logic': {
            'input': "Users table, Feedback table, Queries table",
            'processing': (
                "Left join users with feedback and queries, filter users with NULL "
                "in both joins AND joined_at < CURRENT_DATE - 30 days, group by "
                "user fields"
            ),
            'output': (
                "List of inactive students with user_id, full_name, faculty, and "
                "joined_at for retention outreach"
            )
        },
        'tags': ["Retention", "Inactivity", "Student-Engagement"]
    },
    'articles_detailed': {
        'designation': "Published Article Registry",
        'objective': (
            "List all published articles with their category and publisher "
            "information for content management"
        ),
        'logic': {
            'input': "Articles table, Categories table, Users table (for publisher)",
            'processing': (
                "Join articles with categories and left join with users on "
                "university_media_adviser, filter by status='published'"
            ),
            'output': (
                "Article details with article_id, status, published_at, "
                "category_name, and publisher_name for editorial oversight"
            )
        },
        'tags': ["Content-Registry", "Published", "Management"]
    },
    'interested_but_not_opened': {
        'designation': "Latent Interest Retargeting Engine",
        'objective': (
            "Find users with high category interest scores who haven't opened "
            "relevant published articles for targeted re-engagement"
        ),
        'logic': {
            'input': (
                "User_Preferences, Users, Categories, Articles, "
                "Newsletter_Articles tables"
            ),
            'processing': (
                "Join preference data with articles by category, filter "
                "category_score > 5 AND (is_opened = FALSE OR NULL), include only "
                "published articles"
            ),
            'output': (
                "User names and emails with category_name for behavioral "
                "retargeting campaigns"
            )
        },
        'tags': ["Retargeting", "Conversion", "Behavioral-Insights"]
    },
    'pending_articles': {
        'designation': "Priority Content Manager",
        'objective': (
            "Retrieve all articles marked with 'pinned' status for featured display "
            "in homepage or priority sections"
        ),
        'logic': {
            'input': "Articles table with status field",
            'processing': "Simple filter query where status equals 'pinned'",
            'output': "Article IDs with pinned status for featured content curation"
        },
        'tags': ["Featured", "Priority", "Content-Curation"]
    },
    'students_only': {
        'designation': "Student Population Filter",
        'objective': (
            "Isolate all users with the 'student' role from the general user base "
            "for student-specific analytics"
        ),
        'logic': {
            'input': "Users table, Roles table with role assignments",
            'processing': (
                "Join users with roles table, filter where role name equals 'student'"
            ),
            'output': (
                "Student records with user_id, full_name, email, faculty, and "
                "joined_at for demographic analysis"
            )
        },
        'tags': ["Segmentation", "User-Filter", "Demographics"]
    },
    'user_preferences_ranked': {
        'designation': "User Preference Intelligence",
        'objective': (
            "Display all user category preferences sorted by interest strength "
            "for personalization insights"
        ),
        'logic': {
            'input': "Users table, User_Preferences table, Categories table",
            'processing': (
                "Join all three tables, select user name with preferred category "
                "and subscription date, order by category_score descending with "
                "nulls last"
            ),
            'output': (
                "Ranked list of user preferences with full_name, preferred_category, "
                "subscribed_at, and category_score"
            )
        },
        'tags': ["Preferences", "Ranking", "User-Insights"]
    },
    'stakeholder_access_list': {
        'designation': "Stakeholder Permission Registry",
        'objective': (
            "List all reports that each stakeholder is authorized to access with "
            "assignment dates for compliance auditing"
        ),
        'logic': {
            'input': "Stakeholders table, report_permissions table",
            'processing': (
                "Join stakeholders with report_permissions on stakeholder_id, "
                "select stakeholder details with allowed report names and "
                "assignment timestamps"
            ),
            'output': (
                "Permission records with stakeholder_name, supervisor_name, "
                "allowed_report, and assigned_at for access governance"
            )
        },
        'tags': ["Permissions", "Access-Control", "Compliance"]
    }
}
# ============================================================
# PDF CLASS - Clean Design
# ============================================================
class ProfessionalPDF(FPDF):
    def __init__(self):
        super().__init__()
        font_path = get_font_path()
        self.has_amiri = False
        if font_path:
            try:
                self.add_font('Amiri', '', font_path, uni=True)
                self.add_font('Amiri', 'B', font_path, uni=True)
                self.add_font('Amiri', 'I', font_path, uni=True)
                self.has_amiri = True
                self.set_font('Amiri', '', 10)
            except:
                self.has_amiri = False
                self.set_font('Arial', '', 10)
        else:
            self.has_amiri = False
            self.set_font('Arial', '', 10)

    def header(self):
        self.set_draw_color(220, 220, 220)
        self.set_line_width(0.2)
        self.rect(10, 10, 190, 277)
        for name, x in [('logoL.jpeg', 12), ('logoR.jpeg', 95), ('logoC.jpeg', 175)]:
            p = get_logo_path(name)
            if p:
                try: 
                    h = 18 if name == 'logoR.jpeg' else 14
                    self.image(p, x=x, y=12, h=h)
                except: 
                    pass
        self.set_draw_color(243, 156, 18)
        self.set_line_width(0.8)
        self.line(18, 32, 188, 32)
        self.ln(15)
                
    def footer(self):
        self.set_y(-25) 
        fn = 'Amiri' if self.has_amiri else 'Arial'
        try:
            self.set_font(fn, 'I', 8)
        except:
            self.set_font('Arial', 'I', 8)
        self.set_text_color(160, 160, 160)
        self.set_x(15)
        self.cell(90, 10, "CampusPulse System", 0, 0, "L")
        self.set_x(-35)
        self.cell(20, 10, f"Page {self.page_no()}", 0, 0, "R")

# ============================================================
# DESIGNATION SECTION (QUERIES ONLY)
# ============================================================
def add_designation_section(pdf, view_name):
    """Add designation section WITHOUT View SQL button - ONLY for queries"""
    meta = QUERY_METADATA.get(view_name)
    if not meta:
        return
    
    fn = 'Amiri' if getattr(pdf, 'has_amiri', False) else 'Arial'
    
    if pdf.get_y() + 75 > 260:
        pdf.add_page()
        pdf.ln(20)
    
    # ==========================================
    # 🎯 DESIGNATION HEADER
    # ==========================================
    pdf.set_fill_color(239, 246, 255)
    pdf.set_draw_color(219, 234, 254)
    pdf.rect(15, pdf.get_y(), 180, 12, 'FD')
    
    try:
        pdf.set_font(fn, 'B', 13)
    except:
        pdf.set_font('Arial', 'B', 13)
    pdf.set_text_color(15, 23, 42)
    pdf.set_xy(18, pdf.get_y() + 3)
    pdf.cell(0, 6, fix_ar(meta['designation']), ln=False)
    pdf.ln(10)
    
    # Query Name
    try:
        pdf.set_font(fn, 'I', 8)
    except:
        pdf.set_font('Arial', 'I', 8)
    pdf.set_text_color(37, 99, 235)
    pdf.set_x(18)
    pdf.cell(0, 4, fix_ar(view_name), ln=True)
    pdf.ln(2)
    
    # ==========================================
    # 📋 OBJECTIVE SECTION
    # ==========================================
    pdf.set_fill_color(255, 251, 235)
    pdf.set_draw_color(254, 243, 199)
    pdf.rect(15, pdf.get_y(), 180, 10, 'FD')
    
    try:
        pdf.set_font(fn, 'B', 9)
    except:
        pdf.set_font('Arial', 'B', 9)
    pdf.set_text_color(234, 88, 12)
    pdf.set_xy(18, pdf.get_y() + 3)
    pdf.cell(0, 4, "Objective", ln=False)
    pdf.ln(7)
    
    try:
        pdf.set_font(fn, '', 9)
    except:
        pdf.set_font('Arial', '', 9)
    pdf.set_text_color(71, 85, 105)
    pdf.set_x(18)
    pdf.multi_cell(0, 6, fix_ar(meta['objective']))
    pdf.ln(4)
    
    # ==========================================
    # ⚙️ HOW IT WORKS SECTION
    # ==========================================
    pdf.set_fill_color(249, 250, 251)
    pdf.set_draw_color(229, 231, 235)
    pdf.rect(15, pdf.get_y(), 180, 8, 'FD')
    
    try:
        pdf.set_font(fn, 'B', 8)
    except:
        pdf.set_font('Arial', 'B', 8)
    pdf.set_text_color(100, 116, 139)
    pdf.set_xy(18, pdf.get_y() + 2)
    pdf.cell(0, 4, "HOW IT WORKS", ln=False)
    pdf.ln(7)
    
    logic = meta.get('logic', {})
    
    # IN
    pdf.set_fill_color(209, 250, 229)
    pdf.set_draw_color(167, 243, 208)
    pdf.rect(18, pdf.get_y(), 8, 6, 'FD')
    pdf.set_text_color(22, 101, 52)
    pdf.set_xy(19, pdf.get_y() + 2)
    pdf.cell(6, 4, "IN", 0, 0, 'C')
    
    pdf.set_x(28)
    pdf.set_text_color(71, 85, 105)
    try:
        pdf.set_font(fn, '', 7)
    except:
        pdf.set_font('Arial', '', 7)
    pdf.cell(50, 6, fix_ar(logic.get('input', 'N/A')), 0, 0, 'L')
    
    pdf.ln(6)
    
    # PROCESSING
    pdf.set_fill_color(254, 243, 199)
    pdf.set_draw_color(253, 224, 71)
    pdf.rect(18, pdf.get_y(), 8, 6, 'FD')
    pdf.set_text_color(161, 98, 7)
    pdf.set_xy(19, pdf.get_y() + 2)
    pdf.cell(6, 4, "PROC", 0, 0, 'C')
    
    pdf.set_x(28)
    pdf.set_text_color(71, 85, 105)
    try:
        pdf.set_font(fn, 'B', 7)
    except:
        pdf.set_font('Arial', 'B', 7)
    pdf.cell(50, 6, fix_ar(logic.get('processing', 'N/A')), 0, 0, 'L')
    
    pdf.ln(6)
    
    # OUT
    pdf.set_fill_color(233, 213, 255)
    pdf.set_draw_color(216, 180, 254)
    pdf.rect(18, pdf.get_y(), 8, 6, 'FD')
    pdf.set_text_color(107, 33, 168)
    pdf.set_xy(19, pdf.get_y() + 2)
    pdf.cell(6, 4, "OUT", 0, 0, 'C')
    
    pdf.set_x(28)
    pdf.set_text_color(71, 85, 105)
    try:
        pdf.set_font(fn, '', 7)
    except:
        pdf.set_font('Arial', '', 7)
    pdf.cell(50, 6, fix_ar(logic.get('output', 'N/A')), 0, 1, 'L')
    
    pdf.ln(5)
    
    # ==========================================
    # 🏷️ TAGS
    # ==========================================
    tags = meta.get('tags', [])
    if tags:
        try:
            pdf.set_font(fn, 'I', 7)
        except:
            pdf.set_font('Arial', 'I', 7)
        pdf.set_text_color(100, 116, 139)
        pdf.set_x(18)
        tags_text = "  ".join([f"#{tag}" for tag in tags])
        pdf.cell(0, 4, fix_ar(tags_text), ln=True)
    
    pdf.ln(5)

# ============================================================
# DB & ANALYSIS
# ============================================================
async def get_data_from_db(view_name: str):
    print(f"[get_data_from_db] Looking for: {view_name}")
    try:
        q = supabase.table("queries").select("query_text").eq("query_name", view_name).execute()
        if q.data and len(q.data) > 0 and q.data[0].get("query_text"):
            print("[get_data_from_db] Found SQL in queries table")
            sql_query = q.data[0]["query_text"]
            try:
                result = supabase.rpc("execute_sql", {"sql_query": sql_query}).execute()
                if result.data:
                    return result.data
            except Exception as e:
                print(f"[get_data_from_db] RPC failed: {e}")
        
        print(f"[get_data_from_db] Trying direct table: {view_name}")
        result = supabase.table(view_name).select("*").limit(1000).execute()
        if result.data:
            return result.data
        return []
    except Exception as e:
        print(f"[get_data_from_db] DB Error: {e}")
        return []

def smart_analysis(view_name, labels, values):
    if not values or len(values) == 0: 
        return "No sufficient data for smart analysis."
    top_idx = values.index(max(values))
    top_item = labels[top_idx]
    total = sum(values)
    avg = total / len(values)
    analysis = f"Based on the data for {view_name.replace('_', ' ')}, the top performing item is '{top_item}' "
    analysis += f"with a value of {values[top_idx]}. The total sum across all items is {total}, "
    analysis += f"averaging approximately {avg:.2f} per entry. "
    if values[top_idx] > avg * 1.5:
        analysis += "This indicates a significant lead for the top item compared to the average."
    else:
        analysis += "The distribution appears relatively balanced across the top entries."
    return analysis

def draw_chart(fig, ax, chart_type, vals, labs, colors, fix_ar_func):
    if chart_type == 'bar':
        bars = ax.bar(range(len(vals)), vals, color=colors[:len(vals)], edgecolor='white', width=0.65, linewidth=1.5)
        for i, v in enumerate(vals): 
            ax.text(i, v+0.1, str(int(v)), ha='center', fontsize=8, color='#475569', fontweight='bold')
        ax.set_xticks(range(len(labs)))
        ax.set_xticklabels([fix_ar_func(l) for l in labs], rotation=30, fontsize=7, ha='right')
        ax.tick_params(axis='y', labelsize=7)
        ax.grid(axis='y', linestyle=':', alpha=0.3)
    else:
        ax.pie(vals, labels=[fix_ar_func(l)[:12] for l in labs], autopct='%1.1f%%', startangle=90,
              colors=colors[:len(vals)], wedgeprops={'linewidth': 1.5, 'edgecolor': '#ffffff'},
              textprops={'fontsize': 7, 'color': '#ffffff', 'fontweight': 'bold'})
        ax.legend(loc='center left', bbox_to_anchor=(1, 0.5), fontsize=7, frameon=False)
        ax.axis('equal')

# ============================================================
# API ENDPOINTS
# ============================================================

@router.get("/api/debug/views")
async def debug_views():
    try:
        q = supabase.table("queries").select("query_name").execute()
        queries = [item['query_name'] for item in (q.data or [])]
        return {
            "available_queries": queries,
            "standard_queries": list(QUERY_METADATA.keys()),
            "note": "Use these exact names in /api/report-data/{view_name}"
        }
    except Exception as e:
        return {"error": str(e), "queries": []}

@router.get("/api/report-data/{view_name}")
async def get_report_data(view_name: str):
    data = await get_data_from_db(view_name)
    return data if data else []

@router.get("/api/generate-pdf/{view_name}")
async def generate_pdf(view_name: str, include: str = "table,bar,pie", comment: str = ""):
    try:
        data = await get_data_from_db(view_name)
        
        # NO SAMPLE DATA - Return error PDF if no data
        if not data or (isinstance(data, list) and len(data) == 0):
            pdf = ProfessionalPDF()
            pdf.add_page()
            fn = 'Amiri' if pdf.has_amiri else 'Arial'
            pdf.ln(50)
            try:
                pdf.set_font(fn, 'B', 14)
            except:
                pdf.set_font('Arial', 'B', 14)
            pdf.set_text_color(220, 50, 50)
            pdf.cell(0, 10, fix_ar("No data available for this report"), ln=True, align='C')
            pdf.ln(10)
            try:
                pdf.set_font(fn, '', 10)
            except:
                pdf.set_font('Arial', '', 10)
            pdf.set_text_color(100, 116, 139)
            pdf.multi_cell(0, 8, fix_ar(f"Query: {view_name}\nAttempted: {datetime.now().strftime('%Y-%m-%d %H:%M')}"), align='C')
            
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
                output_path = tmp.name
            pdf.output(output_path)
            return responses.FileResponse(
                path=output_path,
                filename=f"{view_name}_NoData.pdf",
                media_type='application/pdf'
            )
        
        if not isinstance(data, list):
            raise HTTPException(404, detail=f"No valid data found for view: {view_name}")
        
        pdf = ProfessionalPDF()
        pdf.add_page()
        fn = 'Amiri' if pdf.has_amiri else 'Arial'
        colors = ['#132B47', '#557669', '#6B8091', '#8C8A95', '#C59EA2', '#C97A53', '#673625', '#C9A875', '#BAA39D']

        # TITLE
        pdf.ln(19)
        try:
            pdf.set_font('Arial', 'B', 16)
        except:
            pdf.set_font('Arial', 'B', 16)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(0, 8, fix_ar(f"{view_name.replace('_', ' ').upper()}"), ln=True, align='C')
        pdf.ln(9)

        # DESIGNATION SECTION - ONLY FOR QUERIES IN QUERY_METADATA
        if view_name in QUERY_METADATA:
            add_designation_section(pdf, view_name)
        
        pdf.ln(3)

        # DATA PREP
        keys = list(data[0].keys())
        lk = next((k for k in keys if any(x in k.lower() for x in ['name', 'title', 'category', 'faculty', 'id'])), keys[0])
        vk = next((k for k in keys if k != lk and is_number(data[0].get(k))), keys[1] if len(keys) > 1 else keys[0])

        subset = data[:8]
        labs = [str(r.get(lk, ''))[:12] for r in subset if isinstance(r, dict)]
        vals = [float(r.get(vk, 0)) if is_number(r.get(vk)) else 0 for r in subset if isinstance(r, dict)]

        opts = [x.strip().lower() for x in include.split(',')]
        show_bar = 'bar' in opts and sum(vals) > 0
        show_pie = 'pie' in opts and sum(vals) > 0
        show_table = 'table' in opts

        # CHARTS
        if show_bar or show_pie:
            plt.close('all')

            def save_and_place_chart(fig, w, h):
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                    chart_path = tmp.name
                plt.savefig(chart_path, dpi=200, bbox_inches='tight', facecolor='white')
                plt.close()
                if pdf.get_y() + h + 10 > 260:
                    pdf.add_page()
                y_start = pdf.get_y()
                x_start = (210 - w) / 2
                pdf.image(chart_path, x=x_start, y=y_start, w=w, h=h)
                pdf.set_draw_color(30, 58, 138)
                pdf.set_line_width(0.4)
                pdf.rect(x_start - 2, y_start - 1, w + 4, h + 2)
                if os.path.exists(chart_path): os.remove(chart_path)
                pdf.set_y(y_start + h + 4)

            if show_bar and show_pie:
                fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(9, 3.5), dpi=200, facecolor='white')
                n = len(vals)
                ax1.set_xlim(-0.5, max(n - 0.5, 2))
                bars = ax1.bar(range(n), vals, width=0.5, color=colors[:n], edgecolor='white', linewidth=1.5)
                for bar in bars:
                    h = bar.get_height()
                    ax1.text(bar.get_x() + bar.get_width()/2, h + 0.05, f'{int(h)}', ha='center', va='bottom', fontsize=8, fontweight='bold', color='#334155')
                ax1.set_xticks(range(n))
                ax1.set_xticklabels([fix_ar(l) for l in labs], rotation=30, fontsize=7, ha='right')
                try:
                    pdf.set_font(fn, '', 8)
                except:
                    pdf.set_font('Arial', '', 8)
                pdf.set_text_color(71, 85, 105)
                ax1.set_xlabel(fix_ar(lk.replace('_', ' ').title()), fontsize=8, color='#475569', fontweight='bold', labelpad=3)
                ax1.set_ylabel(fix_ar(vk.replace('_', ' ').title()), fontsize=8, color='#475569', fontweight='bold', labelpad=3)
                if n > 0 and max(vals) > 0: ax1.set_ylim(0, max(vals) * 1.25)
                else: ax1.set_ylim(0, 2)
                ax1.tick_params(axis='y', labelsize=7)
                ax1.grid(axis='y', linestyle=':', alpha=0.3, color='#cbd5e1')
                ax1.spines['top'].set_visible(False)
                ax1.spines['right'].set_visible(False)
                ax1.spines['left'].set_color('#e2e8f0')
                ax1.spines['bottom'].set_color('#e2e8f0')
                draw_chart(fig, ax2, 'pie', vals, labs, colors, fix_ar)
                plt.tight_layout()
                save_and_place_chart(fig, 180, 75)
            elif show_bar:
                fig, ax = plt.subplots(figsize=(6, 3.5), dpi=200, facecolor='white')
                n = len(vals)
                ax.set_xlim(-0.5, max(n - 0.5, 2))
                bars = ax.bar(range(n), vals, width=0.5, color=colors[:n], edgecolor='white', linewidth=1.5)
                for bar in bars:
                    h = bar.get_height()
                    ax.text(bar.get_x() + bar.get_width()/2, h + 0.05, f'{int(h)}', ha='center', va='bottom', fontsize=8, fontweight='bold', color='#334155')
                ax.set_xticks(range(n))
                ax.set_xticklabels([fix_ar(l) for l in labs], rotation=45, fontsize=7, ha='right')
                try:
                    pdf.set_font(fn, '', 8)
                except:
                    pdf.set_font('Arial', '', 8)
                pdf.set_text_color(71, 85, 105)
                ax.set_xlabel(fix_ar(lk.replace('_', ' ').title()), fontsize=8, color='#475569', fontweight='bold', labelpad=5)
                ax.set_ylabel(fix_ar(vk.replace('_', ' ').title()), fontsize=8, color='#475569', fontweight='bold', labelpad=5)
                if n > 0 and max(vals) > 0: ax.set_ylim(0, max(vals) * 1.25)
                else: ax.set_ylim(0, 2)
                ax.tick_params(axis='y', labelsize=7)
                ax.grid(axis='y', linestyle=':', alpha=0.3, color='#cbd5e1')
                ax.spines['top'].set_visible(False)
                ax.spines['right'].set_visible(False)
                ax.spines['left'].set_color('#e2e8f0')
                ax.spines['bottom'].set_color('#e2e8f0')
                plt.tight_layout()
                save_and_place_chart(fig, 150, 75)
            elif show_pie:
                fig, ax = plt.subplots(figsize=(6, 4), dpi=200, facecolor='white')
                draw_chart(fig, ax, 'pie', vals, labs, colors, fix_ar)
                plt.tight_layout()
                save_and_place_chart(fig, 140, 85)

        # TABLE
        if show_table and data:
            pdf.ln(6)
            cols = list(data[0].keys())[:5]
            left_margin = 15
            right_margin = 195
            table_width = right_margin - left_margin
            cw = table_width / len(cols) if cols else 10
            date_cols = [c.lower() for c in cols if any(k in c.lower() for k in ['date', 'time', 'at', 'published', 'created', 'updated'])]
            
            def draw_table_header():
                pdf.set_x(left_margin)
                try:
                    pdf.set_font('Arial', 'B', 8)
                except:
                    pdf.set_font('Arial', 'B', 8)
                pdf.set_text_color(0, 0, 0)
                pdf.set_fill_color(230, 230, 230)
                pdf.set_draw_color(150, 150, 150)
                for c in cols:
                    header = c.replace('_', ' ').upper()
                    pdf.cell(cw, 8, fix_ar(header), 1, 0, 'C', fill=True)
                pdf.ln()
            
            draw_table_header()
            
            try:
                pdf.set_font(fn, '', 8)
            except:
                pdf.set_font('Arial', '', 8)
            pdf.set_text_color(0, 0, 0)
            
            for i, row in enumerate(data):
                if not isinstance(row, dict):
                    continue
                if pdf.get_y() + 10 > 260:
                    pdf.add_page()
                    pdf.ln(15)
                    draw_table_header()
                pdf.set_x(left_margin)
                if i % 2 == 0:
                    pdf.set_fill_color(255, 255, 255)
                else:
                    pdf.set_fill_color(245, 245, 245)
                for c in cols:
                    val = row.get(c, "")
                    txt = str(val) if val is not None else "-"
                    if c.lower() in date_cols and 'T' in txt:
                        try:
                            dt_part = txt.split('T')[0]
                            time_part = txt.split('T')[1].split('+')[0].split('Z')[0][:5]
                            txt = f"{dt_part} {time_part}"
                        except: pass
                    txt = fix_ar(txt)
                    cell_width = cw - 2
                    font_size = 8
                    try:
                        while pdf.get_string_width(txt) > cell_width and font_size > 6:
                            font_size -= 0.5
                            pdf.set_font(fn, '', font_size)
                    except:
                        pass
                    pdf.cell(cw, 8, txt, 1, 0, 'C', fill=True)
                    try:
                        pdf.set_font(fn, '', 8)
                    except:
                        pdf.set_font('Arial', '', 8)
                pdf.ln()
            pdf.ln(5)

        # SMART ANALYSIS - Only if charts are shown
        if (show_bar or show_pie) and sum(vals) > 0:
            pdf.add_page()
            pdf.ln(10)
            try:
                pdf.set_font('Arial', 'B', 12)
            except:
                pdf.set_font('Arial', 'B', 12)
            pdf.set_text_color(243, 156, 18)
            pdf.cell(0, 10, fix_ar("Smart Data Analysis"), ln=True)
            pdf.ln(2)
            try:
                pdf.set_font(fn, '', 10)
            except:
                pdf.set_font('Arial', '', 10)
            pdf.set_text_color(51, 65, 85)
            pdf.multi_cell(0, 7, fix_ar(smart_analysis(view_name, labs, vals)))
            pdf.ln(15)

        # HANDWRITTEN NOTES
        pdf.ln(5)
        try:
            pdf.set_font('Arial', 'B', 11)
        except:
            pdf.set_font('Arial', 'B', 11)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 10, fix_ar("Handwritten Notes"), ln=True)
        pdf.set_draw_color(180, 180, 180) 
        for _ in range(5): 
            pdf.ln(8)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())

        # SIGNATURE & DATE
        pdf.ln(10)
        try:
            pdf.set_font('Arial', 'B', 10)
        except:
            pdf.set_font('Arial', 'B', 10)
        pdf.set_text_color(100, 116, 139)
        dt = datetime.now().strftime("%Y-%m-%d  |  %H:%M")
        pdf.cell(90, 10, fix_ar(f"Issued on: {dt}"), 0, 0, 'L')
        pdf.cell(95, 10, fix_ar("Signature: _______________"), 0, 1, 'R')

        # SAVE & RETURN
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            output_path = tmp.name
        pdf.output(output_path)
        return responses.FileResponse(
            path=output_path,
            filename=f"{view_name}_Report_{datetime.now().strftime('%Y%m%d_time%H%M')}.pdf",
            media_type='application/pdf',
            headers={'Content-Disposition': f'inline; filename="{view_name}_Report.pdf"'}
        )
        
    except Exception as e:
        print(f"[generate_pdf] ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, detail=f"Failed to generate PDF: {str(e)}")
