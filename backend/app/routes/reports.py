import os
import matplotlib.pyplot as plt
from fastapi import APIRouter, HTTPException, responses
from supabase import create_client, Client
from fpdf import FPDF
from datetime import datetime
import arabic_reshaper
from bidi.algorithm import get_display

# 1. تعريف التطبيق
router = APIRouter(prefix="/api/reports", tags=["Reports"])


# 2. تفعيل الـ CORS


# 3. إعدادات Supabase
SB_URL = "https://imlydashdkziznmjhfgy.supabase.co"
SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbHlkYXNoZGt6aXpubWpoZmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTI2MDEsImV4cCI6MjA4NTg2ODYwMX0.MR0PyzmIwXlz06HOhyZt9dYypL9BV4YboVqbpuEAF-8"
supabase: Client = create_client(SB_URL, SB_KEY)

def fix_ar(text):
    if not text or str(text).strip() == "None": return ""
    try:
        reshaped = arabic_reshaper.reshape(str(text))
        return get_display(reshaped)
    except: return str(text)

# --- دالة للتعرف على الأرقام لمنع الـ Server Error ---
def is_number(n):
    try:
        float(n)
        return True
    except:
        return False
# ---------------------------------------------------

def generate_smart_analysis(view_name, labels, values):
    """توليد تحليل ذكي تلقائي بناءً على الأرقام"""
    if not values or len(values) == 0: return "No sufficient data for smart analysis."
    
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

class ProfessionalPDF(FPDF):
    def __init__(self):
        super().__init__()
        font_path = os.path.join('assets', 'Amiri-Regular.ttf')
        if os.path.exists(font_path):
            self.add_font('Amiri', '', font_path)
            self.has_amiri = True
        else: self.has_amiri = False
        
    def header(self):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        logo_l = os.path.join(current_dir, '../logoL.jpeg')
        logo_r = os.path.join(current_dir, '../logoR.jpeg')
        logo_c = os.path.join(current_dir, '../logoC.jpeg')

        try:
            if os.path.exists(logo_l): 
                self.image(logo_l, x=10, y=6, h=18)
            if os.path.exists(logo_r): 
                self.image(logo_r, x=90, y=6, h=22)
            if os.path.exists(logo_c): 
                self.image(logo_c, x=170, y=6, h=18)
        except Exception as e:
            print(f"Error loading logos: {e}")

        # رسم الخط البرتقالي
        self.set_draw_color(243, 156, 18)
        self.set_line_width(0.8)
        self.line(10, 32, 200, 32)
        self.ln(25)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(150)
        footer_text = f"MTI University Smart System - Page {self.page_no()}"
        self.cell(0, 10, footer_text, 0, 0, 'C')

async def get_data_from_db(view_name: str):
    clean_name = view_name.replace("%20", " ")
    try:
        query_record = supabase.table("queries").select("query_text").eq("query_name", clean_name).execute()
        
        if query_record.data and len(query_record.data) > 0:
            sql_query = query_record.data[0]["query_text"]
            res = supabase.rpc("execute_sql", {"sql_query": sql_query}).execute()
            return res.data if res.data else []
        
        res = supabase.table(clean_name).select("*").execute()
        if res.data: 
            return res.data
        else:
            print(f"Warning: '{clean_name}' returned no data.")
    except Exception as e:
        print(f"Database Error for '{clean_name}': {e}")
    return []

@router.get("/api/report-data/{view_name}")
async def get_report_data(view_name: str):
    data = await get_data_from_db(view_name)
    return data if data else []

@router.get("/api/generate-pdf/{view_name}")
async def generate_pdf(view_name: str, include: str = "table,bar,pie", comment: str = ""):
    data = await get_data_from_db(view_name)
    if not data:
        raise HTTPException(status_code=404, detail=f"No data found for view: {view_name}")

    pdf = ProfessionalPDF()
    pdf.add_page()
    f_family = 'Amiri' if pdf.has_amiri else 'Arial'
    
    pdf.set_font('Arial', 'B', 16)
    pdf.set_text_color(44, 62, 80)
    title_text = f"REPORT ANALYSIS: {view_name.replace('_', ' ').upper()}"
    pdf.cell(0, 15, title_text, ln=True, align='C')
    pdf.ln(5)

    keys = list(data[0].keys())
    
    label_key = next((k for k in keys if 'news_id' in k.lower() or 'title' in k.lower() or 'name' in k.lower()), keys[0])
    value_key = next((k for k in keys if is_number(data[0][k]) and k != label_key), keys[1] if len(keys)>1 else keys[0])
    
    subset = data[:6]
    labels_list = [str(r.get(label_key, ''))[:15] for r in subset]
    vals = [float(r.get(value_key, 0)) if is_number(r.get(value_key)) else 0 for r in subset]
    chart_colors = ['#2ecc71', '#e67e22', '#e74c3c', '#3498db', '#9b59b6', '#1abc9c']

    # --- 1. الـ Bar Chart المطور ---
    if 'bar' in include and sum(vals) > 0:
        plt.figure(figsize=(7, 4))
        bar_width = 0.4 if len(vals) < 4 else 0.6
        plt.bar(range(len(vals)), vals, color=chart_colors[:len(vals)], width=bar_width)
        
        plt.xlabel(fix_ar(label_key.replace('_', ' ').title()), fontsize=10, fontweight='bold')
        plt.ylabel(fix_ar(value_key.replace('_', ' ').title()), fontsize=10, fontweight='bold')
        
        plt.xticks(range(len(labels_list)), [fix_ar(l) for l in labels_list], fontsize=9)
        plt.xlim(-0.5, max(len(vals)-0.5, 3.5))
        plt.tight_layout()
        plt.savefig("temp_bar.png", dpi=300)
        plt.close()
        pdf.image("temp_bar.png", x=25, w=160)
        pdf.ln(5)

    # --- 2. الـ Pie Chart ---
    if 'pie' in include and sum(vals) > 0:
        plt.figure(figsize=(6, 5))
        plt.pie(vals, labels=[fix_ar(l) for l in labels_list], autopct='%1.1f%%', startangle=140, 
                colors=chart_colors[:len(vals)], wedgeprops={'linewidth': 3, 'edgecolor': 'white'})
        plt.axis('equal') 
        plt.tight_layout()
        plt.savefig("temp_pie.png", dpi=300)
        plt.close()
        pdf.image("temp_pie.png", x=55, w=100)
        pdf.ln(5)

    # --- 3. الـ Table المطور ---
    if 'table' in include:
        if data and len(data) > 0:
            cols = list(data[0].keys())[:4]
            
            raw_widths = []
            for col in cols:
                w = pdf.get_string_width(str(col)) + 10 
                raw_widths.append(w)

            for row in data:
                for i, col in enumerate(cols):
                    cell_text = str(row.get(col, ""))
                    text_w = pdf.get_string_width(cell_text) + 10
                    if text_w > raw_widths[i]:
                        raw_widths[i] = text_w

            total_required_width = sum(raw_widths)
            page_limit = 190.0
            
            if total_required_width > page_limit:
                ratio = page_limit / total_required_width
                col_widths = [w * ratio for w in raw_widths]
            else:
                col_widths = raw_widths

            # رسم الهيدر مرة واحدة فقط
            pdf.set_font('Arial', 'B', 10)
            pdf.set_fill_color(240, 240, 240)
            pdf.set_draw_color(200, 200, 200)
            for i, c in enumerate(cols):
                pdf.cell(col_widths[i], 10, c.replace('_', ' ').upper(), 1, 0, 'C', fill=True)
            pdf.ln()

            # رسم الصفوف مرة واحدة فقط
            pdf.set_font(f_family, '', 9)
            pdf.set_text_color(50, 50, 50)
            for row in data[:25]:
                max_line_h = 8 
                if pdf.get_y() + max_line_h > 270: pdf.add_page()
                for i, c in enumerate(cols):
                    val = row.get(c, "")
                    text = fix_ar(str(val)) if val is not None and str(val).lower() != "none" else "-"
                    pdf.cell(col_widths[i], max_line_h, text, 1, 0, 'C')
                pdf.ln(max_line_h)
        else:
            pdf.set_font('Arial', 'I', 10)
            pdf.cell(0, 10, "No data available to display in table.", ln=True)

    # --- 4. الـ Smart Analysis & Comments ---
    pdf.ln(10)
    pdf.set_font('Arial', 'B', 11)
    pdf.set_text_color(243, 156, 18)
    pdf.cell(0, 10, "SMART DATA ANALYSIS:", ln=True)
    
    pdf.set_font('Arial', '', 10)
    pdf.set_text_color(0)
    smart_txt = generate_smart_analysis(view_name, labels_list, vals)
    pdf.multi_cell(0, 6, smart_txt)
    
    if comment.strip():
        pdf.ln(5)
        pdf.set_font('Arial', 'B', 11)
        pdf.set_text_color(243, 156, 18)
        pdf.cell(0, 10, "OFFICIAL COMMENT:", ln=True)
        pdf.set_font(f_family, '', 10)
        pdf.set_text_color(0)
        pdf.multi_cell(0, 7, fix_ar(comment.strip()))

    # --- الأسطر الفارغة للكتابة اليدوية ---
    pdf.ln(5)
    pdf.set_font('Arial', 'B', 11)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, "HANDWRITTEN NOTES:", ln=True)
    
    pdf.set_draw_color(180, 180, 180) 
    for _ in range(5): 
        pdf.ln(8)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())

    pdf.ln(10)
    pdf.set_font('Arial', 'B', 10)
    pdf.cell(95, 10, f"Date: {datetime.now().strftime('%Y-%m-%d')}", 0, 0, 'L')
    pdf.cell(95, 10, "Signature: _________________________", 0, 1, 'R')
    
    pdf.output("report.pdf")
    return responses.FileResponse("report.pdf")

