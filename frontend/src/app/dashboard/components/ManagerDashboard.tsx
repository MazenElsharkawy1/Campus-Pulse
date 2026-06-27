'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import Chart from 'chart.js/auto'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import Image from 'next/image'
import { Newspaper, Calendar, Share2, Eye, Users, Activity, Wifi, WifiOff, Info, Database, FileText, Search, Copy, Check, X } from 'lucide-react'

Chart.register(ChartDataLabels)

// ============================================================
// 🔧 API & WS CONFIGURATION
// ============================================================
const API_BASE_URL = "https://rookier-ruffly-maxie.ngrok-free.dev"
const SUPABASE_URL = 'https://imlydashdkziznmjhfgy.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbHlkYXNoZGt6aXpubWpoZmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTI2MDEsImV4cCI6MjA4NTg2ODYwMX0.MR0PyzmIwXlz06HOhyZt9dYypL9BV4YboVqbpuEAF-8'
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY)

const REPORT_DATA_ENDPOINT = '/api/reports/api/report-data'
const GENERATE_PDF_ENDPOINT = '/api/reports/api/generate-pdf'

export const QUERY_METADATA: Record<string, {
  designation: string;
  objective: string;
  logic: { input: string; processing: string; output: string };
  sqlDefinition?: string;
  tags?: string[];
}> = {
  dormant_articles_report: {
    designation: "Published Unopened Articles Registry",
    objective: "Identify published articles that have never been opened by any user, categorized for content review or archival",
    logic: {
      input: "Articles table (filtered by published status), Newsletter_Articles table with is_opened flag, Categories table",
      processing: "Left join articles with newsletter_articles, filter where is_opened IS NULL OR FALSE, join categories for naming, apply DISTINCT to remove duplicates",
      output: "Distinct list of unopened published articles with article_id, category_id, and category_name for audit workflows"
    },
    sqlDefinition: `CREATE OR REPLACE VIEW Dormant_Articles_Report AS
SELECT DISTINCT
    a.article_id,
    a.category_id,
    c.name as "Category Name"
FROM Articles a
LEFT JOIN Newsletter_Articles na ON a.article_id = na.article_id
JOIN categories c ON a.category_id = c.category_id
WHERE (na.is_opened IS NULL OR na.is_opened = FALSE) AND a.status = 'published';`,
    tags: ["Content-Audit", "Engagement-Gap", "Archive"]
  },
  students_interests_by_faculty: {
    designation: "Faculty-Based Interest Mapper",
    objective: "Map student category preferences grouped by their faculty affiliation for targeted content strategy",
    logic: {
      input: "Users table, User_Preferences table, Categories table",
      processing: "Join users with preferences and categories, select student details with interest categories and scores, order by faculty and name",
      output: "Student records with faculty, interest_category, and category_score for academic segmentation"
    },
    sqlDefinition: `CREATE OR REPLACE VIEW Students_Interests_By_Faculty AS
SELECT 
    u.full_name AS student_name,
    u.faculty,
    u.student_id,
    c.name AS interest_category,
    up.category_score
FROM users u
JOIN user_preferences up ON u.user_id = up.user_id
JOIN categories c ON up.category_id = c.category_id
ORDER BY u.faculty, u.full_name;`,
    tags: ["Preferences", "Faculty", "Interest-Mapping"]
  },
  recommended_articles: {
    designation: "AI-Powered Article Recommender",
    objective: "Suggest personalized articles to users based on category preferences, excluding already-viewed content",
    logic: {
      input: "Articles, Categories, User_Preferences, Newsletter_Articles tables, JWT auth context",
      processing: "Join articles with user preferences by category, exclude opened articles via Newsletter_Articles, filter by category_score, authenticate via auth.jwt(), sort by relevance and date",
      output: "Personalized article list with user_id, article_id, category_name, and published_at for the authenticated user"
    },
    sqlDefinition: `CREATE OR REPLACE VIEW recommended_articles AS
SELECT 
    up.user_id,
    a.article_id,
    c.name AS category_name,
    up.category_score,
    a.published_at
FROM Articles a
JOIN Categories c ON a.article_id = c.category_id
JOIN User_Preferences up ON c.category_id = up.category_id
LEFT JOIN Newsletter_Articles na ON a.article_id = na.article_id
LEFT JOIN Newsletters n ON na.newsletter_id = n.newsletter_id AND n.user_id = up.user_id
WHERE (na.is_opened IS NULL OR na.is_opened = FALSE)
AND up.category_score > 0.5
ORDER BY up.category_score DESC, a.published_at DESC;`,
    tags: ["AI", "Personalization", "Recommendations"]
  },
  my_reactions_history: {
    designation: "Personal Reaction Timeline",
    objective: "Display a chronological history of all feedback reactions submitted by the current user",
    logic: {
      input: "Feedback table, Newsletters table",
      processing: "Join feedback with newsletters, select user_id, created_at, reaction, and newsletter_id, order by created_at descending",
      output: "User reaction records with timestamp, reaction type, and associated newsletter for personal activity tracking"
    },
    sqlDefinition: `CREATE OR REPLACE VIEW my_reactions_history AS
SELECT 
    f.user_id,
    f.created_at,
    f.reaction,
    n.newsletter_id
FROM Feedback f
JOIN Newsletters n ON f.newsletter_id = n.newsletter_id
ORDER BY f.created_at DESC;`,
    tags: ["Personal", "History", "Feedback-Log"]
  },
  dormant_students_report: {
    designation: "Inactive Student Identifier",
    objective: "Find students who joined over 30 days ago but have never submitted feedback or written queries for re-engagement campaigns",
    logic: {
      input: "Users table, Feedback table, Queries table",
      processing: "Left join users with feedback and queries, filter users with NULL in both joins AND joined_at < CURRENT_DATE - 30 days, group by user fields",
      output: "List of inactive students with user_id, full_name, faculty, and joined_at for retention outreach"
    },
    sqlDefinition: `CREATE OR REPLACE VIEW Dormant_Students_Report AS
SELECT 
    u.user_id, 
    u.full_name, 
    u.faculty, 
    u.joined_at
FROM Users u
LEFT JOIN Feedback f ON u.user_id = f.user_id
LEFT JOIN Queries q ON u.user_id = q.user_id
WHERE f.feedback_id IS NULL 
  AND q.query_id IS NULL
  AND u.joined_at < CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.user_id, u.full_name, u.faculty, u.joined_at;`,
    tags: ["Retention", "Inactivity", "Student-Engagement"]
  },
  articles_detailed: {
    designation: "Published Article Registry",
    objective: "List all published articles with their category and publisher information for content management",
    logic: {
      input: "Articles table, Categories table, Users table (for publisher)",
      processing: "Join articles with categories and left join with users on university_media_adviser, filter by status='published'",
      output: "Article details with article_id, status, published_at, category_name, and publisher_name for editorial oversight"
    },
    sqlDefinition: `CREATE OR REPLACE VIEW Articles_Detailed AS
SELECT 
    a.article_id,
    a.status,
    a.published_at,
    c.name AS category_name,
    u.full_name AS publisher_name
FROM articles a
JOIN categories c ON a.category_id = c.category_id
LEFT JOIN users u ON a.university_media_adviser = u.user_id
WHERE status = 'published';`,
    tags: ["Content-Registry", "Published", "Management"]
  },
  interested_but_not_opened: {
    designation: "Latent Interest Retargeting Engine",
    objective: "Find users with high category interest scores who haven't opened relevant published articles for targeted re-engagement",
    logic: {
      input: "User_Preferences, Users, Categories, Articles, Newsletter_Articles tables",
      processing: "Join preference data with articles by category, filter category_score > 5 AND (is_opened = FALSE OR NULL), include only published articles",
      output: "User names and emails with category_name for behavioral retargeting campaigns"
    },
    sqlDefinition: `CREATE OR REPLACE VIEW Interested_But_Not_Opened AS
SELECT 
    u.full_name, 
    u.email, 
    c.name AS category_name
FROM user_preferences up
JOIN users u ON up.user_id = u.user_id
JOIN categories c ON up.category_id = c.category_id
JOIN articles a ON c.category_id = a.category_id
LEFT JOIN newsletter_articles na ON (a.article_id = na.article_id AND u.user_id = u.user_id)
WHERE up.category_score > 5
  AND (na.is_opened = FALSE OR na.is_opened IS NULL)
  AND a.status = 'published';`,
    tags: ["Retargeting", "Conversion", "Behavioral-Insights"]
  },
  pending_articles: {
    designation: "Priority Content Manager",
    objective: "Retrieve all articles marked with 'pending' status for featured display in homepage or priority sections",
    logic: {
      input: "Articles table with status field",
      processing: "Simple filter query where status equals 'pending'",
      output: "Article IDs with pending status for featured content curation"
    },
    sqlDefinition: `CREATE OR REPLACE VIEW pending_articles AS
SELECT article_id, status 
FROM articles 
WHERE status = 'pending';`,
    tags: ["Featured", "Priority", "Content-Curation"]
  },
  students_only: {
    designation: "Student Population Filter",
    objective: "Isolate all users with the 'student' role from the general user base for student-specific analytics",
    logic: {
      input: "Users table, Roles table with role assignments",
      processing: "Join users with roles table, filter where role name equals 'student'",
      output: "Student records with user_id, full_name, email, faculty, and joined_at for demographic analysis"
    },
    sqlDefinition: `CREATE OR REPLACE VIEW Students_Only AS
SELECT 
    u.user_id,
    u.full_name,
    u.email,
    u.faculty,
    u.joined_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.role_id
WHERE r.name = 'student';`,
    tags: ["Segmentation", "User-Filter", "Demographics"]
  },
  user_preferences_ranked: {
    designation: "User Preference Intelligence",
    objective: "Display all user category preferences sorted by interest strength for personalization insights",
    logic: {
      input: "Users table, User_Preferences table, Categories table",
      processing: "Join all three tables, select user name with preferred category and subscription date, order by category_score descending with nulls last",
      output: "Ranked list of user preferences with full_name, preferred_category, subscribed_at, and category_score"
    },
    sqlDefinition: `CREATE OR REPLACE VIEW User_Preferences_Ranked AS
SELECT 
    u.full_name, 
    c.name AS preferred_category, 
    up.subscribed_at, 
    up.category_score
FROM users u
JOIN user_preferences up ON u.user_id = up.user_id
JOIN categories c ON up.category_id = c.category_id
ORDER BY up.category_score DESC NULLS LAST;`,
    tags: ["Preferences", "Ranking", "User-Insights"]
  },
  stakeholder_access_list: {
    designation: "Stakeholder Permission Registry",
    objective: "List all reports that each stakeholder is authorized to access with assignment dates for compliance auditing",
    logic: {
      input: "Stakeholders table, report_permissions table",
      processing: "Join stakeholders with report_permissions on stakeholder_id, select stakeholder details with allowed report names and assignment timestamps",
      output: "Permission records with stakeholder_name, supervisor_name, allowed_report, and assigned_at for access governance"
    },
    sqlDefinition: `CREATE OR REPLACE VIEW Stakeholder_Access_List AS
SELECT 
    s.name AS stakeholder_name, 
    s.head AS supervisor_name, 
    rp.view_name AS allowed_report, 
    rp.assigned_at
FROM stakeholders s
JOIN report_permissions rp ON s.stakeholder_id = rp.stakeholder_id;`,
    tags: ["Permissions", "Access-Control", "Compliance"]
  }
}


// ============================================================
// 🔧 TYPES
// ============================================================
interface BackendArticle {
  article_id: number; title: string; summary: string; content?: string;
  photo?: string | null; image_url?: string; image?: string; published_at: string;
  category_id?: number | string; category?: string; is_opened: boolean;
  shared: boolean; position: number;
}

interface NewsletterData {
  student_name: string; student_profile_picture?: string; edition: number;
  newsletter_date: string; newsletter_id: number; articles: BackendArticle[];
}

// ============================================================
// 🔧 LISTS & CONFIG
// ============================================================
const noChartReports = ['student_interests', 'dormant_articles_report', 'dormant_students_report', 'my_reactions_history', 'my_activity_summary']

const standardReports = [
  { id: 'faculty_engagement_league', title: 'Faculty Engagement League', icon: 'fa-trophy', num: 1 },
  { id: 'monthly_user_growth', title: 'Monthly User Growth', icon: 'fa-layer-group', num: 2 },
  { id: 'category_popularity', title: 'Category Popularity', icon: 'fa-layer-group', num: 3 },
  { id: 'content_impact_report', title: 'Content Impact Report', icon: 'fa-comments', num: 4 },
  { id: 'monthly_newsletter_simple', title: 'Monthly Publication Volume', icon: 'fa-layer-group', num: 5 },
  { id: 'monthly_feedback_simple', title: 'Overall Engagement Growth Analysis', icon: 'fa-comments', num: 6 },
  { id: 'stakeholder_interaction_gap', title: 'Partner Communication Latency Audit', icon: 'fa-layer-group', num: 7 },
  { id: 'stakeholders_report_count', title: 'Stakeholder Reporting Volume', icon: 'fa-comments', num: 8 },
  { id: 'most_active_category', title: 'Primary News Category Activity', icon: 'fa-layer-group', num: 9 },
  { id: 'monthly_category_activity', title: 'Monthly Categorical Output Summary', icon: 'fa-comments', num: 10 },
  { id: 'top_engaged_newsletters', title: 'High-Impact Newsletter Performance', icon: 'fa-comments', num: 11 },
  { id: 'top_5_rated_newsletters', title: 'Weekly Top-Rated Content Highlights', icon: 'fa-layer-group', num: 12 },
  { id: 'engagement_hourly_pattern', title: 'Peak Student Engagement Hourly Patterns', icon: 'fa-comments', num: 13 },
  { id: 'top_10_feedback_users', title: 'Top Community Contributors Recognition', icon: 'fa-layer-group', num: 14 },
  { id: 'my_activity_summary', title: 'Personal User Activity Dashboard', icon: 'fa-comments', num: 15 },
  { id: 'category_inventory_status', title: 'Category Inventory Status', icon: 'fa-comments', num: 16 },
  { id: 'forgotten_categories', title: 'Forgotten Categories', icon: 'fa-comments', num: 17 },
]

const standardQueries = [
  { id: 'dormant_articles_report', title: 'Dormant Articles', icon: 'fa-table' },
  { id: 'students_interests_by_faculty', title: 'Student Academic Interest Mapping', icon: 'fa-table' },
  { id: 'recommended_articles', title: 'AI-Driven Personalized Content Recommendations', icon: 'fa-table' },
  { id: 'my_reactions_history', title: 'Individual Interaction History Log', icon: 'fa-table' },
  { id: 'dormant_students_report', title: 'Inactive Student Identification', icon: 'fa-table' },
  { id: 'articles_detailed', title: 'Articles Detailed', icon: 'fa-table' },
  { id: 'interested_but_not_opened', title: 'Dormant Interest Tracker', icon: 'fa-table' },
  { id: 'pending_articles', title: 'Pending Articles', icon: 'fa-table' },
  { id: 'students_only', title: 'Students Only', icon: 'fa-table' },
  { id: 'user_preferences_ranked', title: 'Content Preference Analytics', icon: 'fa-table' },
  { id: 'stakeholder_access_list', title: 'Stakeholder Access List', icon: 'fa-table' },
]

const REPORT_IDS = standardReports.map(r => r.id)
const QUERY_IDS = standardQueries.map(q => q.id)

const ROLE_TO_STAKEHOLDER_ID: Record<string, number> = {
  'ministry': 1, 'supreme_council': 2, 'council': 3, 'quality': 4,
  'president': 5, 'naqaae': 6, 'admin': 7,
}

const AVAILABLE_RECIPIENTS = [
  { id: 1, name: 'Ministry of Higher Education', component: 'ministry' },
  { id: 2, name: 'Supreme Council', component: 'supreme_council' },
  { id: 3, name: 'Council of Private Universities', component: 'council' },
  { id: 4, name: 'Quality Assurance', component: 'quality' },
  { id: 5, name: 'University President', component: 'president' },
  { id: 6, name: 'NAQAAE', component: 'naqaae' },
]

// ============================================================
// 🔧 UI COMPONENTS
// ============================================================
function Button({ children, onClick, variant = 'default', size = 'md', className = '', disabled = false }: any) {
  const baseClasses = "font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
  const variants: any = {
    default: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20",
    outline: "border-2 border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-700 dark:text-stone-300",
    ghost: "hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-stone-400",
    success: "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20"
  }
  const sizes: any = { sm: "px-4 py-2 text-sm", md: "px-6 py-3", lg: "px-8 py-4 text-lg" }
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {children}
    </button>
  )
}

// ============================================================
// 🔧 COMPONENT: SQLViewModal
// ============================================================
const SQLViewModal = ({ queryId, sqlCode, onClose }: { queryId: string; sqlCode: string; onClose: () => void }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sqlCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) { console.error('Failed to copy:', err) }
  }
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">SQL View Definition</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-600 rounded-xl flex items-center justify-center transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <span className="text-sm font-mono text-blue-600 dark:text-blue-400">{queryId}</span>
        </div>
        <div className="relative">
          <div className="absolute top-4 right-4 z-10">
            <button onClick={handleCopy} className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm rounded-lg flex items-center gap-2 transition-all shadow-lg">
              {copied ? (<><Check className="w-4 h-4 text-green-400" /> Copied!</>) : (<><Copy className="w-4 h-4" /> Copy SQL</>)}
            </button>
          </div>
          <pre className="p-6 bg-slate-900 text-slate-50 font-mono text-sm overflow-x-auto overflow-y-auto max-h-[60vh] leading-relaxed whitespace-pre"><code>{sqlCode}</code></pre>
        </div>
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="px-6 py-2.5">Close</Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 🔧 COMPONENT: QueryTooltip
// ============================================================
const QueryTooltip = ({ queryId, children }: { queryId: string; children: React.ReactNode }) => {
  const [show, setShow] = useState(false)
  const meta = QUERY_METADATA[queryId]
  if (!meta) return <>{children}</>
  return (
    <div className="relative w-full" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="fixed z-[999999] rounded-xl shadow-2xl animate-in fade-in duration-200" style={{ left: '340px', top: '150px', width: '450px', height: '350px', backgroundColor: '#0f172a', border: '1px solid #1e293b', overflowY: 'auto', padding: '20px', boxSizing: 'border-box' }}>
          <style>{`.tooltip-scroll::-webkit-scrollbar { width: 6px; } .tooltip-scroll::-webkit-scrollbar-track { background: #1e293b; } .tooltip-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }`}</style>
          <div className="tooltip-scroll">
            <div className="flex items-start justify-between mb-3 pb-2 border-b border-slate-700">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-base mb-1 truncate" style={{ color: '#60a5fa' }}>{meta.designation}</h4>
                <p className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{queryId}</p>
              </div>
              {meta.tags && (<div className="flex gap-1.5 flex-shrink-0">{meta.tags.slice(0, 2).map(tag => (<span key={tag} className="px-2 py-1 rounded text-[9px] whitespace-nowrap" style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd' }}>{tag}</span>))}</div>)}
            </div>
            <div className="mb-3">
              <span className="font-semibold text-xs block mb-1" style={{ color: '#fb923c' }}>Objective</span>
              <p className="text-xs leading-relaxed" style={{ color: '#cbd5e1' }}>{meta.objective}</p>
            </div>
            <div className="h-px mb-3" style={{ backgroundColor: '#334155' }}></div>
            <div className="space-y-2.5 text-xs">
              <div className="flex gap-3"><span className="font-bold min-w-[70px] flex-shrink-0" style={{ color: '#3bc929' }}>Input:</span><span className="leading-relaxed flex-1" style={{ color: '#cbd5e1' }}>{meta.logic.input}</span></div>
              <div className="flex gap-3"><span className="font-bold min-w-[70px] flex-shrink-0" style={{ color: '#fbbf24' }}>Process:</span><span className="leading-relaxed flex-1" style={{ color: '#cbd5e1' }}>{meta.logic.processing}</span></div>
              <div className="flex gap-3"><span className="font-bold min-w-[70px] flex-shrink-0" style={{ color: '#9d7cff' }}>Output:</span><span className="leading-relaxed flex-1" style={{ color: '#cbd5e1' }}>{meta.logic.output}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 🔧 COMPONENT: QueryInfoCard
// ============================================================
const QueryInfoCard = ({ queryId }: { queryId: string }) => {
  const meta = QUERY_METADATA[queryId]
  const [showSQL, setShowSQL] = useState(false)
  if (!meta) return null
  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 mb-6 border border-blue-100 dark:border-slate-700 overflow-x-auto">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 break-words whitespace-normal max-w-full">{meta.designation}</h3>
            <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">{queryId}</span>
          </div>
          {meta.sqlDefinition && (<button onClick={() => setShowSQL(true)} className="flex-shrink-0 px-4 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-medium rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl whitespace-nowrap"><Database className="w-4 h-4" /> View SQL</button>)}
        </div>
        <div className="mb-4 p-3 bg-white/50 dark:bg-slate-900/50 rounded-lg">
          <p className="text-sm text-slate-700 dark:text-slate-300 break-words whitespace-normal"><span className="text-orange-500 font-semibold">Objective</span><br />{meta.objective}</p>
        </div>
        <div className="bg-white dark:bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-slate-700 mb-4">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 whitespace-nowrap">HOW IT WORKS</h4>
          <div className="space-y-2 text-[10px]">
            <div className="flex items-start gap-2"><span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded text-[9px] flex-shrink-0 whitespace-nowrap">IN</span><span className="text-slate-600 dark:text-slate-400 break-words whitespace-normal">{meta.logic.input}</span></div>
            <div className="flex items-start gap-2"><span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded text-[9px] flex-shrink-0 whitespace-nowrap">⚙️</span><span className="text-slate-600 dark:text-slate-400 break-words whitespace-normal">{meta.logic.processing}</span></div>
            <div className="flex items-start gap-2"><span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded text-[9px] flex-shrink-0 whitespace-nowrap">OUT</span><span className="text-slate-600 dark:text-slate-400 break-words whitespace-normal">{meta.logic.output}</span></div>
          </div>
        </div>
        {meta.tags && (<div className="flex flex-wrap gap-1.5">{meta.tags.map(tag => (<span key={tag} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] rounded-full font-medium whitespace-nowrap">#{tag}</span>))}</div>)}
      </div>
      {showSQL && meta.sqlDefinition && (<SQLViewModal queryId={queryId} sqlCode={meta.sqlDefinition} onClose={() => setShowSQL(false)} />)}
    </>
  )
}

// ============================================================
// 🔧 HELPER: Process Image URL
// ============================================================
const processImageUrl = (url: string | null | undefined, apiBase?: string): string | null => {
  if (!url || url === '' || url === 'null' || url === 'undefined') return null
  if (url.startsWith('C:') || url.startsWith('D:')) { const filename = url.split(/[/\\]/).pop() || 'image'; return `https://via.placeholder.com/600x400/e0e7ff/4f46e5?text=${encodeURIComponent(filename)}` }
  if (url.startsWith('http')) return url
  if (apiBase && !url.startsWith('/')) return `${apiBase}/${url}`
  const normalized = url?.replace(/\\/g, '/'); return normalized?.startsWith('/') ? normalized : `/${normalized}`
}

// ============================================================
// 🔧 HELPER: Prepare Chart Data
// ============================================================
const prepareChartData = (tableData: any[]) => {
  if (!tableData?.length) return { labels: [], values: [], labelName: '', xAxisLabel: '', yAxisLabel: '' }
  const keys = Object.keys(tableData[0])
  const labelKey = keys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('title') || k.toLowerCase().includes('faculty') || k.toLowerCase().includes('category') || k.toLowerCase().includes('id')) || keys[0]
  const valueKey = keys.find(k => typeof tableData[0][k] === 'number' && k !== labelKey) || keys[1] || keys[0]
  return {
    labels: tableData.slice(0, 8).map((row: any) => String(row[labelKey]).substring(0, 20)),
    values: tableData.slice(0, 8).map((row: any) => Number(row[valueKey]) || 0),
    labelName: String(valueKey).replace(/_/g, ' '),
    xAxisLabel: String(labelKey).replace(/_/g, ' ').toUpperCase(),
    yAxisLabel: String(valueKey).replace(/_/g, ' ').toUpperCase()
  }
}

// ============================================================
// 🔧 COMPONENT: ChartRenderer
// ============================================================
const canvasToImage = (canvas: HTMLCanvasElement): string => canvas.toDataURL('image/png')

const ChartRenderer = ({ chartData, chartType, labelName, xAxisLabel, yAxisLabel, className = "" }: { chartData: { labels: string[]; values: number[] }; chartType: 'bar' | 'pie'; labelName: string; xAxisLabel?: string; yAxisLabel?: string; className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const BLUE_NAVY_COLORS = { background: ['#132B47', '#557669', '#6B8091', '#8C8A95', '#C59EA2', '#C97A53', '#673625', '#C9A875', '#BAA39D'], border: ['#1e293b', '#1e3a8a', '#1d4ed8', '#2563eb', '#0369a1', '#0284c7', '#0e7490', '#0891b2'] }

  useEffect(() => {
    if (!canvasRef.current || !chartData.values.some(v => v > 0)) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const fixedWidth = 600
    const fixedHeight = chartType === 'pie' ? 400 : 350
    canvasRef.current.width = fixedWidth * dpr; canvasRef.current.height = fixedHeight * dpr
    canvasRef.current.style.width = `${fixedWidth}px`; canvasRef.current.style.height = `${fixedHeight}px`
    ctx.scale(dpr, dpr)
    const total = chartData.values.reduce((sum, val) => sum + val, 0)
    const chart = new Chart(ctx, {
      type: chartType,
      data: { labels: chartData.labels, datasets: [{ label: labelName, data: chartData.values, backgroundColor: BLUE_NAVY_COLORS.background, borderColor: chartType === 'pie' ? '#ffffff' : BLUE_NAVY_COLORS.border, borderWidth: chartType === 'pie' ? 3 : 2, barPercentage: 0.6, categoryPercentage: 0.8, barThickness: 'flex', maxBarThickness: 60 }] },
      options: {
        responsive: false, maintainAspectRatio: false,
        plugins: {
          legend: { display: chartType === 'pie', position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 10, weight: '500' }, usePointStyle: true, color: '#334155' } },
          datalabels: chartType === 'bar' ? { anchor: 'end', align: 'top', color: '#475569', font: { weight: 'bold', size: 10 }, offset: 3, formatter: (value: number) => value.toString() } : { anchor: 'center', align: 'center', color: '#ffffff', font: { weight: 'bold', size: 12 }, formatter: (value: number) => { const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : '0'; return `${percentage}%` } },
          tooltip: { backgroundColor: 'rgba(30, 58, 138, 0.95)', titleColor: '#ffffff', bodyColor: '#ffffff', borderColor: '#1e3a8a', borderWidth: 2, padding: 12, displayColors: true, cornerRadius: 8, callbacks: { label: function(context) { const value = chartType === 'bar' ? context.parsed.y : context.parsed; if (chartType === 'pie' && total > 0) { const percentage = ((value / total) * 100).toFixed(1); return `${context.dataset.label}: ${value} (${percentage}%)` } return `${context.dataset.label}: ${value}` } } }
        },
        scales: chartType === 'bar' ? {
          x: { display: true, grid: { display: false }, ticks: { display: true, color: '#64748b', font: { size: 10, weight: '500' }, autoSkip: false, maxRotation: 45, minRotation: 45, padding: 10 }, title: { display: true, text: xAxisLabel || labelName.replace(/_/g, ' '), color: '#475569', font: { size: 11, weight: 'bold' }, padding: { top: 10, bottom: 5 } } },
          y: { display: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { display: true, font: { size: 10 }, padding: 8, color: '#64748b' }, title: { display: true, text: yAxisLabel || 'Count', color: '#475569', font: { size: 11, weight: 'bold' }, padding: { top: 5, bottom: 10 } } }
        } : undefined
      },
      plugins: [{ id: 'centerChart', beforeInit: (chart: any) => { chart.canvas.style.marginLeft = 'auto'; chart.canvas.style.marginRight = 'auto'; chart.canvas.style.display = 'block' } }]
    })
    setTimeout(() => { try { const img = canvasToImage(canvasRef.current!); setImageUrl(img) } catch (err) { console.error('Error converting chart to image:', err) } }, 200)
    return () => { chart.destroy() }
  }, [chartData, chartType, labelName, xAxisLabel, yAxisLabel])

  if (!chartData.values.some(v => v > 0)) return <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-lg border border-slate-200">📊 No data available for chart</div>
  return (
    <div className={`bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm ${className}`}>
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 text-center uppercase tracking-wide border-b border-slate-100 pb-2">{chartType === 'bar' ? '📊' : '🥧'} {labelName.replace(/_/g, ' ')}</h4>
      <div className="relative w-full overflow-visible flex justify-center" style={{ height: chartType === 'pie' ? '450px' : '400px' }}><canvas ref={canvasRef} className="mx-auto" /></div>
      {imageUrl && <img src={imageUrl} alt={`${chartType} chart`} className="hidden print:block w-full mx-auto rounded-lg" style={{ height: chartType === 'pie' ? '450px' : '400px' }} />}
    </div>
  )
}

// ============================================================
// 🔧 COMPONENT: ReportContent
// ============================================================
const ReportContent = ({ reportData, viewName, showLogos = true }: { reportData: any; viewName: string; showLogos?: boolean }) => {
  const displayPrefs = reportData?.displayPreferences || {}
  const chartPrefs = reportData?.charts || {}
  const tableData = Array.isArray(reportData) ? reportData : reportData?.table || []
  const comment = reportData?.comment || ''
  const showTable = displayPrefs.showTable !== false
  const showBar = chartPrefs.bar === true
  const showPie = chartPrefs.pie === true
  const chartData = prepareChartData(tableData)
  const hasChartData = chartData.values.some((v: number) => v > 0)

  return (
    <div className="space-y-4">
      {showLogos && (<div className="flex justify-between items-center border-b border-orange-500/50 pb-3 mb-3"><img src="/logoL.jpeg" alt="Faculty Logo" className="h-10 w-auto object-contain" /><img src="/logoR.jpeg" alt="Newsletter Logo" className="h-12 w-auto object-contain" /><img src="/logoC.jpeg" alt="MTI Logo" className="h-10 w-auto object-contain" /></div>)}
      <div className="text-center mb-3 pb-3 border-b border-stone-200 dark:border-slate-700"><h2 className="text-lg font-bold text-stone-800 dark:text-white">{viewName.replace(/_/g, ' ').toUpperCase()}</h2><p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{new Date(reportData?.generatedAt || Date.now()).toLocaleDateString('en-US')}</p></div>
      {comment && (<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs"><p className="text-blue-900 dark:text-blue-100"><span className="font-semibold">📝 Note:</span> {comment}</p></div>)}
      {(showBar || showPie) && hasChartData && (<div className="flex flex-col gap-4">{showBar && <ChartRenderer chartData={chartData} chartType="bar" labelName={chartData.labelName} xAxisLabel={chartData.xAxisLabel} yAxisLabel={chartData.yAxisLabel} />}{showPie && <ChartRenderer chartData={chartData} chartType="pie" labelName={chartData.labelName} xAxisLabel={chartData.xAxisLabel} yAxisLabel={chartData.yAxisLabel} />}</div>)}
      {showTable && tableData.length > 0 && (<div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-slate-700"><table className="w-full text-xs"><thead className="bg-stone-50 dark:bg-slate-800"><tr>{Object.keys(tableData[0]).map(key => (<th key={key} className="p-2 text-left font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[10px] border-b border-stone-200 dark:border-slate-700">{key.replace(/_/g, ' ')}</th>))}</tr></thead><tbody className="divide-y divide-stone-100 dark:divide-slate-800">{tableData.map((row: any, i: number) => (<tr key={i} className="hover:bg-stone-50 dark:hover:bg-slate-800/50 transition-colors">{Object.values(row).map((val: any, j: number) => (<td key={j} className="p-2 text-stone-600 dark:text-stone-400 text-xs">{val ?? '-'}</td>))}</tr>))}</tbody></table></div>)}
      {!showTable && !showBar && !showPie && <div className="text-center py-8 text-stone-500 dark:text-stone-400 text-sm">No display method specified for this report.</div>}
    </div>
  )
}

// ============================================================
// 🔧 COMPONENT: SendReportModal - ✅ FIXED VERSION
// ============================================================
function SendReportModal({ reportData, reportName, onClose, onSuccess, displayOptions, comment: initialComment }: {
  reportData: any; reportName: string; onClose: () => void; onSuccess: () => void; displayOptions?: { table?: boolean; bar?: boolean; pie?: boolean }; comment?: string
}) {
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([])
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [note, setNote] = useState(initialComment || '')
  
  const toggleRecipient = (recipientId: number) => 
    setSelectedRecipients(prev => prev.includes(recipientId) ? prev.filter(id => id !== recipientId) : [...prev, recipientId])

  const handleSend = async () => {
    if (selectedRecipients.length === 0) { 
      setMessage('Please select at least one recipient')
      return 
    }
    setSending(true)
    setMessage('')
    
    console.log('📦 Sending report with displayOptions:', displayOptions)
    
    // ✅ FIXED: Only set chartType when EXACTLY ONE chart is selected
    // When both or none are selected, leave chartType undefined so boolean flags are used
    const onlyBar = displayOptions?.bar && !displayOptions?.pie
    const onlyPie = displayOptions?.pie && !displayOptions?.bar
    
    const chartTypeToSend: 'bar' | 'pie' | undefined = 
      onlyBar ? 'bar' : 
      onlyPie ? 'pie' : 
      undefined  // ← Key fix: undefined when both or none selected

    const formattedReportData = { 
      table: reportData,
      // ✅ Send chartType as string ONLY when single chart selected
      chartType: chartTypeToSend,
      // ✅ Always send boolean flags for full flexibility
      charts: {
        bar: displayOptions?.bar === true,
        pie: displayOptions?.pie === true
      },
      comment: initialComment || '',
      reportTitle: reportName,
      generatedAt: new Date().toISOString(),
      displayPreferences: {
        showTable: displayOptions?.table !== false
      }
    }
    
    console.log('📤 FINAL PAYLOAD:', {
      displayOptions,
      chartType: chartTypeToSend,
      charts: formattedReportData.charts
    })
    
    const insertsData = selectedRecipients.map(stakeholderId => ({ 
      stakeholder_id: stakeholderId, 
      view_name: reportName, 
      report_data: formattedReportData,
      assigned_at: new Date().toISOString(), 
      is_read: false 
    }))
    
    const { error } = await supabaseClient.from('report_permissions').insert(insertsData)
    
    if (error) { 
      setMessage('Error sending reports: ' + error.message) 
    } else { 
      console.log('✅ Report sent successfully with options:', displayOptions)
      setMessage(`✅ Successfully sent to ${selectedRecipients.length} recipient(s)`)
      setTimeout(() => { onSuccess(); onClose() }, 1500) 
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Send Report: {reportName.replace(/_/g, ' ').toUpperCase()}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-2xl"><X className="w-6 h-6" /></button>
        </div>
        <div className="mb-6">
          <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4">Select Recipients:</h3>
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_RECIPIENTS.map(recipient => (
              <label key={recipient.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedRecipients.includes(recipient.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-stone-200 dark:border-slate-700 hover:border-blue-300'}`}>
                <input type="checkbox" checked={selectedRecipients.includes(recipient.id)} onChange={() => toggleRecipient(recipient.id)} className="w-5 h-5 rounded text-blue-600" />
                <div><div className="font-bold text-slate-800 dark:text-white">{recipient.name}</div><div className="text-xs text-stone-500">{recipient.component}</div></div>
              </label>
            ))}
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Add a note (optional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add any context or instructions..." className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20 text-sm" />
        </div>
        {message && (<div className={`p-4 rounded-xl mb-4 ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>)}
        <div className="flex gap-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="default" onClick={handleSend} disabled={sending || selectedRecipients.length === 0} className="flex-1">{sending ? <span className="animate-spin">⏳</span> : <Share2 className="w-4 h-4" />}{sending ? 'Sending...' : `Send to ${selectedRecipients.length} Recipient(s)`}</Button>
        </div>
      </div>
    </div>
  )
}

function InnerQueryManager({ onBack }: { onBack?: () => void }) {
  const [op, setOp] = useState('add'); const [queries, setQueries] = useState<any[]>([]); const [selectedQ, setSelectedQ] = useState(''); const [qName, setQName] = useState(''); const [qText, setQText] = useState(''); const [msg, setMsg] = useState(''); const [loading, setLoading] = useState(false)
  const refresh = async () => { setLoading(true); const { data } = await supabaseClient.from('queries').select('*'); if (data) setQueries(data); setLoading(false) }
  useEffect(() => { refresh() }, [])
  const handleAction = async () => {
    if (!qName && op === 'add') { setMsg('Please enter a query name'); return }
    if (!qText) { setMsg('Please enter SQL logic'); return }
    if (!selectedQ && op !== 'add') { setMsg('Please select a query'); return }
    setLoading(true); setMsg('Processing...'); let error
    if (op === 'add') { const { error: e } = await supabaseClient.from('queries').insert([{ query_name: qName, query_text: qText, db_type: 'PostgreSQL' }]); error = e }
    else if (op === 'update') { const { error: e } = await supabaseClient.from('queries').update({ query_text: qText }).eq('query_name', selectedQ); error = e }
    else { const { error: e } = await supabaseClient.from('queries').delete().eq('query_name', selectedQ); error = e }
    if (error) setMsg('Error: ' + error.message)
    else { setMsg('Success!'); setQName(''); setQText(''); setSelectedQ(''); refresh() }
    setLoading(false)
  }
  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-6">{onBack && <Button variant="ghost" onClick={onBack} size="sm"><i className="fas fa-arrow-left mr-2"></i>Back</Button>}<h2 className="text-2xl font-black text-slate-800 dark:text-white">Query Management</h2></div>
      <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-sm">
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-6">{['add', 'update', 'delete'].map(m => (<button key={m} onClick={() => { setOp(m); setMsg('') }} className={`flex-1 py-3 rounded-lg text-sm font-bold capitalize transition-all ${op === m ? 'bg-white dark:bg-slate-800 shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><i className={`fas fa-${m === 'add' ? 'plus' : m === 'update' ? 'edit' : 'trash'} mr-2`}></i>{m}</button>))}</div>
        <div className="space-y-4">
          {op === 'add' ? (<input placeholder="Query Name" value={qName} onChange={e => setQName(e.target.value)} className="w-full p-4 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />) : (<select value={selectedQ} onChange={e => { setSelectedQ(e.target.value); const q = queries.find((i: any) => i.query_name === e.target.value); setQText(q?.query_text || '') }} className="w-full p-4 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"><option value="">Select Query...</option>{queries.map((q: any) => <option key={q.id} value={q.query_name}>{q.query_name}</option>)}</select>)}
          <textarea placeholder="Enter SQL query..." value={qText} onChange={e => setQText(e.target.value)} rows={8} className="w-full p-4 rounded-xl border border-stone-200 dark:border-slate-700 font-mono text-sm bg-stone-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <Button onClick={handleAction} disabled={loading} className={`w-full py-4 rounded-xl font-bold text-white ${op === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{loading ? <span className="animate-spin">⏳</span> : <i className={`fas fa-${op === 'add' ? 'plus' : op === 'update' ? 'save' : 'trash'}`}></i>}{loading ? 'Processing...' : `Submit ${op === 'add' ? 'New Query' : op === 'update' ? 'Update' : 'Delete'}`}</Button>
          {msg && <p className={`text-center text-sm font-bold mt-4 p-3 rounded-xl ${msg.includes('Success') ? 'bg-green-100 text-green-700' : msg.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{msg}</p>}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 🔧 COMPONENT: QueriesViewer
// ============================================================
function QueriesViewer({ userRole = 'admin', onBack }: { userRole?: string; onBack?: () => void }) {
  const [queries, setQueries] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [selectedQuery, setSelectedQuery] = useState<any>(null); const [showModal, setShowModal] = useState(false)
  useEffect(() => { fetchQueries() }, [userRole])
  const fetchQueries = async () => { setLoading(true); const stakeholderId = ROLE_TO_STAKEHOLDER_ID[userRole]; if (!stakeholderId) { setQueries([]); setLoading(false); return }; const { data } = await supabaseClient.from('report_permissions').select('*').eq('stakeholder_id', stakeholderId).order('assigned_at', { ascending: false }); if (data) { const filtered = data.filter(item => QUERY_IDS.includes(item.view_name)).reduce((acc: any[], current) => { const existing = acc.find(item => item.view_name === current.view_name); if (!existing || new Date(current.assigned_at) > new Date(existing.assigned_at)) { const index = acc.findIndex(item => item.view_name === current.view_name); if (index !== -1) acc.splice(index, 1); acc.push(current) }; return acc }, []); setQueries(filtered) }; setLoading(false) }
  const markAsRead = async (id: string) => { await supabaseClient.from('report_permissions').update({ is_read: true }).eq('id', id); fetchQueries() }
  const openQuery = (query: any) => { setSelectedQuery(query); setShowModal(true); if (!query.is_read) markAsRead(query.id) }
  const handlePrint = async (elementId: string) => { const element = document.getElementById(elementId); if (!element) return; const images = element.querySelectorAll('img'); await Promise.all(Array.from(images).map(img => { if (img.complete) return Promise.resolve(); return new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; if (img.error) img.src = img.src }) })); const clone = element.cloneNode(true) as HTMLElement; clone.querySelectorAll('.no-print').forEach(el => el.remove()); const printWindow = window.open('', '_blank', 'width=1200,height=800'); if (!printWindow) return; const content = `<!DOCTYPE html><html class="light"><head><title>Print Query</title><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"><style>@media print { body { margin: 0; padding: 20px; background: white !important; color: black !important; } .no-print { display: none !important; } @page { margin: 1.5cm; size: A4; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #e2e8f0; padding: 8px; } th { background: #f8fafc; font-weight: bold; } img { max-width: 100%; height: auto; page-break-inside: avoid; } }</style></head><body class="bg-white text-slate-900 font-sans">${clone.outerHTML}<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script></body></html>`; printWindow.document.write(content); printWindow.document.close() }
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div></div>
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto pb-12">
        {onBack && (<div className="sticky top-0 z-[60] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 shadow-sm"><div className="px-6 py-4"><button onClick={onBack} className="group inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-400 rounded-xl font-medium transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700"><i className="fas fa-arrow-left text-sm"></i><span>Back to Dashboard</span></button></div></div>)}
        <div className="p-6 md:p-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-8 border-b border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center border-b-2 border-purple-500/80 pb-6 mb-6"><img src="/logoL.jpeg" alt="Faculty Logo" className="h-14 w-auto object-contain" /><img src="/logoR.jpeg" alt="Newsletter Logo" className="h-16 w-auto object-contain" /><img src="/logoC.jpeg" alt="MTI Logo" className="h-14 w-auto object-contain" /></div>
              <div className='text-center'><h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Database Queries</h1><p className="text-slate-500 dark:text-slate-400 text-base">View queries sent to <span className="font-semibold text-purple-600 dark:text-purple-400 capitalize">{userRole.replace('_', ' ')}</span></p></div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {queries.length === 0 ? (<div className="p-16 text-center"><p className="text-slate-500 dark:text-slate-400 text-lg">No queries received yet</p></div>) : (queries.map((query) => (<div key={query.id} onClick={() => openQuery(query)} className={`group p-6 cursor-pointer transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!query.is_read ? 'bg-purple-50/30 dark:bg-purple-900/5' : 'bg-white dark:bg-slate-900'}`}><div className="flex justify-between items-start gap-4"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{query.view_name.replace(/_/g, ' ').toUpperCase()}</h3>{!query.is_read && <span className="inline-flex items-center px-3 py-1 bg-purple-500 text-white rounded-full text-xs font-bold">NEW</span>}</div><p className="text-sm text-slate-500 dark:text-slate-400">Sent: {new Date(query.assigned_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p></div><i className="fas fa-chevron-right text-slate-400 group-hover:text-purple-500 transition-colors mt-1"></i></div></div>)))}
            </div>
          </div>
        </div>
        {showModal && selectedQuery && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[80]" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}><div id={`print-query-${selectedQuery.id}`} className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"><button onClick={() => setShowModal(false)} className="absolute top-6 right-6 w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-600 rounded-xl flex items-center justify-center transition-all duration-200 z-10 no-print"><X className="w-5 h-5" /></button><div className="p-8"><div className="flex justify-between items-center border-b-2 border-purple-500/80 pb-6 mb-6"><img src="/logoL.jpeg" alt="Faculty Logo" className="h-14 w-auto object-contain" /><img src="/logoR.jpeg" alt="Newsletter Logo" className="h-16 w-auto object-contain" /><img src="/logoC.jpeg" alt="MTI Logo" className="h-14 w-auto object-contain" /></div><div className="mb-8 pb-6 border-b-2 border-slate-200 dark:border-slate-800 text-center"><h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">{selectedQuery.view_name.replace(/_/g, ' ').toUpperCase()}</h2><p className="text-sm text-slate-500 dark:text-slate-400">Sent: {new Date(selectedQuery.assigned_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>{selectedQuery.report_data && (<div className="bg-white dark:bg-slate-950 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800"><tr>{Object.keys(Array.isArray(selectedQuery.report_data) ? selectedQuery.report_data[0] : selectedQuery.report_data.table?.[0] || {}).map(key => (<th key={key} className="p-4 text-left font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">{key.replace(/_/g, ' ')}</th>))}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{(Array.isArray(selectedQuery.report_data) ? selectedQuery.report_data : selectedQuery.report_data.table || []).map((row: any, i: number) => (<tr key={i} className="hover:bg-purple-50/50 dark:hover:bg-purple-900/10">{Object.values(row).map((val: any, j: number) => (<td key={j} className="p-4 text-slate-600 dark:text-slate-400">{val ?? '-'}</td>))}</tr>))}</tbody></table></div></div>)}<div className="mt-8 pt-6 border-t-2 border-slate-200 dark:border-slate-800 flex justify-end gap-3 no-print"><Button variant="outline" onClick={() => setShowModal(false)} className="px-6 py-3">Close</Button><Button variant="default" onClick={() => handlePrint(`print-query-${selectedQuery.id}`)} className="px-6 py-3 bg-purple-600 hover:bg-purple-700"><i className="fas fa-print mr-2"></i>Print / Save PDF</Button></div></div></div></div>)}
      </div>
    </div>
  )
}

// ============================================================
// 🔧 COMPONENT: ReportsViewer
// ============================================================
function ReportsViewer({ userRole = 'admin', onBack }: { userRole?: string; onBack?: () => void }) {
  const [reports, setReports] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [selectedReport, setSelectedReport] = useState<any>(null); const [showModal, setShowModal] = useState(false)
  useEffect(() => { fetchReports() }, [userRole])
  const fetchReports = async () => { setLoading(true); const stakeholderId = ROLE_TO_STAKEHOLDER_ID[userRole]; if (!stakeholderId) { setReports([]); setLoading(false); return }; const { data } = await supabaseClient.from('report_permissions').select('*').eq('stakeholder_id', stakeholderId).order('assigned_at', { ascending: false }); if (data) { const filtered = data.filter(item => REPORT_IDS.includes(item.view_name)).reduce((acc: any[], current) => { const existing = acc.find(item => item.view_name === current.view_name); if (!existing || new Date(current.assigned_at) > new Date(existing.assigned_at)) { const index = acc.findIndex(item => item.view_name === current.view_name); if (index !== -1) acc.splice(index, 1); acc.push(current) }; return acc }, []); setReports(filtered) }; setLoading(false) }
  const markAsRead = async (id: string) => { await supabaseClient.from('report_permissions').update({ is_read: true }).eq('id', id); fetchReports() }
  const openReport = (report: any) => { setSelectedReport(report); setShowModal(true); if (!report.is_read) markAsRead(report.id) }
  const handlePrint = async (elementId: string) => { const element = document.getElementById(elementId); if (!element) return; const images = element.querySelectorAll('img'); await Promise.all(Array.from(images).map(img => { if (img.complete) return Promise.resolve(); return new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; if (img.error) img.src = img.src }) })); const clone = element.cloneNode(true) as HTMLElement; clone.querySelectorAll('.no-print').forEach(el => el.remove()); const printWindow = window.open('', '_blank', 'width=1200,height=800'); if (!printWindow) return; const content = `<!DOCTYPE html><html class="light"><head><title>Print Report</title><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"><style>@media print { body { margin: 0; padding: 20px; background: white !important; color: black !important; } .no-print { display: none !important; } @page { margin: 1.5cm; size: A4; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #e2e8f0; padding: 8px; } th { background: #f8fafc; font-weight: bold; } img { max-width: 100%; height: auto; page-break-inside: avoid; } }</style></head><body class="bg-white text-slate-900 font-sans">${clone.outerHTML}<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script></body></html>`; printWindow.document.write(content); printWindow.document.close() }
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div></div>
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto pb-12">
        {onBack && (<div className="sticky top-0 z-[60] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 shadow-sm"><div className="px-6 py-4"><button onClick={onBack} className="group inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 rounded-xl font-medium transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700"><i className="fas fa-arrow-left text-sm"></i><span>Back to Dashboard</span></button></div></div>)}
        <div className="p-6 md:p-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-8 border-b border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center border-b-2 border-orange-500/80 pb-6 mb-6"><img src="/logoL.jpeg" alt="Faculty Logo" className="h-14 w-auto object-contain" /><img src="/logoR.jpeg" alt="Newsletter Logo" className="h-16 w-auto object-contain" /><img src="/logoC.jpeg" alt="MTI Logo" className="h-14 w-auto object-contain" /></div>
              <div className='text-center'><h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Received Reports</h1><p className="text-slate-500 dark:text-slate-400 text-base">View reports sent to <span className="font-semibold text-blue-600 dark:text-blue-400 capitalize">{userRole.replace('_', ' ')}</span></p></div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {reports.length === 0 ? (<div className="p-16 text-center"><p className="text-slate-500 dark:text-slate-400 text-lg">No reports received yet</p></div>) : (reports.map((report) => (<div key={report.id} onClick={() => openReport(report)} className={`group p-6 cursor-pointer transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!report.is_read ? 'bg-blue-50/30 dark:bg-blue-900/5' : 'bg-white dark:bg-slate-900'}`}><div className="flex justify-between items-start gap-4"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{report.view_name.replace(/_/g, ' ').toUpperCase()}</h3>{!report.is_read && <span className="inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-bold">NEW</span>}</div><p className="text-sm text-slate-500 dark:text-slate-400">Sent: {new Date(report.assigned_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p></div><i className="fas fa-chevron-right text-slate-400 group-hover:text-blue-500 transition-colors mt-1"></i></div></div>)))}
            </div>
          </div>
        </div>
        {showModal && selectedReport && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[80]" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}><div id={`print-report-${selectedReport.id}`} className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"><button onClick={() => setShowModal(false)} className="absolute top-6 right-6 w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-600 rounded-xl flex items-center justify-center transition-all duration-200 z-10 no-print"><X className="w-5 h-5" /></button><div className="p-8"><ReportContent reportData={selectedReport.report_data} viewName={selectedReport.view_name} showLogos={true} /><div className="mt-8 pt-6 border-t-2 border-slate-200 dark:border-slate-800 flex justify-end gap-3 no-print"><Button variant="outline" onClick={() => setShowModal(false)} className="px-6 py-3">Close</Button><Button variant="default" onClick={() => handlePrint(`print-report-${selectedReport.id}`)} className="px-6 py-3 bg-blue-600 hover:bg-blue-700"><i className="fas fa-print mr-2"></i>Print / Save PDF</Button></div></div></div></div>)}
      </div>
    </div>
  )
}

// ============================================================
// 🔧 COMPONENT: ReportsExplorer
// ============================================================
function ReportsExplorer({ onBack }: { onBack?: () => void }) {
  const [dynamicQueries, setDynamicQueries] = useState<any[]>([])
  const [lastFetchedData, setLastFetchedData] = useState<any>(null)
  const [reportTitle, setReportTitle] = useState("Select a Query from the sidebar")
  const [currentView, setCurrentView] = useState("")
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showQueryManager, setShowQueryManager] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [querySearch, setQuerySearch] = useState("")
  const [showSQLModal, setShowSQLModal] = useState(false)
  
  const [displayOptions, setDisplayOptions] = useState({ table: true, bar: false, pie: false })
  
  useEffect(() => { 
    const fetchQueries = async () => { 
      const { data, error } = await supabaseClient.from('queries').select('*')
      if (data) setDynamicQueries(data)
      if (error) console.error("Error fetching queries:", error) 
    }
    fetchQueries() 
  }, [])
  
  const loadStandardReport = async (viewName: string, title: string) => { 
    setShowQueryManager(false); setLoading(true); setCurrentView(viewName); setReportTitle(title)
    try { 
      const response = await fetch(`${API_BASE_URL}${REPORT_DATA_ENDPOINT}/${viewName}`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json(); setLastFetchedData(data) 
    } catch (error: any) { console.error('Error loading report:', error); setLastFetchedData([{ error: `Failed to load "${viewName}": ${error?.message || 'Unknown error'}`, status: "offline" }]) } 
    finally { setLoading(false) } 
  }
  
  const loadDynamicReport = async (name: string, sqlText: string) => { 
    setShowQueryManager(false); setLoading(true); setCurrentView(name); setReportTitle(name)
    try { 
      const { data, error } = await supabaseClient.rpc('execute_sql', { sql_query: sqlText })
      if (error) throw error; setLastFetchedData(Array.isArray(data) ? data : [data]) 
    } catch (err: any) { setLastFetchedData([{ error: err.message, status: "SQL Error" }]) } 
    finally { setLoading(false) } 
  }
  
  const downloadPDF = async () => {
    if (!currentView) return alert("Please select a query first.")
    setIsExporting(true)
    try {
      const url = `${API_BASE_URL}${GENERATE_PDF_ENDPOINT}/${currentView}?include=table&comment=${encodeURIComponent(comment)}`
      console.log('📥 Opening PDF for query:', currentView)
      const newTab = window.open(url, '_blank')
      if (!newTab) alert('⚠️ Pop-up blocked! Please allow pop-ups for this site.')
    } catch (e: any) { console.error('❌ PDF Error:', e); alert(`Error: ${e.message}`) } 
    finally { setIsExporting(false) }
  }
  
  const filteredStandardQueries = standardQueries.filter(q => q.title.toLowerCase().includes(querySearch.toLowerCase()) || q.id.toLowerCase().includes(querySearch.toLowerCase()) || QUERY_METADATA[q.id]?.designation?.toLowerCase().includes(querySearch.toLowerCase()))
  const filteredDynamicQueries = dynamicQueries.filter(q => q.query_name.toLowerCase().includes(querySearch.toLowerCase()) || QUERY_METADATA[q.query_name]?.designation?.toLowerCase().includes(querySearch.toLowerCase()))
  
  return (
    <div className="flex bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden min-h-[85vh] border border-stone-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-80 bg-slate-950 text-white p-6 overflow-y-auto border-r border-slate-800 flex-shrink-0">
        <div className="text-center mb-8"><h2 className="text-orange-500 text-xl font-black tracking-widest uppercase">Queries Explorer</h2><div className="h-1 w-12 bg-blue-500 mx-auto mt-2 rounded-full"></div></div>
        <div className="mb-6"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="🔍 Search queries..." value={querySearch} onChange={(e) => setQuerySearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all" /></div></div>
        <div className="space-y-6">
          <button onClick={() => setShowQueryManager(true)} className="w-full mb-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 p-4 rounded-2xl flex items-center gap-3 border border-blue-500 transition-all group shadow-lg shadow-blue-900/30"><span className="text-2xl group-hover:rotate-90 transition-transform">⚙️</span><div className="text-left"><div className="text-sm font-bold text-white">Manage Queries</div><div className="text-xs text-blue-200">Add, Edit, Delete SQL Queries</div></div></button>
          <div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2">Standard Queries</div><div className="space-y-2">{filteredStandardQueries.map((report: any, index: number) => { const isActive = currentView === report.id && !showQueryManager; const hasMeta = QUERY_METADATA[report.id]; return (<QueryTooltip key={report.id} queryId={report.id}><button onClick={() => loadStandardReport(report.id, report.title)} className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 text-sm group relative ${isActive ? 'bg-blue-600 shadow-lg shadow-blue-900/20' : 'hover:bg-slate-900 border border-transparent hover:border-slate-800'}`}><span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] transition-colors flex-shrink-0 ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-blue-500 group-hover:text-white'}`}>{index + 1}</span><span className={`truncate flex-1 ${isActive ? 'font-bold text-white' : 'text-slate-400 group-hover:text-white'}`}>{report.title}</span>{hasMeta && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse flex-shrink-0" title="Has documentation"></span>}</button></QueryTooltip>)})}{filteredStandardQueries.length === 0 && <p className="text-xs text-slate-500 text-center py-2">No matches found</p>}</div></div>
          {dynamicQueries.length > 0 && (<div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2 border-t border-slate-800 pt-6">Dynamic Database Queries</div><div className="space-y-2">{filteredDynamicQueries.map((q: any, index: number) => { const isActive = currentView === q.query_name && !showQueryManager; const hasMeta = QUERY_METADATA[q.query_name]; return (<QueryTooltip key={q.id || index} queryId={q.query_name}><button onClick={() => loadDynamicReport(q.query_name, q.query_text)} className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 text-sm group relative ${isActive ? 'bg-orange-600 shadow-lg shadow-orange-900/20' : 'hover:bg-slate-900 border border-transparent hover:border-slate-800'}`}><Database className="w-4 h-4 text-blue-400 flex-shrink-0" /><span className="truncate flex-1">{q.query_name}</span>{hasMeta && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse flex-shrink-0" title="Has documentation"></span>}</button></QueryTooltip>)})}</div></div>)}
        </div>
      </div>
      
      <div className="flex-1 p-8 bg-stone-50/50 dark:bg-slate-900/50 overflow-y-auto">
        {showQueryManager ? (<InnerQueryManager onBack={() => setShowQueryManager(false)} />) : (
          <>
            <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-slate-800 mb-8">
              <div className="flex justify-between items-center w-full border-b-2 border-orange-500 pb-4 mb-6 px-4"><img src="/logoL.jpeg" alt="Faculty Logo" className="h-16 w-auto object-contain" /><img src="/logoR.jpeg" alt="Newsletter Logo" className="h-18 w-auto object-contain" /><img src="/logoC.jpeg" alt="MTI Logo" className="h-16 w-auto object-contain" /></div>
              <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white uppercase tracking-tight">{loading ? 'Fetching Data...' : reportTitle.toUpperCase()}</h2>
            </div>
            {currentView && <QueryInfoCard queryId={currentView} />}
            {loading ? (<div className="flex flex-col items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div><p className="text-slate-500 animate-pulse">Loading university records...</p></div>) : lastFetchedData ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto"><table className="w-full text-sm text-center"><thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-b border-stone-200 dark:border-slate-800"><tr>{Object.keys(lastFetchedData[0] || {}).map(key => (<th key={key} className="p-4 font-bold uppercase tracking-wider">{key.replace(/_/g, ' ')}</th>))}</tr></thead><tbody className="divide-y divide-stone-100 dark:divide-slate-800">{lastFetchedData.length > 0 ? lastFetchedData.map((row: any, i: number) => (<tr key={i} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">{Object.values(row).map((val: any, j: number) => (<td key={j} className="p-4 text-slate-600 dark:text-slate-300 font-medium">{val ?? '-'}</td>))}</tr>)) : (<tr><td colSpan={100} className="p-10 text-stone-400 italic">No records found for this query.</td></tr>)}</tbody></table></div>
                </div>
                <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-sm">
                  <h4 className="font-black text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-white uppercase"><FileText className="w-5 h-5 text-orange-500" /> Executive Summary</h4>
                  <textarea className="w-full h-32 p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all mb-6 text-slate-700 dark:text-slate-300 resize-none" placeholder="Enter your analytical findings here..." value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="flex gap-4">
                    <Button variant="default" onClick={() => setShowSendModal(true)} className="flex-1"><Share2 className="w-4 h-4" /> Send to Recipients</Button>
                    <Button onClick={downloadPDF} disabled={isExporting} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black h-14 rounded-xl shadow-lg">{isExporting ? <span className="animate-spin">⏳</span> : <FileText className="w-4 h-4" />}{isExporting ? 'Generating Report...' : 'Export Official PDF Report'}</Button>
                  </div>
                </div>
              </div>
            ) : (<div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-stone-200 dark:border-slate-800 rounded-3xl"><Database className="w-16 h-16 text-stone-200 mb-4" /><p className="text-stone-400 font-medium">Select a query from the sidebar to view data</p><p className="text-stone-500 text-xs mt-2">💡 Hover over any query name to see its documentation</p></div>)}
          </>
        )}
      </div>
      
      {showSendModal && (
        <SendReportModal 
          reportData={lastFetchedData} 
          reportName={currentView} 
          onClose={() => setShowSendModal(false)} 
          onSuccess={() => {}} 
          displayOptions={displayOptions}
          comment={comment} 
        />
      )}
      
      {showSQLModal && currentView && QUERY_METADATA[currentView]?.sqlDefinition && (<SQLViewModal queryId={currentView} sqlCode={QUERY_METADATA[currentView].sqlDefinition!} onClose={() => setShowSQLModal(false)} />)}
    </div>
  )
}

// ============================================================
// 🔧 COMPONENT: ReportsSystem
// ============================================================
function ReportsSystem() {
  const [dynamicQueries, setDynamicQueries] = useState<any[]>([])
  const [currentView, setCurrentView] = useState("")
  const [reportName, setReportName] = useState("")
  const [activeReport, setActiveReport] = useState<any>(null)
  const [lastFetchedData, setLastFetchedData] = useState<any>(null)
  const [displayOptions, setDisplayOptions] = useState({ table: true, bar: false, pie: false }) 
  const [comment, setComment] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const isNoChart = noChartReports.includes(currentView)
  
  useEffect(() => { 
    const fetchQueries = async () => { 
      try { const { data, error } = await supabaseClient.from('queries').select('*'); if (error) throw error; if (data) setDynamicQueries(data) } 
      catch (err) { console.error("Error fetching queries:", err) } 
    }
    fetchQueries() 
  }, [])
  
  useEffect(() => { 
    if (!currentView) return
    if (isNoChart) { setDisplayOptions({ table: true, bar: false, pie: false }) } 
    else { setDisplayOptions(prev => ({ ...prev, bar: true })) } 
  }, [currentView])
  
  const loadReport = async (viewName: string, title: string) => { 
    setLoading(true); setActiveReport(viewName); setCurrentView(viewName); setReportName(title)
    try { 
      const fullUrl = `${API_BASE_URL}${REPORT_DATA_ENDPOINT}/${viewName}`
      console.log('🚀 Fetching:', fullUrl)
      const res = await fetch(fullUrl, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' } })
      console.log('📡 Response status:', res.status)
      if (!res.ok) { const errorText = await res.text(); console.error('❌ Server Error:', errorText); throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`) }
      const data = await res.json(); console.log('✅ Data received:', data); setLastFetchedData(data) 
    } catch (err: any) { 
      console.error('❌ Fetch Error:', { message: err?.message, name: err?.name, stack: err?.stack })
      setLastFetchedData([{ error: `Failed to load "${viewName}": ${err?.message || 'Unknown error'}`, status: "error" }]) 
    } finally { setLoading(false) } 
  }
  
  const downloadPDF = async (opts: { table: boolean; bar: boolean; pie: boolean }) => {
    if (!currentView) return alert("Please select a report first.")
    setIsExporting(true)
    try {
      const includeParts = []; if (opts.table) includeParts.push('table'); if (opts.bar) includeParts.push('bar'); if (opts.pie) includeParts.push('pie')
      const includeParam = includeParts.join(',') || 'table'
      const url = `${API_BASE_URL}${GENERATE_PDF_ENDPOINT}/${currentView}?include=${encodeURIComponent(includeParam)}&comment=${encodeURIComponent(comment)}`
      console.log('📥 Downloading PDF with options:', includeParam)
      const response = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      if (response.ok) {
        const blob = await response.blob(); const dUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = dUrl; a.download = `${currentView}_Report.pdf`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(dUrl)
      } else { const errorText = await response.text(); alert(`Server error: ${response.status} - ${errorText}`) }
    } catch (e: any) { console.error('PDF download error:', e); alert("Connection error") } finally { setIsExporting(false) }
  }
  
  const chartData = prepareChartData(lastFetchedData || []); const hasChartData = chartData.values.some((v: number) => v > 0)
  
  return (
    <div className="flex bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden min-h-[85vh] border border-stone-200 dark:border-slate-800 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-80 bg-slate-950 text-white p-6 overflow-y-auto border-r border-slate-800 flex-shrink-0">
        <div className="text-center mb-8"><h2 className="text-orange-500 text-xl font-black tracking-widest uppercase">Reports Explorer</h2><div className="h-1 w-12 bg-blue-500 mx-auto mt-2 rounded-full"></div></div>
        <div className="space-y-6">
          <div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2">Standard Analytics</div>
            <div className="space-y-2">{standardReports.map((report: any, idx: number) => (
              <button key={report.id} onClick={() => loadReport(report.id, report.title)} className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 text-sm group ${activeReport === report.id ? 'bg-blue-600 shadow-lg shadow-blue-900/20' : 'hover:bg-slate-900 border border-transparent hover:border-slate-800'}`}>
                <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] group-hover:bg-blue-500 transition-colors">{report.num}</span>
                <span className={activeReport === report.id ? 'font-bold text-white' : 'text-slate-400 group-hover:text-white'}>{report.title}</span>
              </button>
            ))}</div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-6 md:p-8 bg-stone-50/50 dark:bg-slate-900/50 overflow-y-auto">
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-slate-800 mb-8">
          <div className="flex justify-between items-center w-full border-b-2 border-orange-500 pb-4 mb-6 px-4"><img src="/logoL.jpeg" alt="Faculty Logo" className="h-16 w-auto object-contain" /><img src="/logoR.jpeg" alt="Newsletter Logo" className="h-18 w-auto object-contain" /><img src="/logoC.jpeg" alt="MTI Logo" className="h-16 w-auto object-contain" /></div>
          <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white uppercase tracking-tight">{loading ? 'Processing Data...' : currentView ? reportName.toUpperCase() : 'Select a Report From the Sidebar'}</h2>
        </div>
        
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-stone-200 dark:border-slate-800 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="font-black text-blue-600 text-sm uppercase tracking-widest">Display Options:</span>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="checkbox" className="rounded" checked={displayOptions.table} onChange={e => setDisplayOptions(s => ({ ...s, table: e.target.checked }))} /><FileText className="w-4 h-4" /> Data Table</label>
            {!isNoChart && (<>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="checkbox" className="rounded" checked={displayOptions.bar} onChange={e => setDisplayOptions(s => ({ ...s, bar: e.target.checked }))} /><Activity className="w-4 h-4" /> Bar Chart</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="checkbox" className="rounded" checked={displayOptions.pie} onChange={e => setDisplayOptions(s => ({ ...s, pie: e.target.checked }))} /><Activity className="w-4 h-4" /> Pie Chart</label>
            </>)}
          </div>
        </div>
        
        {loading ? (<div className="flex flex-col items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div><p className="text-slate-500 font-bold animate-pulse">Fetching Insights...</p></div>) : lastFetchedData ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {(displayOptions.bar || displayOptions.pie) && !isNoChart && hasChartData && (<div className="flex flex-col gap-6">{displayOptions.bar && <ChartRenderer chartData={chartData} chartType="bar" labelName={chartData.labelName} xAxisLabel={chartData.xAxisLabel} yAxisLabel={chartData.yAxisLabel} />}{displayOptions.pie && <ChartRenderer chartData={chartData} chartType="pie" labelName={chartData.labelName} xAxisLabel={chartData.xAxisLabel} yAxisLabel={chartData.yAxisLabel} />}</div>)}
            {displayOptions.table && (<div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm text-center"><thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-b border-stone-200 dark:border-slate-800"><tr>{Object.keys(lastFetchedData[0] || {}).map(key => (<th key={key} className="p-4 font-black uppercase tracking-wider text-[11px]">{key.replace(/_/g, ' ')}</th>))}</tr></thead><tbody className="divide-y divide-stone-100 dark:divide-slate-800">{lastFetchedData.length > 0 ? lastFetchedData.map((row: any, i: number) => (<tr key={i} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">{Object.values(row).map((val: any, j: number) => (<td key={j} className="p-4 text-slate-600 dark:text-slate-300 font-medium">{val ?? 'N/A'}</td>))}</tr>)) : (<tr><td colSpan={99} className="p-10 text-stone-400 italic">No records found</td></tr>)}</tbody></table></div></div>)}
            <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-sm">
              <h4 className="font-black text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-white uppercase"><FileText className="w-5 h-5 text-orange-500" /> Executive Summary</h4>
              <textarea className="w-full h-32 p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all mb-6 text-slate-700 dark:text-slate-300 resize-none" placeholder="Enter your analytical findings here..." value={comment} onChange={e => setComment(e.target.value)} />
              <div className="flex gap-4">
                <Button variant="default" onClick={() => setShowSendModal(true)} className="flex-1"><Share2 className="w-4 h-4" /> Send to Recipients</Button>
                <Button onClick={() => downloadPDF(displayOptions)} disabled={isExporting} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black h-14 rounded-xl shadow-lg">{isExporting ? <span className="animate-spin">⏳</span> : <FileText className="w-4 h-4" />}{isExporting ? 'Generating Report...' : 'Export Official PDF Report'}</Button>
              </div>
            </div>
          </div>
        ) : (<div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-stone-200 dark:border-slate-800 rounded-3xl"><div className="w-24 h-24 bg-stone-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6"><Activity className="w-10 h-10 text-stone-300" /></div><p className="text-slate-500 font-black uppercase tracking-widest text-sm">Select a dataset from the sidebar</p></div>)}
      </div>
      
      {showSendModal && (<SendReportModal reportData={lastFetchedData} reportName={currentView} onClose={() => setShowSendModal(false)} onSuccess={() => {}} displayOptions={displayOptions} comment={comment} />)}
    </div>
  )
}

// ============================================================
// 🔧 COMPONENT: NewsletterPreview
// ============================================================
function NewsletterPreview({ data, apiBase = '', showAdminBadges = true }: { data: NewsletterData; apiBase?: string; showAdminBadges?: boolean }) {
  if (!data?.articles?.length) return <div className="text-center py-10 text-slate-500">📭 No articles in this newsletter</div>
  const sorted = [...data.articles].sort((a, b) => a.position - b.position)
  const featured = sorted[0]; const firstTwo = sorted.slice(1, 3); const nextThree = sorted.slice(3, 6)
  const ArticleCard = ({ article, size = 'medium', isFeatured = false }: { article: BackendArticle; size?: 'large' | 'medium' | 'small'; isFeatured?: boolean }) => {
    const rawImage = article.image_url || article.photo || article.image || null
    const processedImage = processImageUrl(rawImage, apiBase)
    const hasValidImage = processedImage && processedImage !== 'null' && processedImage !== 'undefined'
    const imageHeight = { large: 'h-48 md:h-56', medium: 'h-32', small: 'h-24' }[size]
    if (isFeatured) {
      return (<div className="group flex flex-col md:flex-row bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
        <div className={`relative w-full md:w-1/2 ${imageHeight} bg-gradient-to-br from-blue-100 to-purple-100`}>
          {hasValidImage ? (<Image src={processedImage!} alt={article.title} fill className="object-cover" unoptimized />) : (<div className="absolute inset-0 flex items-center justify-center"><Newspaper className="h-12 w-12 text-blue-300" /></div>)}
          {showAdminBadges && (<div className="absolute top-2 left-2 flex gap-1">{article.is_opened && <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full flex items-center gap-1"><Eye className="w-3 h-3"/> Opened</span>}{article.shared && <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full flex items-center gap-1"><Share2 className="w-3 h-3"/> Shared</span>}</div>)}
        </div>
        <div className="p-4 md:w-1/2 flex flex-col justify-center"><h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{article.title}</h3><p className="text-slate-600 text-sm line-clamp-3">{article.summary}</p><div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Calendar className="w-3 h-3" />{new Date(article.published_at).toLocaleDateString('en-US')}</div></div>
      </div>)
    }
    return (<div className={`bg-white border border-slate-200 rounded-xl overflow-hidden ${size === 'medium' ? '' : ''}`}>
      <div className={`relative ${imageHeight} bg-gradient-to-br from-blue-100 to-purple-100`}>
        {hasValidImage ? (<Image src={processedImage!} alt={article.title} fill className="object-cover" unoptimized />) : (<div className="absolute inset-0 flex items-center justify-center"><Newspaper className={`text-blue-300 ${size === 'medium' ? 'h-8 w-8' : 'h-6 w-6'}`} /></div>)}
        {showAdminBadges && (<div className="absolute top-1 right-1 flex gap-0.5">{article.is_opened && <span className="px-1 py-0.5 text-[9px] bg-green-500 text-white rounded">✅</span>}{article.shared && <span className="px-1 py-0.5 text-[9px] bg-blue-500 text-white rounded">📤</span>}</div>)}
      </div>
      <div className="p-3"><h4 className={`font-semibold text-slate-900 mb-1 ${size === 'medium' ? 'text-sm' : 'text-xs'}`}>{article.title}</h4><p className={`text-slate-600 ${size === 'medium' ? 'line-clamp-2 text-xs' : 'line-clamp-1 text-[10px]'}`}>{article.summary}</p></div>
    </div>)
  }
  return (<div className="space-y-4">
    <div className="flex items-center justify-between pb-3 border-b border-slate-100"><div className="flex items-center gap-3">{data.student_profile_picture && (<Image src={data.student_profile_picture.startsWith('http') ? data.student_profile_picture : `${apiBase}${data.student_profile_picture}`} alt="" width={32} height={32} className="rounded-full object-cover border border-slate-200" unoptimized />)}<div><p className="font-semibold text-slate-900 text-sm">{data.student_name}</p><p className="text-xs text-slate-500">Edition #{data.edition}</p></div></div><span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">{new Date(data.newsletter_date).toLocaleDateString('en-US')}</span></div>
    {featured && <ArticleCard article={featured} size="large" isFeatured />}
    {firstTwo.length > 0 && (<div className="grid grid-cols-1 md:grid-cols-2 gap-3">{firstTwo.map(a => <ArticleCard key={a.article_id} article={a} size="medium" />)}</div>)}
    {nextThree.length > 0 && (<div className="grid grid-cols-1 md:grid-cols-3 gap-3">{nextThree.map(a => <ArticleCard key={a.article_id} article={a} size="small" />)}</div>)}
  </div>)
}

// ============================================================
// 🔧 MAIN MANAGER DASHBOARD - DEFAULT EXPORT
// ============================================================
export default function ManagerDashboard() {
  const [activePage, setActivePage] = useState<'reports' | 'queries' | 'monitor'>('reports')
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950 font-sans text-stone-900 dark:text-stone-100">
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-lg border border-stone-200 dark:border-slate-800 flex gap-1">
            <button onClick={() => setActivePage('reports')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm ${activePage === 'reports' ? 'bg-blue-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-slate-800'}`}>
              <FileText className="w-4 h-4" /> Reports
            </button>
            <button onClick={() => setActivePage('queries')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm ${activePage === 'queries' ? 'bg-blue-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-slate-800'}`}>
              <Database className="w-4 h-4" /> Queries
            </button>
          </div>
        </div>
        {activePage === 'reports' && <ReportsSystem />}
        {activePage === 'queries' && <ReportsExplorer />}
      </div>
    </div>
  )
}

export { ReportsViewer, QueriesViewer }