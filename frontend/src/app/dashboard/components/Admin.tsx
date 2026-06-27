'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Users, Newspaper, FileText, Database, 
  CheckCircle, AlertCircle, RefreshCcw, Download,
  Clock, Shield, BarChart, ChevronRight, X,
  Loader2, MessageSquare, Calendar, Tag, ThumbsUp, ThumbsDown, Star
} from 'lucide-react'

// ============================================================
// 🔧 API CONFIGURATION - ✅ Updated for ngrok + CORS
// ============================================================
const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',  // ✅ Required for ngrok
      ...options.headers,
    },
    mode: 'cors',  // ✅ Enable CORS
    credentials: 'omit',  // ✅ Don't send cookies (ngrok issue)
  })
}

// ============================================================
// 🔧 TYPES - ✅ Same as Backend Response
// ============================================================
interface SystemStats {
  users: number
  usersGrowth: string
  newsletters: number
  newslettersGrowth: string
  articles: number
  articlesGrowth: string
  feedbackCount: number
}

interface DatabaseStatus {
  status: 'ok' | 'error'
  latency_ms: number
  tables_count: number
  message: string
}

interface ActivityLog {
  id: string | number
  timestamp: string
  message: string
  level: 'info' | 'warning' | 'error'
  activity_type?: string
}

interface CategoryStat {
  category_id: number
  category_name: string
  total_articles: number
  subscribed_users: number
  avg_interest_score: number
}

interface FeedbackItem {
  newsletter_id: number
  edition: number
  total_feedback: number
  likes: number
  dislikes: number
  comments: number
}

interface AdminReport {
  id: string
  title: string
  description: string
  endpoint: string
  icon: any
  color: string
}

const adminReports: AdminReport[] = [
  {
    id: 'engagement',
    title: 'Engagement Report',
    description: 'User interaction metrics across newsletters',
    endpoint: '/admin/reports/engagement/pdf',  // ✅ Matches backend
    icon: BarChart,
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'content-impact',
    title: 'Content Impact Analysis',
    description: 'Category-wise impact distribution',
    endpoint: '/admin/reports/impact/pdf',  // ✅ Matches backend
    icon: FileText,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'user-activity',
    title: 'User Activity Summary',
    description: 'Detailed user behavior analytics',
    endpoint: '/admin/reports/activity/pdf',  // ✅ Matches backend
    icon: Users,
    color: 'from-purple-500 to-pink-600'
  },
  {
    id: 'feedback-trends',
    title: 'Feedback Trends',
    description: 'Likes, dislikes, and comments analysis',
    endpoint: '/admin/reports/feedback/pdf',  // ✅ Matches backend
    icon: MessageSquare,
    color: 'from-amber-500 to-orange-600'
  }
]

// ============================================================
// 🔧 UI COMPONENTS
// ============================================================
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>
}

function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>
}

function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 border-b border-slate-200 ${className}`}>{children}</div>
}

function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-slate-900 ${className}`}>{children}</h3>
}

function Button({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'md', 
  className = '',
  disabled = false 
}: { 
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
}) {
  const baseClasses = "font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    outline: "border-2 border-slate-300 text-slate-700 hover:bg-slate-50",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200"
  }
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2", lg: "px-6 py-3 text-lg" }
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}

function Badge({ 
  children, 
  variant = 'default',
  className = ''
}: { 
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
}) {
  const variants = {
    default: "bg-blue-100 text-blue-800",
    secondary: "bg-slate-100 text-slate-800",
    destructive: "bg-red-100 text-red-800",
    outline: "border border-slate-300 text-slate-700"
  }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>{children}</span>
}

// ============================================================
// 🔧 HELPER COMPONENTS
// ============================================================
function DatabaseStatusCard({ status }: { status: DatabaseStatus | null }) {
  if (!status) return <div className="p-6 text-center text-slate-400">Loading...</div>
  const isOk = status.status === 'ok'
  
  return (
    <Card className={`border-2 ${isOk ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOk ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <Database className={`w-6 h-6 ${isOk ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Database Connection</p>
              <p className="text-lg font-bold text-slate-900">{isOk ? 'Connected' : 'Disconnected'}</p>
              <p className="text-xs text-slate-500 mt-1">{status.latency_ms}ms • {status.tables_count} tables</p>
            </div>
          </div>
          <Badge variant={isOk ? 'default' : 'destructive'} className="gap-1.5">
            {isOk ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {isOk ? 'Healthy' : 'Error'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({ title, value, growth, icon: Icon }: { title: string; value: string | number; growth: string; icon: any }) {
  return (
    <Card className="hover:shadow-md transition-shadow border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            <p className="text-xs mt-1 text-emerald-600 font-medium">{growth}</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityModal({ activities, isOpen, onClose }: { activities: ActivityLog[]; isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center"><Clock className="w-4 h-4 text-blue-600" /></div>
            <h3 className="text-lg font-bold text-slate-900">Activity Log</h3>
            <Badge variant="secondary" className="text-xs font-normal bg-slate-100 text-slate-600">{activities.length} items</Badge>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-2 bg-slate-50/50">
          {activities.length > 0 ? (
            <div className="space-y-2">
              {activities.map((log, idx) => (
                <div key={idx} className="p-4 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-shadow flex items-start gap-3">
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${log.level === 'error' ? 'bg-red-500' : log.level === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 leading-snug">{log.message}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(log.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {log.activity_type && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md capitalize">{log.activity_type}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Clock className="w-12 h-12 mb-3 text-slate-200" />
              <p className="text-sm font-medium">No activities found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 🔧 MAIN COMPONENT
// ============================================================
export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [allActivities, setAllActivities] = useState<ActivityLog[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null)
  const [showActivityModal, setShowActivityModal] = useState(false)

  // ============================================================
  // 📥 DATA FETCHING - ✅ Updated with proper error handling
  // ============================================================
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      console.log(`🔄 Connecting to: ${API_BASE_URL}`)
      
      // ✅ Stats
      try {
        const statsRes = await apiFetch('/admin/stats')
        if (statsRes.ok) setStats(await statsRes.json())
        else console.warn('⚠️ Stats failed:', statsRes.status)
      } catch (err) { console.error('❌ Stats error:', err) }

      // ✅ DB Status
      try {
        const dbRes = await apiFetch('/admin/db-status')
        if (dbRes.ok) setDbStatus(await dbRes.json())
        else console.warn('⚠️ DB status failed:', dbRes.status)
      } catch (err) { console.error('❌ DB status error:', err) }

      // ✅ Activity Logs
      try {
        const logsRes = await apiFetch('/admin/activity?limit=5')
        if (logsRes.ok) {
          const data = await logsRes.json()
          const formattedLogs: ActivityLog[] = (data.activities || []).map((log: any) => ({
            id: log.id, timestamp: log.created_at || new Date().toISOString(),
            message: log.description, level: 'info', activity_type: log.activity_type
          }))
          setLogs(formattedLogs)
        }
      } catch (err) { console.error('❌ Logs error:', err) }

      // ✅ Category Stats
      try {
        const catsRes = await apiFetch('/admin/categories/stats')
        if (catsRes.ok) {
          const data = await catsRes.json()
          setCategoryStats(data.categories || [])
        }
      } catch (err) { console.error('❌ Category stats error:', err) }

      // ✅ Feedback Summary
      try {
        const feedRes = await apiFetch('/admin/feedback/summary')
        if (feedRes.ok) {
          const data = await feedRes.json()
          setFeedbackSummary(data.feedback || [])
        }
      } catch (err) { console.error('❌ Feedback summary error:', err) }

    } catch (error) {
      console.error('❌ Dashboard error:', error)
      setMessage({ type: 'error', text: 'Failed to connect to server' })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAllActivities = useCallback(async () => {
    try {
      const res = await apiFetch('/admin/activity?limit=100')
      if (res.ok) {
        const data = await res.json()
        setAllActivities((data.activities || []).map((log: any) => ({
          id: log.id, timestamp: log.created_at || new Date().toISOString(),
          message: log.description, level: 'info', activity_type: log.activity_type
        })))
        setShowActivityModal(true)
      }
    } catch (err) { console.error('❌ Failed to fetch all activities:', err) }
  }, [])

  // ============================================================
  // 📥 ADMIN REPORT DOWNLOAD - ✅ Fixed for ngrok + PDF
  // ============================================================
  const downloadAdminReport = async (report: AdminReport) => {
    setActionLoading(report.id)
    setMessage({ type: 'info', text: `🔄 Generating ${report.title}...` })
    
    try {
      const url = `${API_BASE_URL}${report.endpoint}`
      console.log('📥 Fetching admin report:', url)
      
      // ✅ Use fetch with proper headers for PDF download
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Accept': 'application/pdf',
          'ngrok-skip-browser-warning': 'true',
        },
        mode: 'cors',
        credentials: 'omit',
      })
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error body')
        console.error('❌ Report error:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
      }
      
      // ✅ Handle PDF blob download
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `${report.id}_report_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(downloadUrl)
      
      setMessage({ type: 'success', text: `✅ ${report.title} downloaded!` })
      
    } catch (error: any) {
      console.error('❌ Report download error:', error)
      setMessage({ type: 'error', text: `Failed: ${error.message}` })
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => { fetchDashboardData() }, [fetchDashboardData])

  // ============================================================
  // 🚀 ACTIONS - ✅ Updated with proper headers
  // ============================================================
  const handleRunBackup = async () => {
    setActionLoading('backup')
    setMessage({ type: 'info', text: '🔄 Generating backup...' })
    try {
      const response = await fetch(`${API_BASE_URL}/admin/backup`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json', 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        mode: 'cors',
        credentials: 'omit',
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Backup failed: ${errorText}`)
      }
      
      const result = await response.json()
      setMessage({ type: 'success', text: `✅ Backup: ${result.filename || 'generated'}` })
    } catch (error: any) { 
      console.error('❌ Backup error:', error)
      setMessage({ type: 'error', text: `❌ ${error.message}` }) 
    } finally { 
      setActionLoading(null) 
    }
  }

  const handleExportReport = async () => {
    setActionLoading('report')
    try {
      const res = await apiFetch('/admin/report/export')
      if (!res.ok) throw new Error('Export failed')
      const report = await res.json()
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `report-${new Date().toISOString().split('T')[0]}.json`
      a.click(); URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: '✅ Report downloaded' })
    } catch (error: any) { 
      console.error('❌ Export error:', error)
      setMessage({ type: 'error', text: `❌ ${error.message}` }) 
    } finally { 
      setActionLoading(null) 
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Message Notification */}
      {message && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center justify-between ${
            message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 
            message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <span className="text-sm font-medium">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-2"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      <ActivityModal activities={allActivities} isOpen={showActivityModal} onClose={() => setShowActivityModal(false)} />

     

      {/* Main Content */}
      <main className="max-w-7xl pt-24 mx-auto px-6 py-8 space-y-8">
        {/* 1. Database Status */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">System Status</h2>
          <DatabaseStatusCard status={dbStatus} />
        </section>

        {/* 2. Quick Stats */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Overview</h2>
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Users" value={stats.users} growth={stats.usersGrowth} icon={Users} />
              <StatCard title="Newsletters" value={stats.newsletters} growth={stats.newslettersGrowth} icon={Newspaper} />
              <StatCard title="Articles" value={stats.articles} growth={stats.articlesGrowth} icon={FileText} />
              <StatCard title="Feedback" value={stats.feedbackCount} growth="Last 6mo" icon={MessageSquare} />
            </div>
          )}
        </section>

        {/* 3. Quick Actions */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button onClick={handleRunBackup} disabled={!!actionLoading} variant="outline" className="h-auto py-4 flex flex-col gap-2 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50">
              {actionLoading === 'backup' ? <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> : <Download className="w-6 h-6 text-blue-600" />}
              <span className="font-bold">Run Backup</span>
              <span className="text-xs text-slate-500">Download SQL File</span>
            </Button>
            <Button onClick={handleExportReport} disabled={!!actionLoading} variant="outline" className="h-auto py-4 flex flex-col gap-2 border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50">
              {actionLoading === 'report' ? <Loader2 className="w-6 h-6 animate-spin text-emerald-600" /> : <FileText className="w-6 h-6 text-emerald-600" />}
              <span className="font-bold">Export Report</span>
              <span className="text-xs text-slate-500">Download JSON</span>
            </Button>
          </div>
        </section>

        {/* 4. Category Statistics */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Tag className="w-4 h-4" /> Category Statistics</h2>
          <Card className="border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Articles</th><th className="px-4 py-3">Subscribers</th><th className="px-4 py-3">Interest Score</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryStats.length > 0 ? categoryStats.map((cat) => (
                    <tr key={cat.category_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{cat.category_name}</td>
                      <td className="px-4 py-3 text-slate-600">{cat.total_articles}</td>
                      <td className="px-4 py-3 text-slate-600">{cat.subscribed_users}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /><span className="text-slate-600">{(cat.avg_interest_score * 100).toFixed(1)}%</span></div></td>
                    </tr>
                  )) : (<tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No category data available</td></tr>)}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* 5. Feedback Summary */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Feedback Summary</h2>
          <Card className="border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr><th className="px-4 py-3">Edition</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Likes</th><th className="px-4 py-3">Dislikes</th><th className="px-4 py-3">Comments</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feedbackSummary.length > 0 ? feedbackSummary.map((item) => (
                    <tr key={item.newsletter_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">#{item.edition}</td>
                      <td className="px-4 py-3 text-slate-600">{item.total_feedback}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">{item.likes} <ThumbsUp className="w-3 h-3 inline ml-1" /></td>
                      <td className="px-4 py-3 text-red-600 font-medium">{item.dislikes} <ThumbsDown className="w-3 h-3 inline ml-1" /></td>
                      <td className="px-4 py-3 text-slate-600">{item.comments}</td>
                    </tr>
                  )) : (<tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No feedback data available</td></tr>)}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

       {/* 6. ADMIN REPORTS SECTION - ✅ CLEAN DESIGN */}
<section id="reports-section">
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
      <FileText className="w-4 h-4 text-blue-600" /> 
      Admin Reports
    </h2>
    <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600 border-0">
      4 Available
    </Badge>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {adminReports.map((report, index) => (
      <Card 
        key={report.id} 
        className={`group border-2 transition-all duration-300 overflow-hidden ${
          index === 0 
            ? 'bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-md' 
            : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-md'
        }`}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                index === 0 ? 'bg-blue-500' : 
                index === 1 ? 'bg-emerald-500' : 
                index === 2 ? 'bg-purple-500' : 'bg-amber-500'
              }`}>
                <report.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold text-sm ${
                  index === 0 ? 'text-blue-900' : 'text-slate-900'
                }`}>
                  {report.title}
                </h3>
                <p className={`text-xs mt-0.5 ${
                  index === 0 ? 'text-blue-600' : 'text-slate-500'
                }`}>
                  {report.description}
                </p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 ${
              index === 0 ? 'text-blue-400' : 'text-slate-300'
            } group-hover:translate-x-0.5 transition-transform`} />
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">Ready to generate</span>
            <Button 
              size="sm" 
              onClick={() => downloadAdminReport(report)}
              disabled={!!actionLoading}
              className={`text-xs px-4 py-2 h-auto rounded-lg ${
                index === 0 ? 'bg-blue-600 hover:bg-blue-700' : 
                index === 1 ? 'bg-emerald-600 hover:bg-emerald-700' : 
                index === 2 ? 'bg-purple-600 hover:bg-purple-700' : 
                'bg-amber-600 hover:bg-amber-700'
              } text-white shadow-sm hover:shadow-md transition-all`}
            >
              {actionLoading === report.id ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
              ) : (
                <><Download className="w-3 h-3 mr-1" /> Download PDF</>
              )}
            </Button>
          </div>
        </div>
      </Card>
    ))}
  </div>
</section>

        {/* 7. Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Clock className="w-4 h-4" /> Recent Activity</h2>
            <Button variant="outline" onClick={fetchAllActivities} disabled={logs.length === 0} className="rounded-full h-8 px-3 text-xs font-medium border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all shadow-sm">
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <Card className="border-slate-200 shadow-sm">
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {logs.length > 0 ? logs.map((log, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${log.level === 'error' ? 'bg-red-500' : log.level === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{log.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </Card>
        </section>
      </main>
    </div>
  )
}