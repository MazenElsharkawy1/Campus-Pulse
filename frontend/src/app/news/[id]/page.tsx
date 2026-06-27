'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Clock, Loader2, AlertTriangle, Share2, Bookmark, ImageOff, ChevronLeft } from 'lucide-react'
import axios from 'axios'

// ============================================================
// 🔧 API CONFIGURATION - ✅ UNCHANGED
// ============================================================
const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'
const CATEGORIES_PREVIEW_ENDPOINT = '/categories/preview'
const DASHBOARD_ENDPOINT = '/dashboard/newsletter'
const NEWSLETTER_DETAILS_ENDPOINT = '/newsletter/details'
const INTERACTION_SHARING_ENDPOINT = '/interactions/track_sharing'

// ============================================================
// 🔧 TYPES - ✅ UNCHANGED
// ============================================================
interface BackendArticle {
  article_id: number
  title: string
  summary: string
  content: string
  body?: string
  description?: string
  photo: string | null
  image_url?: string
  published_at: string
  category_id?: number
  category?: string
  source?: string
}

interface BackendCategoryPreview {
  category_name: string
  category_id: number
  articles: BackendArticle[]
}

interface FrontendArticle {
  article_id: number
  title: string
  summary: string
  content: string
  image: string | null
  published_at: string
  category: string
  read_time: string
  source?: string
}

// ============================================================
// 🔧 HELPERS - ✅ UNCHANGED
// ============================================================
const processImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url === '' || url === 'null' || url === 'undefined') return null
  if (url.startsWith('C:') || url.startsWith('D:')) {
    const filename = url.split(/[/\\]/).pop() || 'image'
    return `https://via.placeholder.com/600x400/e0e7ff/4f46e5?text=${encodeURIComponent(filename)}`
  }
  if (url.startsWith('http')) return url
  const normalized = url.replace(/\\/g, '/')
  const cleanUrl = normalized.startsWith('/') ? normalized : `/${normalized}`
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  if (cleanUrl.includes('ngrok') && isLocalhost) {
    try {
      const urlObj = new URL(cleanUrl.startsWith('http') ? cleanUrl : `${API_BASE_URL}${cleanUrl}`)
      return urlObj.pathname
    } catch { return cleanUrl }
  }
  return cleanUrl
}

const calculateReadTime = (content: string): string => {
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length
  return `${Math.max(1, Math.ceil(wordCount / wordsPerMinute))} min read`
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const trackSharing = async (email: string, newsletterId: number | null, articleId: number): Promise<boolean> => {
  if (!email || !newsletterId || !articleId) return false
  const payload = { email: email.trim().toLowerCase(), newsletter_id: newsletterId, article_id: articleId, shared: true }
  try {
    const res = await fetch(`${API_BASE_URL}${INTERACTION_SHARING_ENDPOINT}`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify(payload), 
      keepalive: true,
    })
    return res.ok
  } catch { return false }
}

const getUserEmail = (): string => {
  if (typeof window === 'undefined') return ''
  try { const user = JSON.parse(localStorage.getItem('user') || '{}'); return user?.email || '' } catch { return '' }
}

const getNewsletterId = (): number | null => {
  if (typeof window === 'undefined') return null
  try { const cached = JSON.parse(sessionStorage.getItem('cachedNewsletter') || '{}'); return cached?.newsletter_id || cached?.id || null } catch { return null }
}

// ============================================================
// 🔧 MAIN COMPONENT - ✅ UI ONLY UPDATED
// ============================================================
export default function NewsArticlePage() {
  const params = useParams()
  const router = useRouter()
  const articleId = params?.id ? String(params.id) : null

  const [article, setArticle] = useState<FrontendArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [sharing, setSharing] = useState(false)

  // ✅ Fetch logic - UNCHANGED
  useEffect(() => {
    if (!articleId) { setError('Article ID missing'); setLoading(false); return }
    const fetchArticle = async () => {
      setLoading(true); setError(null); setNotFound(false)
      try {
        // 1. Try /categories/preview
        try {
          const previewRes = await axios.get<BackendCategoryPreview[]>(`${API_BASE_URL}${CATEGORIES_PREVIEW_ENDPOINT}`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, timeout: 15000 })
          for (const category of previewRes.data) {
            const found = category.articles.find((a: BackendArticle) => String(a.article_id) === articleId)
            if (found) {
              setArticle({ article_id: found.article_id, title: found.title, summary: found.summary, content: found.content || found.body || found.description || found.summary || '', image: processImageUrl(found.photo || found.image_url), published_at: found.published_at, category: category.category_name || 'Unknown', read_time: calculateReadTime(found.content || found.summary || ''), source: found.source })
              setLoading(false); return
            }
          }
        } catch {}
        // 2. Fallback: Dashboard
        try {
          const email = getUserEmail()
          if (email) {
            const dashboardRes = await axios.get(`${API_BASE_URL}${DASHBOARD_ENDPOINT}?email=${encodeURIComponent(email)}`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, timeout: 15000 })
            const found = dashboardRes.data.articles?.find((a: BackendArticle) => String(a.article_id) === articleId)
            if (found) {
              setArticle({ article_id: found.article_id, title: found.title, summary: found.summary, content: found.content || found.body || found.description || found.summary || '', image: processImageUrl(found.photo || found.image_url), published_at: found.published_at, category: found.category || 'Unknown', read_time: calculateReadTime(found.content || found.summary || ''), source: found.source })
              setLoading(false); return
            }
          }
        } catch {}
        // 3. Fallback: Cached newsletter
        try {
          const cachedNewsletter = JSON.parse(sessionStorage.getItem('cachedNewsletter') || '{}')
          if (cachedNewsletter?.newsletter_id) {
            const newsletterRes = await axios.get(`${API_BASE_URL}${NEWSLETTER_DETAILS_ENDPOINT}?newsletter_id=${cachedNewsletter.newsletter_id}`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, timeout: 15000 })
            const found = newsletterRes.data.articles?.find((a: BackendArticle) => String(a.article_id) === articleId)
            if (found) {
              setArticle({ article_id: found.article_id, title: found.title, summary: found.summary, content: found.content || found.body || found.description || found.summary || '', image: processImageUrl(found.photo || found.image_url), published_at: found.published_at, category: found.category || 'Unknown', read_time: calculateReadTime(found.content || found.summary || ''), source: found.source })
              setLoading(false); return
            }
          }
        } catch {}
        // 4. Last resort
        const fallbackEndpoints = [`${API_BASE_URL}/categories/preview`]
        for (const endpoint of fallbackEndpoints) {
          try {
            const res = await axios.get<BackendArticle | BackendArticle[]>(endpoint, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, timeout: 15000 })
            const data = Array.isArray(res.data) ? res.data.find((a: any) => String(a.article_id) === articleId) : res.data
            if (data?.article_id) {
              setArticle({ article_id: data.article_id, title: data.title, summary: data.summary, content: data.content || data.body || data.description || data.summary || '', image: processImageUrl(data.photo || data.image_url), published_at: data.published_at, category: data.category || 'Unknown', read_time: calculateReadTime(data.content || data.summary || ''), source: data.source })
              setLoading(false); return
            }
          } catch {}
        }
        throw new Error('Article not found')
      } catch (err: any) {
        err?.response?.status === 404 ? setNotFound(true) : setError(err?.message || 'Failed to load article')
      } finally { setLoading(false) }
    }
    fetchArticle()
  }, [articleId])


  const handleBack = () => router.back()

  // ============================================================
  // 🎨 RENDER - ✅ UPDATED UI ONLY
  // ============================================================
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 gap-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Article Not Found</h2>
      <Button onClick={handleBack} className="bg-blue-600 hover:bg-blue-700">← Back</Button>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 gap-4">
      <AlertTriangle className="h-10 w-10 text-red-500" />
      <p className="text-red-500">{error}</p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">Retry</Button>
        <Button variant="outline" onClick={handleBack}>← Back</Button>
      </div>
    </div>
  )

  if (!article) return null

  return (
    <div className="min-h-screen bg-white pt-24 dark:bg-slate-950">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        
        {/* Back Button - Clean */}
        <button 
          onClick={handleBack} 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors group"
        >
          <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Category Badge + Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wide">
            {article.category}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(article.published_at)}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            {article.read_time}
          </span>
        </div>

        {/* Image - Full Width */}
        {article.image && (
          <div className="w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 mb-8 bg-slate-100 dark:bg-slate-900">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-auto max-h-[50vh] object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Content - Large Font + Better Spacing */}
        <div className="space-y-6">
          <p className="text-xl sm:text-2xl leading-relaxed text-slate-700 dark:text-slate-300">
            {article.summary}
          </p>
          
          <div className="prose prose-lg dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
            <p className="text-lg sm:text-xl leading-loose whitespace-pre-line">
              {article.content}
            </p>
          </div>
        </div>

        {/* Source */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {article.source && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Source: <span className="font-medium">{article.source}</span>
            </p>
          )}
         
        </div>

      </article>
    </div>
  )
}