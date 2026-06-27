// src/app/stakeholder/dashboard/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Loader2, AlertTriangle, RefreshCcw, Newspaper,
  Users, BookOpen, TrendingUp, Eye, FileText, Database,
  BarChart3, MessageSquare, ArrowLeft, Calendar, Printer
} from 'lucide-react'
import axios from 'axios'
import Chart from 'chart.js/auto'

// ============================================================
// 🔧 API CONFIGURATION
// ============================================================
const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'
const PERMISSIONS_ENDPOINT = '/report_permissions'
const REPORT_DATA_ENDPOINT = '/api/reports/api/report-data'

// ✅ Lists to distinguish Reports vs Queries (Same as Manager)
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
type Report = {
  total_articles_published: number
  total_users_registered: number
  newsletter_editions_count: number
  most_read_articles: {
    article_id: number
    title: string
    category: string
    views: number
  }[]
}

interface PermissionItem {
  id: number
  view_name: string
  assigned_at: string
  is_read: boolean
  notes?: string
  report_data?: any
}

interface ReportData { [key: string]: any }

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
// 🔧 HELPER: Canvas to Image for Print
// ============================================================
const canvasToImage = (canvas: HTMLCanvasElement): string => canvas.toDataURL('image/png')

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
        data:{
          labels: chartData.labels,
          datasets: [{
            label: labelName,
             data: chartData.values,
            backgroundColor: ['#132B47', 
        '#557669', 
        '#6B8091', 
        '#8C8A95', 
        '#C59EA2',  
        '#C97A53', 
        '#673625',
        '#C9A875', 
        '#BAA39D'],
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

      setTimeout(() => {
        try { if (canvasRef.current) setImageUrl(canvasRef.current.toDataURL('image/png')) } catch (e) {}
      }, 100)
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
// 🔧 COMPONENT: ReportContent - ✅ SMART FALLBACK FOR CHARTS
// ============================================================
const ReportContent = ({ reportData, viewName, elementId }: { reportData: any; viewName: string; elementId: string }) => {
  const tableData = Array.isArray(reportData) ? reportData : (reportData?.table || reportData?.data || reportData?.rows || [])
  
  // ✅ Smart fallback: Reports get bar chart by default, Queries don't
  const isReport = REPORT_IDS.includes(viewName)
  const defaultCharts = isReport ? { bar: true, pie: false } : { bar: false, pie: false }
  
  const charts = reportData?.charts || defaultCharts
  const prefs = reportData?.displayPreferences || reportData?.preferences || {}
  const comment = reportData?.comment || reportData?.note || ''
  
  const showTable = prefs.showTable !== false
  const showBar = charts.bar === true
  const showPie = charts.pie === true
  
  const chartData = prepareChartData(tableData)
  const hasChartData = chartData.labels.length > 0 && chartData.values.some(v => v > 0)

  return (
    <div id={elementId} className="space-y-6 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-stone-200 dark:border-slate-800 overflow-hidden">
      {/* ✅ Logos */}
      <div className="flex justify-between items-center bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-800 dark:to-slate-800/50 border-b border-orange-200 dark:border-slate-700 p-4">
        <img src="/logoL.jpeg" alt="Logo" className="h-14 w-auto object-contain" />
        <img src="/logoR.jpeg" alt="Logo" className="h-16 w-auto object-contain" />
        <img src="/logoC.jpeg" alt="Logo" className="h-14 w-auto object-contain" />
      </div>

      {/* Title */}
      <div className="text-center p-4 border-b border-stone-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-stone-800 dark:text-white">{viewName.replace(/_/g, ' ').toUpperCase()}</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Note */}
      {comment && (
        <div className="mx-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
          <p className="text-sm text-blue-900 dark:text-blue-100"><span className="font-semibold">📝 Note:</span> {comment}</p>
        </div>
      )}

      {/* Charts */}
      {(showBar || showPie) && (
        <div className="px-4 space-y-6">
          {showBar && hasChartData && (
            <div className="bg-stone-50 dark:bg-slate-800/50 rounded-xl p-4 border border-stone-200 dark:border-slate-700">
              <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-4 text-center">📊 {chartData.labelName}</h4>
              <ChartRenderer chartData={chartData} chartType="bar" labelName={chartData.labelName} />
            </div>
          )}
          {showPie && hasChartData && (
            <div className="bg-stone-50 dark:bg-slate-800/50 rounded-xl p-4 border border-stone-200 dark:border-slate-700">
              <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-4 text-center">🥧 {chartData.labelName} Distribution</h4>
              <ChartRenderer chartData={chartData} chartType="pie" labelName={chartData.labelName} />
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {showTable && Array.isArray(tableData) && tableData.length > 0 && (
        <div className="px-4 pb-4">
          <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-slate-800">
                <tr>{Object.keys(tableData[0]).map(key => (<th key={key} className="p-3 text-left font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-xs">{key.replace(/_/g, ' ')}</th>))}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                {tableData.map((row: any, i: number) => (<tr key={i} className="hover:bg-stone-50 dark:hover:bg-slate-800/50 transition-colors">{Object.values(row).map((val: any, j: number) => (<td key={j} className="p-3 text-stone-600 dark:text-stone-400">{val ?? '-'}</td>))}</tr>))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 🔧 COMPONENT: ReportsViewer (Reusable for all stakeholders)
// ============================================================
function ReportsViewer({ userRole, onBack, filterType }: { userRole: string; onBack: () => void; filterType?: 'report' | 'query' | null }) {
  const [permissions, setPermissions] = useState<PermissionItem[]>([])
  const [selectedViewName, setSelectedViewName] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [selectedPermissionId, setSelectedPermissionId] = useState<number | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ Get stakeholder ID from role
  const ROLE_TO_ID: Record<string, number> = {
    'ministry': 1, 'supreme_council': 2, 'council': 3, 'quality': 4,
    'president': 5, 'naqaae': 6, 'admin': 7, 'quality_assurance': 4
  }
  const STAKEHOLDER_ID = ROLE_TO_ID[userRole] || 7

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
      } else {
        const response = await axios.get<ReportData>(
          `${API_BASE_URL}${REPORT_DATA_ENDPOINT}/${viewName}`,
          { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, timeout: 20000 }
        )
        setReportData({
          table: response.data,
          charts: { bar: REPORT_IDS.includes(viewName), pie: false },
          displayPreferences: { showTable: true }
        })
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
    const content = `<!DOCTYPE html><html class="light"><head><title>Print</title><script src="https://cdn.tailwindcss.com"></script><style>@media print{@page{margin:1.5cm;size:A4}body{margin:0;padding:20px;background:white!important;color:black!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px}th{background:#f8fafc!important}img{max-width:100%;height:auto}.print\\:block{display:block!important}}</style></head><body>${clone.outerHTML}<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`
    printWindow.document.write(content); printWindow.document.close()
  }

  // ✅ Loading/Error States
  if (loadingList && !selectedViewName) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0] dark:bg-slate-950 pt-24">
      <div className="text-center space-y-4"><Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" /><p className="text-stone-600 dark:text-stone-300">Loading items...</p></div>
    </div>
  )
  
  if (error && !selectedViewName) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0] dark:bg-slate-950 pt-24">
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

  // ✅ Report Detail View
  if (selectedViewName && reportData) {
    return (
      <div className="min-h-screen bg-[#f8f5f0] dark:bg-slate-950">
        <header className="sticky pt-24 top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-stone-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button variant="outline" size="sm" onClick={() => handlePrint(`report-${selectedPermissionId}`)} className="gap-1.5"><Printer className="h-3.5 w-3.5" /> Print</Button>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6 pt-4">
          <ReportContent reportData={reportData} viewName={selectedViewName} elementId={`report-${selectedPermissionId}`} />
        </main>
      </div>
    )
  }

  if (loadingData) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0] dark:bg-slate-950 pt-24">
      <div className="text-center space-y-4"><Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" /><p>Loading report...</p><Button variant="ghost" size="sm" onClick={handleBack}>Cancel</Button></div>
    </div>
  )

  // ✅ List View
  return (
    <div className="min-h-screen bg-[#f8f5f0] dark:bg-slate-950">
      <header className="sticky pt-24 top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-stone-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              {filterType === 'report' && <BarChart3 className="h-4 w-4 text-indigo-500" />}
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
              return (
                <div key={item.id} onClick={() => fetchReportData(item.view_name, item.id)} className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${!item.is_read ? 'border-indigo-400 bg-indigo-50/40 hover:border-indigo-500' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{item.view_name.replace(/_/g, ' ')}</h3>
                        {itemType === 'report' && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px]">Report</span>}
                        {itemType === 'query' && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px]">Query</span>}
                        {!item.is_read && <span className="px-2 py-0.5 bg-indigo-500 text-white rounded-full text-[10px] font-bold animate-pulse">NEW</span>}
                      </div>
                      <p className="text-xs text-stone-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(item.assigned_at)}</p>
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
// 🔧 MOCK DATA & HELPERS (Original Content - KEPT INTACT)
// ============================================================
const MOCK_REPORT: Report = {
  total_articles_published: 142,
  total_users_registered: 1380,
  newsletter_editions_count: 24,
  most_read_articles: [
    { article_id: 1, title: "AI Conference at MTI Draws Global Experts",           category: "tech",          views: 4821 },
    { article_id: 2, title: "MTI Wins Big at Annual Inter-University Sports Day",  category: "sports",        views: 3654 },
    { article_id: 3, title: "New Research Lab Opens in Engineering Building",       category: "research",      views: 2910 },
    { article_id: 4, title: "Registration for the New Academic Semester is Open",  category: "announcements", views: 2540 },
    { article_id: 5, title: "Annual Fun Day Brings Record Attendance",             category: "events",        views: 2100 },
  ],
}

const CATEGORY_LABELS: Record<string, string> = {
  events: "Campus Events", sports: "Sports", tech: "Technology",
  research: "Research", announcements: "Announcements", clubs: "Student Clubs",
}

const CATEGORY_COLORS: Record<string, string> = {
  events: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  sports: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  tech: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  research: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  announcements: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  clubs: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
}

// Role to display title mapping
const ROLE_TITLES: Record<string, string> = {
  supreme_council: "Supreme Council",
  naqaae: "NAQAAE",
  council: "Council of Private Universities",
  manager: "University President",
  quality_assurance: "Quality Assurance Unit",
  supreme_universities: "Supreme Council of Universities",
  ministry: "Ministry of Higher Education",
}

type StatCardProps = { icon: React.ReactNode; label: string; value: number; iconBg: string }
function StatCard({ icon, label, value, iconBg }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-7 flex items-center gap-6 hover:shadow-md transition-shadow duration-300">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-sm text-stone-500 dark:text-stone-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-4xl font-black text-stone-900 dark:text-white mt-1">{value.toLocaleString()}</p>
      </div>
    </div>
  )
}

// ============================================================
// 🔧 MAIN: StakeholderDashboard (Reusable for ALL roles)
// ============================================================
export default function StakeholderDashboard() {
  const [activeSection, setActiveSection] = useState<'home' | 'items'>('home')
  const [selectedFilter, setSelectedFilter] = useState<'report' | 'query' | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Read role from localStorage
  const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
  const role = storedUser?.role || ''
  const title = ROLE_TITLES[role] || 'Dashboard'

  const fetchReport = async () => {
    setLoading(true); setError(null)
    try {
      await new Promise((r) => setTimeout(r, 900))
      setReport(MOCK_REPORT)
      // ✅ REAL AXIOS CALL (uncomment when backend is ready)
      // const response = await axiosInstance.get('/reports')
      // setReport(response.data)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to load reports. Please try again.")
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchReport() }, [])

  // ✅ Early return for Reports/Queries views
  if (activeSection !== 'home') {
    return (
      <>
        {/* Overlay to hide global navbar */}
        <div className="fixed top-0 left-0 right-0 h-20 bg-[#f8f5f0] dark:bg-slate-950 z-[60]" />
        <ReportsViewer 
          userRole={role} 
          onBack={() => { setActiveSection('home'); setSelectedFilter(null) }} 
          filterType={selectedFilter} 
        />
      </>
    );
  }

  // ✅ Helper function to get Reports card classes based on role
  const getReportsCardClasses = () => {
    switch(role) {
      case 'ministry': return { hover: 'hover:border-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950', icon: 'text-emerald-600 dark:text-emerald-400', arrow: 'text-emerald-500' };
      case 'naqaae': return { hover: 'hover:border-blue-500', bg: 'bg-blue-100 dark:bg-blue-950', icon: 'text-blue-600 dark:text-blue-400', arrow: 'text-blue-500' };
      case 'council': return { hover: 'hover:border-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-950', icon: 'text-indigo-600 dark:text-indigo-400', arrow: 'text-indigo-500' };
      case 'supreme_council': return { hover: 'hover:border-amber-500', bg: 'bg-amber-100 dark:bg-amber-950', icon: 'text-amber-600 dark:text-amber-400', arrow: 'text-amber-500' };
      case 'quality_assurance': return { hover: 'hover:border-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-950', icon: 'text-cyan-600 dark:text-cyan-400', arrow: 'text-cyan-500' };
      default: return { hover: 'hover:border-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-950', icon: 'text-indigo-600 dark:text-indigo-400', arrow: 'text-indigo-500' };
    }
  };

  // ✅ Helper function to get Queries card classes based on role
  const getQueriesCardClasses = () => {
    switch(role) {
      case 'ministry': return { hover: 'hover:border-teal-500', bg: 'bg-teal-100 dark:bg-teal-950', icon: 'text-teal-600 dark:text-teal-400', arrow: 'text-teal-500' };
      case 'naqaae': return { hover: 'hover:border-purple-500', bg: 'bg-purple-100 dark:bg-purple-950', icon: 'text-purple-600 dark:text-purple-400', arrow: 'text-purple-500' };
      case 'council': return { hover: 'hover:border-purple-500', bg: 'bg-purple-100 dark:bg-purple-950', icon: 'text-purple-600 dark:text-purple-400', arrow: 'text-purple-500' };
      case 'supreme_council': return { hover: 'hover:border-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-950', icon: 'text-yellow-600 dark:text-yellow-400', arrow: 'text-yellow-500' };
      case 'quality_assurance': return { hover: 'hover:border-blue-500', bg: 'bg-blue-100 dark:bg-blue-950', icon: 'text-blue-600 dark:text-blue-400', arrow: 'text-blue-500' };
      default: return { hover: 'hover:border-purple-500', bg: 'bg-purple-100 dark:bg-purple-950', icon: 'text-purple-600 dark:text-purple-400', arrow: 'text-purple-500' };
    }
  };

  const reportsClasses = getReportsCardClasses();
  const queriesClasses = getQueriesCardClasses();

  // ✅ Main Dashboard Content (Original + New Cards)
  return (
    <div className="min-h-screen bg-[#f8f5f0] dark:bg-slate-950 font-serif">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10 lg:py-16 mt-10">

        {/* Header */}
        <div className="border-b-2 border-stone-800 dark:border-stone-200 pb-8 mb-12">
          <p className="text-sm uppercase tracking-widest text-stone-500 dark:text-stone-400 font-sans font-medium mb-1">CampusPulse</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase text-stone-900 dark:text-white">{title}</h1>
            <Button variant="outline" onClick={fetchReport} disabled={loading} className="border-2 border-stone-800 dark:border-stone-200 rounded-xl h-11 px-5 flex items-center gap-2 self-start sm:self-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh Report
            </Button>
          </div>
        </div>

        {/* ✅ NEW: Reports & Queries Quick Access Cards - With Role-Based Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          
          {/* Reports Card */}
          <button
            onClick={() => { setSelectedFilter('report'); setActiveSection('items') }}
            className={`group bg-white dark:bg-slate-900 rounded-2xl border-2 border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-lg transition-all duration-300 p-6 flex items-center gap-5 text-left ${reportsClasses.hover}`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${reportsClasses.bg}`}>
              <FileText className={`h-7 w-7 ${reportsClasses.icon}`} />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-lg">Manager Reports</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">View reports sent by the Manager dashboard</p>
            </div>
            <FileText className={`h-5 w-5 text-stone-400 ml-auto group-hover:translate-x-1 transition-transform ${reportsClasses.arrow}`} />
          </button>

          {/* Queries Card */}
          <button
            onClick={() => { setSelectedFilter('query'); setActiveSection('items') }}
            className={`group bg-white dark:bg-slate-900 rounded-2xl border-2 border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-lg transition-all duration-300 p-6 flex items-center gap-5 text-left ${queriesClasses.hover}`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${queriesClasses.bg}`}>
              <Database className={`h-7 w-7 ${queriesClasses.icon}`} />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-white text-lg">Database Queries</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Access raw data queries and exports</p>
            </div>
            <Database className={`h-5 w-5 text-stone-400 ml-auto group-hover:translate-x-1 transition-transform ${queriesClasses.arrow}`} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-10 p-5 bg-white dark:bg-slate-800 border-l-4 border-red-500 rounded-xl shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchReport}><RefreshCcw className="mr-2 h-4 w-4" /> Retry</Button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-28">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
              <p className="text-lg italic text-stone-500 dark:text-stone-400">Loading system report...</p>
            </div>
          </div>
        )}

        {/* Report Content */}
        {!loading && report && (
          <div className="space-y-12">

            {/* ✅ ORIGINAL: Stat Cards (KEPT INTACT) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard icon={<Newspaper className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />} label="Articles Published" value={report.total_articles_published} iconBg="bg-indigo-100 dark:bg-indigo-950" />
              <StatCard icon={<Users className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />} label="Users Registered" value={report.total_users_registered} iconBg="bg-emerald-100 dark:bg-emerald-950" />
              <StatCard icon={<BookOpen className="h-7 w-7 text-amber-600 dark:text-amber-400" />} label="Newsletter Editions" value={report.newsletter_editions_count} iconBg="bg-amber-100 dark:bg-amber-950" />
            </div>

            {/* ✅ ORIGINAL: Most Read Articles (KEPT INTACT) */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-2xl font-bold text-stone-900 dark:text-white uppercase tracking-tight">Most Read Articles</h2>
              </div>
              <div className="space-y-4">
                {report.most_read_articles.map((article, index) => (
                  <div key={article.article_id} className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-md transition-shadow duration-300 p-6 flex items-center gap-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${index === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' : index === 1 ? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400' : index === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-stone-900 dark:text-white text-lg leading-snug line-clamp-1">{article.title}</h3>
                      <span className={`inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[article.category] || 'bg-zinc-100 text-zinc-600'}`}>{CATEGORY_LABELS[article.category] || article.category}</span>
                    </div>
                    <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 shrink-0">
                      <Eye className="h-4 w-4" />
                      <span className="font-bold text-lg text-stone-900 dark:text-white">{article.views.toLocaleString()}</span>
                      <span className="text-xs text-stone-400">views</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}