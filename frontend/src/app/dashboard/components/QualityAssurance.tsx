'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Loader2, AlertTriangle, ArrowLeft, Calendar, FileText, 
  Eye, Printer, BarChart3, MessageSquare, Send, X, CheckCircle,
  Plus, Image as ImageIcon,
  Activity
} from 'lucide-react'
import axios from 'axios'
import Chart from 'chart.js/auto'

// ============================================================
// 🔧 API CONFIGURATION
// ============================================================
const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'
const PERMISSIONS_ENDPOINT = '/report_permissions'
const REPORT_DATA_ENDPOINT = '/api/reports/api/report-data'
const SEND_ANNOUNCEMENT_ENDPOINT = '/stakeholder/posts/submit' 

const STAKEHOLDER_TYPE = 'quality'
const STAKEHOLDER_ID = 4

// ✅ Lists to distinguish Reports vs Queries
const REPORT_IDS = [
  'faculty_engagement_league', 'monthly_user_growth', 'category_popularity',
  'content_impact_report', 'monthly_newsletter_simple', 'monthly_feedback_simple',
  'stakeholder_interaction_gap', 'stakeholders_report_count', 'most_active_category',
  'monthly_category_activity', 'top_engaged_newsletters', 'top_5_rated_newsletters',
  'engagement_hourly_pattern', 'top_10_feedback_users', 'my_activity_summary',
  'category_inventory_status', 'forgotten_categories'
]

const QUERY_IDS = [
  'dormant_articles_report', 'students_interests_by_faculty', 'recommended_articles',
  'my_reactions_history', 'dormant_students_report', 'articles_detailed',
  'interested_but_not_opened', 'pinned_articles', 'students_only',
  'user_preferences_ranked', 'stakeholder_access_list'
]

// ============================================================
// 🔧 TYPES
// ============================================================
interface PermissionItem {
  id: number
  view_name: string
  assigned_at: string
  is_read: boolean
  notes?: string
  report_data?: any
}

interface ReportData { [key: string]: any }

interface NewAnnouncementPayload {
  from_stakeholder_id: number
  to_media_adviser_id: number
  title: string
  content: string
  image_url?: string
  is_urgent?: boolean
}

// ============================================================
// 🔧 QUERY METADATA - ✅ FIXED: Keys match backend view names
// ============================================================
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
// 🔧 HELPER: Get Query Metadata (Case-insensitive + Flexible)
// ============================================================
const getQueryMetadata = (viewName: string) => {
  if (!viewName) return null
  
  // Try exact match first
  if (QUERY_METADATA[viewName]) {
    return QUERY_METADATA[viewName]
  }
  
  // Try case-insensitive match
  const lowerName = viewName.toLowerCase()
  const matchedKey = Object.keys(QUERY_METADATA).find(
    key => key.toLowerCase() === lowerName
  )
  if (matchedKey) {
    return QUERY_METADATA[matchedKey]
  }
  
  // Try removing suffixes like "_report" or "_view"
  const cleanName = lowerName.replace(/_(report|view|query)$/, '')
  const matchedClean = Object.keys(QUERY_METADATA).find(
    key => key.toLowerCase().replace(/_(report|view|query)$/, '') === cleanName
  )
  if (matchedClean) {
    return QUERY_METADATA[matchedClean]
  }
  
  return null
}

// ============================================================
// 🔧 HELPER: Format Date
// ============================================================
const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return dateString }
}

// ============================================================
// 🔧 HELPER: Get Item Type
// ============================================================
const getItemType = (viewName: string): 'report' | 'query' => {
  if (REPORT_IDS.includes(viewName)) return 'report'
  if (QUERY_IDS.includes(viewName)) return 'query'
  return 'report'
}

// ============================================================
// 🔧 HELPER: Prepare Chart Data
// ============================================================
const prepareChartData = (tableData: any[]) => {
  if (!Array.isArray(tableData) || tableData.length === 0) return { labels: [], values: [], labelName: '' }
  const keys = Object.keys(tableData[0])
  const labelKey = keys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('title') || k.toLowerCase().includes('category')) || keys.find(k => typeof tableData[0][k] === 'string') || keys[0]
  const valueKey = keys.find(k => k !== labelKey && typeof tableData[0][k] === 'number' && !isNaN(Number(tableData[0][k])))
  if (!valueKey) return { labels: [], values: [], labelName: '' }
  return {
    labels: tableData.slice(0, 10).map(row => String(row[labelKey] ?? '').substring(0, 25)),
    values: tableData.slice(0, 10).map(row => { const val = row[valueKey]; return typeof val === 'number' ? val : parseFloat(val) || 0 }),
    labelName: String(valueKey).replace(/_/g, ' ')
  }
}

// ============================================================
// 🔧 COMPONENT: ChartRenderer
// ============================================================
const ChartRenderer = ({ chartData, chartType, labelName }: { chartData: { labels: string[]; values: number[] }; chartType: 'bar' | 'pie'; labelName: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !chartData.labels.length || !chartData.values.some(v => v > 0)) return
    const existingChart = Chart.getChart(canvasRef.current)
    if (existingChart) existingChart.destroy()
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const fixedWidth = 600
    const fixedHeight = chartType === 'pie' ? 350 : 300
    canvasRef.current.width = fixedWidth * dpr
    canvasRef.current.height = fixedHeight * dpr
    canvasRef.current.style.width = `${fixedWidth}px`
    canvasRef.current.style.height = `${fixedHeight}px`
    ctx.scale(dpr, dpr)

    try {
      const chart = new Chart(ctx, {
        type: chartType,
        data: {
          labels: chartData.labels,
          datasets: [{
            label: labelName,
            data: chartData.values,
            backgroundColor: ['#132B47', '#557669', '#6B8091', '#8C8A95', '#C59EA2', '#C97A53', '#673625', '#C9A875', '#BAA39D'],
            barPercentage: 0.6, categoryPercentage: 0.8, barThickness: 'flex', maxBarThickness: 60,
          }]
        },
        options: {
          responsive: false, maintainAspectRatio: false, animation: { duration: 0 },
          plugins: {
            legend: { display: chartType === 'pie', position: 'bottom', labels: { boxWidth: 10, padding: 6, font: { size: 9 } } },
            datalabels: chartType === 'bar' ? { anchor: 'end', align: 'top', color: '#64748b', font: { weight: 'bold', size: 9 }, offset: 2 } : undefined,
          },
          scales: chartType === 'bar' ? {
            x: { display: true, grid: { display: false }, ticks: { display: true, color: '#64748b', font: { size: 10 }, autoSkip: false, maxRotation: 0, minRotation: 0 } },
            y: { display: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { display: true, font: { size: 9 } } }
          } : undefined
        }
      })

      setTimeout(() => { try { if (canvasRef.current) setImageUrl(canvasRef.current.toDataURL('image/png')) } catch (e) {} }, 100)
      return () => { chart.destroy() }
    } catch (err) { console.error('Chart render error:', err); return () => {} }
  }, [chartData, chartType, labelName])

  if (!chartData.labels.length || !chartData.values.some(v => v > 0)) return <div className="text-center py-8 text-stone-400 text-sm">No data for chart</div>

  return (
    <div className="w-full flex justify-center">
      <div className="relative print:hidden" style={{ width: '600px', height: chartType === 'pie' ? '380px' : '340px' }}>
        <canvas ref={canvasRef} className="max-w-full h-full" />
      </div>
      {imageUrl && <img src={imageUrl} alt={`${chartType} chart`} className="hidden print:block w-full" style={{ height: chartType === 'pie' ? '380px' : '340px' }} />}
    </div>
  )
}

// ============================================================
// 🔧 COMPONENT: NewAnnouncementModal
// ============================================================
function NewAnnouncementModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) {
      setErrorMsg('Title and Content are required')
      return
    }
    
    setSending(true)
    setStatus('idle')
    setErrorMsg('')
    
    try {
      const userStr = localStorage.getItem('user')
      const currentUser = userStr ? JSON.parse(userStr) : null
      const currentEmail = currentUser?.email 

      const payload = {
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl.trim() || "",
        attachment_url: "",
        stakeholder_email: currentEmail
      }

      const fullUrl = `${API_BASE_URL}${SEND_ANNOUNCEMENT_ENDPOINT}`
      console.log('📤 Sending to:', fullUrl)
      console.log('📦 Payload:', JSON.stringify(payload, null, 2))
      
      const response = await axios.post(fullUrl, payload, {
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        timeout: 20000
      })

      if (response.status === 200 || response.status === 201) {
        setStatus('success')
        onSuccess()
        setTimeout(() => {
          onClose()
          setTitle(''); setContent(''); setImageUrl('')
          setStatus('idle')
        }, 1500)
      } else {
        throw new Error('Unexpected response')
      }
    } catch (err: any) {
      console.error('❌ Send Error:', err)
      setStatus('error')
      
      const detail = err?.response?.data?.detail
      if (Array.isArray(detail)) {
        const formattedErrors = detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join('; ')
        setErrorMsg(`Validation Failed: ${formattedErrors}`)
      } else {
        setErrorMsg(detail || err?.response?.data?.message || err?.message || 'Failed to send')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-stone-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-stone-800 dark:text-white">Create New Announcement</h3>
              <p className="text-xs text-stone-500">Send directly to Media Adviser</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {status === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-green-600 font-semibold">✅ Announcement sent!</p>
              <p className="text-sm text-stone-500 mt-2">The Media Adviser will receive your post shortly.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Campus Maintenance Schedule" className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900 text-sm text-stone-700 dark:text-stone-300 focus:ring-2 focus:ring-orange-500 outline-none" disabled={sending} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Content <span className="text-red-500">*</span></label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the full announcement details here..." className="w-full h-32 p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900 text-sm text-stone-700 dark:text-stone-300 focus:ring-2 focus:ring-orange-500 outline-none resize-none" disabled={sending} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Image URL <span className="text-stone-400 text-xs">(Optional)</span></label>
                <div className="relative">
                  <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/banner.jpg" className="w-full p-3 pr-10 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900 text-sm text-stone-700 dark:text-stone-300 focus:ring-2 focus:ring-orange-500 outline-none" disabled={sending} />
                  <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                </div>
              </div>
              {status === 'error' && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs font-mono whitespace-pre-wrap">❌ {errorMsg}</div>
              )}
            </>
          )}
        </div>

        {status !== 'success' && (
          <div className="flex items-center justify-end gap-3 p-5 border-t border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900/50">
            <Button variant="outline" onClick={onClose} disabled={sending} className="px-5">Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !title.trim() || !content.trim()} className="px-5 bg-orange-600 hover:bg-orange-700 text-white font-semibold">
              {sending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>) : (<><Send className="w-4 h-4 mr-2" /> Send Announcement</>)}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// 🔧 COMPONENT: ReportsViewer - ✅ UPDATED: Show designation & objective
// ============================================================
function ReportsViewer({ userRole, onBack, filterType }: { userRole: string; onBack: () => void; filterType?: 'report' | 'query' | null }) {
  const [permissions, setPermissions] = useState<PermissionItem[]>([])
  const [selectedViewName, setSelectedViewName] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [selectedPermissionId, setSelectedPermissionId] = useState<number | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [displayOptions, setDisplayOptions] = useState({ table: true, bar: false, pie: false })

  useEffect(() => { fetchPermissions() }, [userRole, filterType])

  const fetchPermissions = async () => {
    setLoadingList(true)
    setError(null)
    try {
      const response = await axios.get<PermissionItem[]>(`${API_BASE_URL}${PERMISSIONS_ENDPOINT}`, {
        params: { stakeholder_id: STAKEHOLDER_ID },
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        timeout: 15000,
      })
      const allItems = response.data || []
      const filtered = allItems
        .filter(item => !filterType || getItemType(item.view_name) === filterType)
        .reduce((acc: PermissionItem[], current) => {
          const existing = acc.find(item => item.view_name === current.view_name)
          if (!existing || new Date(current.assigned_at) > new Date(existing.assigned_at)) {
            const index = acc.findIndex(item => item.view_name === current.view_name)
            if (index !== -1) acc.splice(index, 1)
            acc.push(current)
          }
          return acc
        }, [])
      setPermissions(filtered)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load items")
    } finally { setLoadingList(false) }
  }

  const markAsRead = async (permissionId: number) => {
    try {
      await axios.get(`${API_BASE_URL}${PERMISSIONS_ENDPOINT}/${permissionId}/mark-read`, {
        params: { stakeholder_id: STAKEHOLDER_ID },
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        timeout: 10000,
      })
      setPermissions(prev => prev.map(item => item.id === permissionId ? { ...item, is_read: true } : item))
    } catch (err) { console.error('❌ Mark read failed:', err) }
  }

  const fetchReportData = async (viewName: string, permissionId: number) => {
    setLoadingData(true)
    setError(null)
    try {
      const permission = permissions.find(p => p.id === permissionId)
      
      if (permission?.report_data) {
        setReportData(permission.report_data)
        setDisplayOptions({ table: true, bar: false, pie: false })
      } else {
        const response = await axios.get<ReportData>(
          `${API_BASE_URL}${REPORT_DATA_ENDPOINT}/${viewName}`,
          { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, timeout: 20000 }
        )
        setReportData(response.data)
        setDisplayOptions({ table: true, bar: true, pie: false })
      }
      
      setSelectedViewName(viewName)
      setSelectedPermissionId(permissionId)
      if (!permissions.find(p => p.id === permissionId)?.is_read) await markAsRead(permissionId)
    } catch (err: any) {
      console.error('❌ Fetch Report Error:', err?.message)
      setError(err?.response?.data?.detail || err?.message || `Failed to load "${viewName}"`)
    } finally { setLoadingData(false) }
  }

  const handleBack = () => {
    if (selectedViewName && reportData) {
      setSelectedViewName(null); setReportData(null); setSelectedPermissionId(null)
    } else { onBack() }
  }

  const handlePrint = async (elementId: string) => {
    const element = document.getElementById(elementId)
    if (!element) return
    const images = element.querySelectorAll('img')
    await Promise.all(Array.from(images).map(img => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve()
      return new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; if (img.error) img.src = img.src })
    }))
    const printWindow = window.open('', '_blank', 'width=1200,height=800')
    if (!printWindow) { window.print(); return }
    const clone = element.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.no-print').forEach(el => el.remove())
    const content = `<!DOCTYPE html><html class="light"><head><title>Print Report</title><script src="https://cdn.tailwindcss.com"></script><style>@media print{@page{margin:1.5cm;size:A4}body{margin:0;padding:20px;background:white!important;color:black!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px}th{background:#f8fafc!important}img{max-width:100%;height:auto}.print\\:block{display:block!important}}</style></head><body>${clone.outerHTML}<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`
    printWindow.document.write(content); printWindow.document.close()
  }

  if (loadingList && !selectedViewName) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-slate-950 pt-24">
      <div className="text-center space-y-4"><Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" /><p className="text-stone-600 dark:text-stone-300">Loading items...</p></div>
    </div>
  )
  
  if (error && !selectedViewName) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-slate-950 pt-24">
      <div className="text-center space-y-4 max-w-md mx-auto p-6">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold">Error</h2>
        <p className="text-stone-600 text-sm">{error}</p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={handleBack}><ArrowLeft className="h-3 w-3" /> Back</Button>
          <Button size="sm" onClick={fetchPermissions}>Retry</Button>
        </div>
      </div>
    </div>
  )

  // ✅ DETAILED VIEW WITH STAKEHOLDER CONTROLS
  if (selectedViewName && reportData) {
    const tableData = Array.isArray(reportData) ? reportData : reportData?.table || []
    const comment = reportData?.comment || ''
    const chartData = prepareChartData(tableData)
    const hasChartData = chartData.values.some((v: number) => v > 0)
    const isNoChart = ['student_interests', 'dormant_articles_report', 'dormant_students_report', 'my_reactions_history', 'my_activity_summary'].includes(selectedViewName)
    const metadata = getQueryMetadata(selectedViewName)  // ✅ Get metadata for detailed view

    return (
      <div className="min-h-screen bg-stone-50 dark:bg-slate-950">
        <header className="sticky pt-24 top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-stone-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button variant="outline" size="sm" onClick={() => handlePrint(`report-${selectedPermissionId}`)} className="gap-1.5"><Printer className="h-3.5 w-3.5" /> Print</Button>
          </div>
        </header>
        
        <main className="max-w-6xl mx-auto px-4 py-6 pt-4" id={`report-${selectedPermissionId}`}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 overflow-hidden mb-6">
            <div className="flex justify-between items-center border-b border-orange-500/50 pb-3 mb-3 p-4">
              <img src="/logoL.jpeg" alt="Faculty Logo" className="h-10 w-auto object-contain" />
              <img src="/logoR.jpeg" alt="Newsletter Logo" className="h-12 w-auto object-contain" />
              <img src="/logoC.jpeg" alt="MTI Logo" className="h-10 w-auto object-contain" />
            </div>


<div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-800 overflow-hidden mb-6">
  {/* Header with designation */}
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 p-6 border-b border-stone-200 dark:border-slate-700">
    <h2 className="text-2xl font-bold text-stone-800 dark:text-white mb-2">
      {metadata?.designation || selectedViewName?.replace(/_/g, ' ')}
    </h2>
    <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">
      {selectedViewName}
    </p>
  </div>

  {/* Objective Section */}
  {metadata?.objective && (
    <div className="p-6 border-b border-stone-200 dark:border-slate-700">
      <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-2 uppercase tracking-wide">
        Objective
      </h3>
      <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
        {metadata.objective}
      </p>
    </div>
  )}

  {/* How It Works Section */}
  {metadata?.logic && (
    <div className="p-6 border-b border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950/50">
      <h3 className="text-sm font-bold text-stone-600 dark:text-stone-400 mb-4 uppercase tracking-wide">
        HOW IT WORKS
      </h3>
      <div className="space-y-3">
        {/* IN - Input */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-green-700 dark:text-green-400">IN</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-stone-600 dark:text-stone-400">{metadata.logic.input}</p>
          </div>
        </div>

        {/* Processing */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400">⚙</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-stone-600 dark:text-stone-400">{metadata.logic.processing}</p>
          </div>
        </div>

        {/* OUT - Output */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400">OUT</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-stone-600 dark:text-stone-400">{metadata.logic.output}</p>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* Tags Section */}
  {metadata?.tags && metadata.tags.length > 0 && (
    <div className="p-6">
      <div className="flex flex-wrap gap-2">
        {metadata.tags.map(tag => (
          <span 
            key={tag} 
            className="px-3 py-1.5 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-stone-400 rounded-lg text-xs font-medium"
          >
            #{tag.replace(/-/g, '')}
          </span>
        ))}
      </div>
    </div>
  )}

  {/* Generated Date */}
  <div className="px-6 py-3 bg-stone-50 dark:bg-slate-950 border-t border-stone-200 dark:border-slate-800">
    <p className="text-xs text-stone-500 dark:text-stone-400">
      Generated: {new Date(reportData?.generatedAt || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })}
    </p>
  </div>
</div>


            {comment && (
              <div className="mx-4 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs">
                <p className="text-blue-900 dark:text-blue-100"><span className="font-semibold">📝 Note:</span> {comment}</p>
              </div>
            )}
            
            <div className="p-4 bg-stone-50 dark:bg-slate-950 border-t border-stone-200 dark:border-slate-800">
              <div className="flex flex-wrap gap-4 items-center">
                <span className="font-black text-blue-600 text-sm uppercase tracking-widest">Display Options:</span>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input type="checkbox" className="rounded" checked={displayOptions.table} onChange={e => setDisplayOptions(s => ({ ...s, table: e.target.checked }))} />
                  <FileText className="w-4 h-4" /> Data Table
                </label>
                {!isNoChart && (<>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input type="checkbox" className="rounded" checked={displayOptions.bar} onChange={e => setDisplayOptions(s => ({ ...s, bar: e.target.checked }))} />
                    <Activity className="w-4 h-4" /> Bar Chart
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input type="checkbox" className="rounded" checked={displayOptions.pie} onChange={e => setDisplayOptions(s => ({ ...s, pie: e.target.checked }))} />
                    <Activity className="w-4 h-4" /> Pie Chart
                  </label>
                </>)}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {(displayOptions.bar || displayOptions.pie) && hasChartData && !isNoChart && (
              <div className="flex flex-col gap-6">
                {displayOptions.bar && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-4 shadow-sm">
                    <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-3 text-center uppercase tracking-wide border-b border-slate-100 pb-2">📊 {chartData.labelName}</h4>
                    <ChartRenderer chartData={chartData} chartType="bar" labelName={chartData.labelName} />
                  </div>
                )}
                {displayOptions.pie && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-4 shadow-sm">
                    <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-3 text-center uppercase tracking-wide border-b border-slate-100 pb-2">🥧 {chartData.labelName} Distribution</h4>
                    <ChartRenderer chartData={chartData} chartType="pie" labelName={chartData.labelName} />
                  </div>
                )}
              </div>
            )}

            {displayOptions.table && tableData.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-xs text-center">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-stone-200 dark:border-slate-800">
                    <tr>
                      {Object.keys(tableData[0] || {}).map(key => (
                        <th key={key} className="p-4 font-bold uppercase tracking-wider text-[11px]">{key.replace(/_/g, ' ')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                    {tableData.length > 0 ? tableData.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                        {Object.values(row).map((val: any, j: number) => (<td key={j} className="p-4 text-stone-600 dark:text-slate-300 font-medium">{val ?? 'N/A'}</td>))}
                      </tr>
                    )) : (<tr><td colSpan={99} className="p-10 text-stone-400 italic">No records found</td></tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </div>


        </main>
      </div>
    )
  }

  // ✅ LOADING DATA STATE
  if (loadingData) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-slate-950 pt-24">
      <div className="text-center space-y-4"><Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" /><p>Loading report...</p><Button variant="ghost" size="sm" onClick={handleBack}>Cancel</Button></div>
    </div>
  )

  // ✅ LIST VIEW - ✅ FIXED: Show designation & objective
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950">
      <header className="sticky pt-24 top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-stone-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              {filterType === 'report' && <BarChart3 className="h-4 w-4 text-blue-500" />}
              {filterType === 'query' && <MessageSquare className="h-4 w-4 text-purple-500" />}
              {filterType === 'report' ? 'Reports' : filterType === 'query' ? 'Queries' : 'All Items'}
            </h1>
            <p className="text-xs text-stone-500">{permissions.length} items</p>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 pt-4">
        {permissions.length === 0 ? (
          <div className="text-center py-16">
            {filterType === 'report' ? <BarChart3 className="h-12 w-12 text-stone-300 mx-auto mb-3" /> : <MessageSquare className="h-12 w-12 text-stone-300 mx-auto mb-3" />}
            <p className="text-stone-500">No {filterType || 'items'} received yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {permissions.map((item) => {
              const itemType = getItemType(item.view_name)
              const metadata = getQueryMetadata(item.view_name)  // ✅ Get metadata for this item
              
              return (
                <div key={item.id} onClick={() => fetchReportData(item.view_name, item.id)} className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${!item.is_read ? 'border-blue-400 bg-blue-50/40 hover:border-blue-500' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {/* ✅ Show designation from metadata */}
                        <h3 className="font-semibold truncate">
                          {metadata?.designation || item.view_name.replace(/_/g, ' ')}
                        </h3>
                        {itemType === 'report' && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px]">Report</span>}
                        {itemType === 'query' && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px]">Query</span>}
                        {!item.is_read && <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-[10px] font-bold animate-pulse">NEW</span>}
                      </div>
                      
                      {/* ✅ Show objective from metadata */}
                      {metadata?.objective && (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">{metadata.objective}</p>
                      )}
                      
                      <p className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" /> {formatDate(item.assigned_at)}
                      </p>
                      {item.notes && <p className="mt-2 text-xs text-stone-600 line-clamp-2">{item.notes}</p>}
                    </div>
                    <Eye className="h-4 w-4 text-stone-400" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

// ============================================================
// 🔧 MAIN: QualityAssuranceDashboard
// ============================================================
export default function QualityAssuranceDashboard() {
  const [activeSection, setActiveSection] = useState<'home' | 'items'>('home')
  const [selectedFilter, setSelectedFilter] = useState<'report' | 'query' | null>(null)
  const [showNewAnnouncementModal, setShowNewAnnouncementModal] = useState(false)

  if (activeSection === 'items') {
    return <ReportsViewer userRole={STAKEHOLDER_TYPE} onBack={() => { setActiveSection('home'); setSelectedFilter(null) }} filterType={selectedFilter} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-800 dark:text-white mb-2">Quality Assurance Dashboard</h1>
        
        </div>

        <div className="mb-8">
          <Button 
            onClick={() => setShowNewAnnouncementModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-orange-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 mr-2" />
            📝 Send New Announcement
          </Button>
          <p className="text-xs text-stone-500 mt-2">Create and send a new post directly to the Media Adviser</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl mx-auto">
          <button onClick={() => { setSelectedFilter('report'); setActiveSection('items') }} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-900 rounded-2xl border-2 border-stone-200 dark:border-slate-800 shadow-lg hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 cursor-pointer text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
              <BarChart3 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-bold text-lg text-stone-800 dark:text-white mb-2">Reports</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">View analytical reports with charts & tables</p>
          </button>
          <button onClick={() => { setSelectedFilter('query'); setActiveSection('items') }} className="group flex flex-col items-center p-6 bg-white dark:bg-slate-900 rounded-2xl border-2 border-stone-200 dark:border-slate-800 shadow-lg hover:shadow-xl hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-300 cursor-pointer text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
              <MessageSquare className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-bold text-lg text-stone-800 dark:text-white mb-2">Queries</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">View custom data queries & results</p>
          </button>
        </div>

        <div className="mt-8">
          <button onClick={() => { setSelectedFilter(null); setActiveSection('items') }} className="text-sm text-stone-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 mx-auto group">
            <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" /> View all items
          </button>
        </div>
        <p className="mt-12 text-xs text-stone-400 dark:text-stone-500">💡 Data is fetched live from the university database</p>
      </div>

      <NewAnnouncementModal
        isOpen={showNewAnnouncementModal}
        onClose={() => setShowNewAnnouncementModal(false)}
        onSuccess={() => {}}
      />
    </div>
  )
}