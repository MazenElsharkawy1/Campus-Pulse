'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { 
  Loader2, AlertCircle, Newspaper, RefreshCcw, Calendar, User, 
  Heart, ThumbsDown, Send, CheckCircle, XCircle, Share2, Archive, 
  FolderOpen, ChevronLeft, ChevronRight, Clock, X, Signal, WifiOff
} from 'lucide-react'
import axios from 'axios'
import ChatbotWidget from '@/components/chatbot/ChatbotWidget'

// ============================================================
// 🔧 API CONFIGURATION
// ============================================================
const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'
const DASHBOARD_ENDPOINT = '/dashboard/newsletter'
const ARCHIVE_ENDPOINT = '/archive'
const NEWSLETTER_DETAILS_ENDPOINT = '/newsletter/details'
const FEEDBACK_ENDPOINT = '/feedback'
const INTERACTION_OPENING_ENDPOINT = '/interactions/track_opening'
const INTERACTION_SHARING_ENDPOINT = '/interactions/track_sharing'
// ✅ FIXED: Use correct endpoint that matches backend
const MONITOR_HEARTBEAT_ENDPOINT = '/monitor/heartbeat'

// ============================================================
// 🔧 TYPES (Unchanged)
// ============================================================
interface BackendArticle {
  article_id: number
  title: string
  summary: string
  content?: string
  body?: string
  description?: string
  image_url?: string
  photo?: string
  image?: string
  category_id: number | string
  category?: string
  is_opened: boolean
  shared: boolean
  position: number
  published_at: string
}

interface BackendDashboardResponse {
  last_update?: string
  updated_at?: string
  student_name: string
  student_profile_picture: string
  edition: number
  newsletter_date: string
  newsletter_id: number
  articles: BackendArticle[]
}

interface NewsletterArchiveItem {
  newsletter_id: number
  edition: number
  published_date: string
  articles_count: number
}

interface NewsArticle {
  article_id: number
  title: string
  summary: string
  content: string
  photo: string | null
  category?: string
  published_at?: string
  position: number
}

interface FeedbackPayload {
  comment?: string
  reaction?: 'like' | 'dislike'
  newsletter_id: number
  email: string
}

interface FeedbackSuccessResponse {
  status: string
  message: string
  feedback_id: number
}

interface UserInfo {
  email: string
  name: string
  role: string
  role_id?: number
  user_id?: number
  is_student?: boolean
}

interface MonitorDashboardData {
  student_name: string
  student_profile_picture?: string
  edition: number
  newsletter_date: string
  newsletter_id: number
  articles: Array<{
    article_id: number
    title: string
    summary: string
    photo?: string | null
    position: number
    published_at?: string
  }>
  last_seen: string
  userEmail: string
}

// ============================================================
// 🔧 HELPERS - ✅ processImageUrl UNCHANGED (EXACTLY AS YOU HAD IT)
// ============================================================
const processImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url === '' || url === 'null' || url === 'undefined' || url === 'None') return null
  if (url.startsWith('C:') || url.startsWith('D:') || url.startsWith('E:')) {
    const filename = url.split(/[/\\]/).pop() || 'image'
    return `https://via.placeholder.com/600x400/e0e7ff/4f46e5?text=${encodeURIComponent(filename)}`
  }
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`
  return url
}

const mapBackendToArticle = (backend: BackendArticle): NewsArticle => {
  const fullContent = backend.content || backend.body || backend.description || backend.summary || 'No content available.'
  const rawImage = backend.image_url || backend.photo || backend.image || null
  return {
    article_id: backend.article_id,
    title: backend.title,
    summary: backend.summary,
    content: fullContent,
    photo: processImageUrl(rawImage),
    category: backend.category,
    published_at: backend.published_at,
    position: backend.position,
  }
}

const formatDate = (dateString: string): string => {
  if (!dateString) return ""
  try { return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }
  catch { return dateString }
}

const formatDateWithTime = (dateString: string): string => {
  if (!dateString) return ""
  try {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return dateString }
}

const formatShortDate = (dateString: string): string => {
  if (!dateString) return "Recent"
  try { return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return dateString }
}

const formatLastUpdate = (timestamp: string | undefined): string => {
  if (!timestamp) return ""
  try {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    })
  } catch { return timestamp }
}

// ============================================================
// 🔧 Track Interactions (Unchanged)
// ============================================================
const trackOpening = async (email: string, newsletterId: number, articleId: number): Promise<boolean> => {
  if (!email || !newsletterId || !articleId) return false
  const payload = { email: email.trim().toLowerCase(), newsletter_id: newsletterId, article_id: articleId, is_opened: true }
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      navigator.sendBeacon(`${API_BASE_URL}${INTERACTION_OPENING_ENDPOINT}`, blob)
      return true
    }
    const res = await fetch(`${API_BASE_URL}${INTERACTION_OPENING_ENDPOINT}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify(payload), keepalive: true,
    })
    return res.ok
  } catch { return false }
}

const trackSharing = async (email: string, newsletterId: number, articleId: number): Promise<boolean> => {
  if (!email || !newsletterId || !articleId) return false
  const payload = { email: email.trim().toLowerCase(), newsletter_id: newsletterId, article_id: articleId, shared: true }
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      navigator.sendBeacon(`${API_BASE_URL}${INTERACTION_SHARING_ENDPOINT}`, blob)
      return true
    }
    const res = await fetch(`${API_BASE_URL}${INTERACTION_SHARING_ENDPOINT}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify(payload), keepalive: true,
    })
    return res.ok
  } catch { return false }
}

// ============================================================
// 🔧 Monitor: Send Heartbeat to Backend (MINIMAL FIX)
// ============================================================
const sendMonitorHeartbeat = async (email: string, dashboardData: MonitorDashboardData): Promise<boolean> => {
  try {
    // ✅ Backend expects: { email, data } - NOT { action, user_id, content }
    const response = await axios.post(
      `${API_BASE_URL}${MONITOR_HEARTBEAT_ENDPOINT}`,
      { 
        email: email.trim().toLowerCase(), 
        data: dashboardData  // ✅ KEY: "data" not "content"
      },
      {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        timeout: 3000,
      }
    )
    return response.data?.status === 'ok'
  } catch (err) {
    console.warn('⚠️ Monitor heartbeat failed:', err)
    return false
  }
}

// ============================================================
// 🔧 TOAST COMPONENT (Unchanged)
// ============================================================
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    success: 'bg-emerald-500 border-emerald-600',
    error: 'bg-red-500 border-red-600',
    info: 'bg-blue-500 border-blue-600'
  }

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : AlertCircle

  return (
    <div className={`fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:max-w-sm z-[100] flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-2xl text-white border ${colors[type]} animate-in slide-in-from-bottom-5 fade-in duration-300 print:hidden`}>
      <Icon className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium flex-1 whitespace-pre-line">{message}</p>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors shrink-0">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  )
}

// ============================================================
// 🔧 SHARE MODAL - Link Only (Unchanged except shareLinks)
// ============================================================
function ShareModal({ 
  articleId, 
  articleTitle, 
  articleSummary,
  articleUrl, 
  onClose,
  onShowToast
}: { 
  articleId: number; 
  articleTitle: string; 
  articleSummary: string;
  articleUrl: string;
  onClose: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}) {
  // ✅ FIXED: Only encode the articleUrl, no extra text
  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(articleUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(articleUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(articleUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`,
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
    onShowToast(`🚀 Opening ${platform}...`, 'info');
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl);
      onShowToast('🔗 Link copied to clipboard!', 'success');
    } catch {
      const tempInput = document.createElement('input');
      tempInput.value = articleUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      onShowToast('🔗 Link copied!', 'success');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-5 sm:p-6 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Share Article</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <button onClick={() => handleShare('whatsapp')} className="flex items-center justify-center gap-2 py-3 px-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-medium text-sm transition-colors">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            <span className="truncate">WhatsApp</span>
          </button>
          <button onClick={() => handleShare('telegram')} className="flex items-center justify-center gap-2 py-3 px-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl font-medium text-sm transition-colors">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 17.97L4.58 13.62 19.54 3.5l-13.06 9.63 7.494 4.34-.03.5zm.056-.014l.056-.014-.056.014z"/></svg>
            <span className="truncate">Telegram</span>
          </button>
          <button onClick={() => handleShare('facebook')} className="flex items-center justify-center gap-2 py-3 px-2 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl font-medium text-sm transition-colors">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <span className="truncate">Facebook</span>
          </button>
          <button onClick={() => handleShare('twitter')} className="flex items-center justify-center gap-2 py-3 px-2 bg-[#1DA1F2] hover:bg-[#1a91da] text-white rounded-xl font-medium text-sm transition-colors">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            <span className="truncate">Twitter</span>
          </button>
          <button onClick={() => handleShare('linkedin')} className="flex items-center justify-center gap-2 py-3 px-2 bg-[#0A66C2] hover:bg-[#0958a9] text-white rounded-xl font-medium text-sm transition-colors col-span-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            <span className="truncate">LinkedIn</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={handleCopyLink} className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-sm transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 🔧 MODAL: Archive Viewer (Unchanged)
// ============================================================
function ArchiveModal({ archiveItems, userEmail, onClose, onSelectNewsletter }: {
  archiveItems: NewsletterArchiveItem[]
  userEmail: string
  onClose: () => void
  onSelectNewsletter: (newsletterId: number) => void
}) {
  const [loadingArchive, setLoadingArchive] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/70 backdrop-blur-sm print:hidden" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-5xl max-h-[90vh] overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 flex items-center justify-center rounded-xl shrink-0">
              <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Newsletter Archive</h2>
              <p className="text-slate-500 text-xs sm:text-sm">Browse all previous editions</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 sm:h-10 sm:w-10 hover:bg-slate-100 rounded-full shrink-0">
            <XCircle className="h-5 w-5 text-slate-600" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4 sm:p-6">
          {loadingArchive ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>
          ) : archiveItems.length === 0 ? (
            <div className="text-center py-16">
              <Archive className="h-14 w-14 mx-auto text-slate-300 mb-4" />
              <p className="text-lg text-slate-500">No previous newsletters found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
              {archiveItems.map((item) => (
                <button key={item.newsletter_id}
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('cachedNewsletter', JSON.stringify({
                        newsletter_id: item.newsletter_id, 
                        edition: item.edition,
                        published_date: item.published_date
                      }))
                    }
                    onSelectNewsletter(item.newsletter_id)
                    onClose()
                  }}
                  className="group flex flex-col p-3 sm:p-5 border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50/40 rounded-xl transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-slate-50 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                      <Newspaper className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500 group-hover:text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-sm sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 mb-1">
                    Edition #{item.edition}
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                    <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />{formatShortDate(item.published_date)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 🔧 NEWS ITEM COMPONENT (Unchanged)
// ============================================================
function NewsItem({ article, newsletterId, userEmail, size = 'medium', featured = false, onShowToast }: {
  article: NewsArticle; newsletterId: number | null; userEmail: string;
  size?: 'large' | 'medium' | 'small'; featured?: boolean;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void
}) {
  const [imageError, setImageError] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const hasValidImage = article.photo && article.photo !== 'null' && article.photo !== 'undefined' && article.photo !== 'None'
  const imageHeight = { large: 'h-56 sm:h-72 md:h-80', medium: 'h-44 sm:h-52', small: 'h-36 sm:h-40' }[size]

  const arabicTextStyle = "text-justify [text-align-last:right] [direction:rtl] leading-loose"

  const handleClick = (e: React.MouseEvent) => {
    if (newsletterId && userEmail) trackOpening(userEmail, newsletterId, article.article_id)
  }
  
  const handleShareClick = (e: React.MouseEvent, articleId: number) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (newsletterId && userEmail) {
      trackSharing(userEmail, newsletterId, articleId).catch(() => {});
    }
    setShowShareModal(true);
  }

  const shareButtonClass = "absolute z-10 p-2 bg-white/95 dark:bg-slate-900/95 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all backdrop-blur-sm border border-slate-200 dark:border-slate-700 print:hidden"
  const shareIconClass = "w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"

  if (featured) {
    return (
      <>
        <Link href={`/news/${article.article_id}`} onClick={handleClick}
          className="group flex flex-col md:flex-row bg-white border border-slate-200 hover:border-blue-300 transition-all duration-300 overflow-hidden relative print:block print:mb-8 print:border-b print:border-gray-300 print:pb-6 print:break-inside-avoid"
        >
          <button type="button" onClick={(e) => handleShareClick(e, article.article_id)}
            className={`${shareButtonClass} top-4 right-4`} aria-label="Share article">
            <Share2 className={shareIconClass} />
          </button>
          <div className={`relative w-full md:w-1/2 ${imageHeight} overflow-hidden bg-linear-to-br from-blue-100 to-purple-100 print:bg-white print:h-64`}>
            {article.category && (
              <span className="absolute top-4 left-4 z-10 px-2.5 py-1 bg-slate-600 text-white text-xs font-medium rounded-full shadow-sm">
                {article.category}
              </span>
            )}
            {hasValidImage && !imageError ? (
              <Image src={article.photo} alt={article.title} fill unoptimized loading="eager" priority={featured}
                className="object-cover transition-transform duration-700 group-hover:scale-105 print:object-contain"
                onError={() => setImageError(true)} sizes="(max-width: 768px) 100vw, 50vw" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center"><Newspaper className="h-20 w-20 text-slate-300 print:text-gray-400" /></div>
            )}
          </div>
          <div className="p-4 sm:p-6 md:p-8 md:w-1/2 flex flex-col justify-center">
            <p className={`text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed line-clamp-5 mb-4 print:text-base print:line-clamp-4 ${arabicTextStyle}`}>
              {article.summary}
            </p>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
              <time className="italic">{article.published_at ? formatShortDate(article.published_at) : "Recent"}</time>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShareClick(e, article.article_id); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors md:hidden print:hidden">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Link>
        
        {showShareModal && (
          <ShareModal 
            articleId={article.article_id}
            articleTitle={article.title}
            articleSummary={article.summary}
            articleUrl={typeof window !== 'undefined' ? `${window.location.origin}/news/${article.article_id}` : `/news/${article.article_id}`}
            onClose={() => setShowShareModal(false)}
            onShowToast={onShowToast}
          />
        )}
      </>
    )
  }

  return (
    <>
      <Link href={`/news/${article.article_id}`} onClick={handleClick}
        className={`group block bg-white border border-slate-200 hover:border-blue-300 transition-all duration-300 overflow-hidden relative print:block print:mb-4 print:break-inside-avoid`}
      >
        <button type="button" onClick={(e) => handleShareClick(e, article.article_id)}
          className={`${shareButtonClass} top-3 right-3`} aria-label="Share article">
          <Share2 className={shareIconClass} />
        </button>
        <div className={`relative ${imageHeight} overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 print:bg-white`}>
          {article.category && (
            <span className="absolute top-3 left-3 z-10 px-2 py-0.5 bg-slate-600 text-white text-[10px] font-medium rounded-full shadow-sm">
              {article.category}
            </span>
          )}
          {hasValidImage && !imageError ? (
            <Image src={article.photo} alt={article.title} fill unoptimized loading="lazy"
              className="object-cover transition-transform duration-700 group-hover:scale-105 print:object-contain"
              onError={() => setImageError(true)} sizes={size === "medium" ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 100vw, 33vw'} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Newspaper className={`text-slate-300 ${size === "medium" ? 'h-10 w-10' : 'h-14 w-14'} print:text-gray-400`} />
            </div>
          )}
        </div>
        <div className="p-4 sm:p-5">
          <p className={`text-slate-600 leading-relaxed ${size === "medium" ? 'line-clamp-4 text-sm sm:text-base' : 'line-clamp-3 text-sm sm:text-base'} print:text-base ${arabicTextStyle}`}>
            {article.summary}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <time className="italic text-xs sm:text-sm">{article.published_at ? formatShortDate(article.published_at) : "Recent"}</time>
            <span className="font-medium text-indigo-600 group-hover:underline text-xs sm:text-sm print:text-black">Read more →</span>
          </div>
        </div>
      </Link>
      
      {showShareModal && (
        <ShareModal 
          articleId={article.article_id}
          articleTitle={article.title}
          articleSummary={article.summary}
          articleUrl={typeof window !== 'undefined' ? `${window.location.origin}/news/${article.article_id}` : `/news/${article.article_id}`}
          onClose={() => setShowShareModal(false)}
          onShowToast={onShowToast}
        />
      )}
    </>
  )
}

// ============================================================
// 🔧 MAIN COMPONENT: StudentDashboard - MINIMAL MONITOR FIX
// ============================================================
export default function StudentDashboard() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [userName, setUserName] = useState<string>("Student")
  const [userProfilePicture, setUserProfilePicture] = useState<string>("")
  const [edition, setEdition] = useState<number>(0)
  const [newsletterDate, setNewsletterDate] = useState<string>("")
  const [newsletterId, setNewsletterId] = useState<number | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [feedbackReaction, setFeedbackReaction] = useState<'like' | 'dislike' | null>(null)
  const [feedbackComment, setFeedbackComment] = useState<string>('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState<'success' | 'error' | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string>('')

  const [showArchive, setShowArchive] = useState(false)
  const [archiveItems, setArchiveItems] = useState<NewsletterArchiveItem[]>([])
  const [loadingArchive, setLoadingArchive] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const ARTICLES_PER_PAGE = 6

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [monitorStatus, setMonitorStatus] = useState<'disconnected' | 'connected' | 'sending'>('disconnected')
  
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => { setToast({ message, type }) }, [])
  const monitorTimer = useRef<NodeJS.Timeout | null>(null)

  const getUser = (): UserInfo | null => {
    if (typeof window === 'undefined') return null
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) return JSON.parse(userStr)
    } catch {}
    return null
  }

  const getUserEmail = (): string => {
    if (typeof window === 'undefined') return ''
    try { const userStr = localStorage.getItem('user'); if (userStr) return JSON.parse(userStr)?.email || '' } catch {}
    return ''
  }

  // ✅ Build dashboard data for backend monitor - STABLE with useCallback
  const buildMonitorData = useCallback((): MonitorDashboardData => {
    const email = getUserEmail()
    return {
      student_name: userName,
      student_profile_picture: userProfilePicture || undefined,
      edition,
      newsletter_date: newsletterDate,
      newsletter_id: newsletterId || 0,
      articles: articles.map(a => ({
        article_id: a.article_id,
        title: a.title,
        summary: a.summary,
        photo: a.photo || null,  // ✅ Uses your original processImageUrl
        position: a.position,
        published_at: a.published_at
      })),
      last_seen: new Date().toISOString(),
      userEmail: email
    }
  }, [userName, userProfilePicture, edition, newsletterDate, newsletterId, articles])

  // ✅ Send heartbeat to backend - ONLY when data is ready
  const sendHeartbeat = useCallback(async () => {
    const email = getUserEmail()
    // ✅ Don't send if: no email, no newsletter loaded, still loading, or no articles yet
    if (!email || !newsletterId || loading || articles.length === 0) {
      setMonitorStatus('disconnected')
      return
    }
    
    setMonitorStatus('sending')
    const data = buildMonitorData()
    
    // ✅ Debug log - check console to see what's being sent
    console.log('📡 Sending heartbeat:', { 
      email, 
      hasArticles: data.articles.length > 0, 
      edition: data.edition,
      student: data.student_name
    })
    
    const success = await sendMonitorHeartbeat(email, data)
    setMonitorStatus(success ? 'connected' : 'disconnected')
  }, [newsletterId, loading, articles.length, buildMonitorData])

  // ✅ Heartbeat useEffect - runs ONLY when data is ready
  useEffect(() => {
    // Wait for dashboard to fully load before sending heartbeat
    if (loading || !newsletterId || articles.length === 0) return

    // Send immediately on first load
    sendHeartbeat()
    
    // Then send every 5 seconds
    monitorTimer.current = setInterval(sendHeartbeat, 60000)
    
    return () => {
      if (monitorTimer.current) clearInterval(monitorTimer.current)
    }
  }, [loading, newsletterId, articles.length, sendHeartbeat])

  // ✅ Load functions (UNCHANGED)
  const loadArchive = useCallback(async () => {
    const email = getUserEmail(); if (!email) return
    setLoadingArchive(true)
    try {
      const res = await axios.get<NewsletterArchiveItem[]>(`${API_BASE_URL}${ARCHIVE_ENDPOINT}`, {
        params: { email }, headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, timeout: 15000
      })
      setArchiveItems(res.data)
    } catch (err) { console.error('Archive error:', err) } finally { setLoadingArchive(false) }
  }, [])

  const loadSpecificNewsletter = useCallback(async (id: number) => {
    setLoading(true); setError(null)
    const email = getUserEmail()
    if (!email) { setError('Please login first'); setLoading(false); return }
    try {
      const res = await axios.get<BackendDashboardResponse>(`${API_BASE_URL}${NEWSLETTER_DETAILS_ENDPOINT}`, {
        params: { newsletter_id: id }, headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, timeout: 25000
      })
      const data = res.data
      setArticles((data.articles || []).map(mapBackendToArticle))
      setUserName(data.student_name || "Student")
      
      const rawProfilePic = data.student_profile_picture || ""
      let processedProfilePic = ""
      
      if (rawProfilePic && rawProfilePic !== 'null' && rawProfilePic !== 'undefined' && rawProfilePic !== 'None') {
        if (rawProfilePic.startsWith('http://') || rawProfilePic.startsWith('https://')) {
          processedProfilePic = rawProfilePic
        } else if (rawProfilePic.startsWith('/')) {
          processedProfilePic = `${API_BASE_URL}${rawProfilePic}`
        } else {
          processedProfilePic = `${API_BASE_URL}/${rawProfilePic}`
        }
      }
      setUserProfilePicture(processedProfilePic)
      setEdition(data.edition || 0)
      setNewsletterDate(data.newsletter_date || "")
      setNewsletterId(data.newsletter_id || null)
      setLastUpdate(data.last_update || data.updated_at || "")
      setCurrentPage(1)
    } catch (err: any) { setError(err?.response?.data?.detail || err?.message || "Failed to load") } finally { setLoading(false) }
  }, [])

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError(null)
    const email = getUserEmail()
    if (!email) { setError('Please login first'); setLoading(false); return }
    try {
      const res = await axios.get<BackendDashboardResponse>(`${API_BASE_URL}${DASHBOARD_ENDPOINT}?email=${encodeURIComponent(email)}`, {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, timeout: 25000
      })
      const data = res.data
      setArticles((data.articles || []).map(mapBackendToArticle))
      setUserName(data.student_name || "Student")
      
      const rawProfilePic = data.student_profile_picture || ""
      let processedProfilePic = ""
      
      if (rawProfilePic && rawProfilePic !== 'null' && rawProfilePic !== 'undefined' && rawProfilePic !== 'None') {
        if (rawProfilePic.startsWith('http://') || rawProfilePic.startsWith('https://')) {
          processedProfilePic = rawProfilePic
        } else if (rawProfilePic.startsWith('/')) {
          processedProfilePic = `${API_BASE_URL}${rawProfilePic}`
        } else {
          processedProfilePic = `${API_BASE_URL}/${rawProfilePic}`
        }
      }
      
      setUserProfilePicture(processedProfilePic)
      setEdition(data.edition || 0)
      setNewsletterDate(data.newsletter_date || "")
      setNewsletterId(data.newsletter_id || null)
      setLastUpdate(data.last_update || data.updated_at || "")
      setCurrentPage(1)
    } catch (err: any) { setError(err?.response?.data?.detail || err?.message || "Unable to load newsletter.") } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const submitFeedback = async () => {
    if (!feedbackReaction && !feedbackComment.trim()) { 
      setFeedbackStatus('error'); 
      setFeedbackMessage('Please select a reaction or write a comment.'); 
      return 
    }
    const email = getUserEmail()
    if (!email || !newsletterId) { 
      setFeedbackStatus('error'); 
      setFeedbackMessage('Login required.'); 
      return 
    }
    
    setSubmittingFeedback(true); 
    setFeedbackStatus(null); 
    setFeedbackMessage('')
    
    try {
      const res = await axios.post<FeedbackSuccessResponse>(
        `${API_BASE_URL}${FEEDBACK_ENDPOINT}`, 
        {
          comment: feedbackComment.trim() || undefined, 
          reaction: feedbackReaction || undefined, 
          newsletter_id: newsletterId, 
          email
        }, 
        { 
          headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
            'ngrok-skip-browser-warning': 'true' 
          }, 
          timeout: 15000 
        }
      )
      
      if (res.data.status === 'success') {
        setFeedbackStatus('success'); 
        setFeedbackMessage(res.data.message || 'Thank you! 🎉')
        
        try {
          if (newsletterId) {
            await loadSpecificNewsletter(newsletterId)
          } else {
            await loadDashboard()
          }
        } catch (refreshErr) {
          console.warn('⚠️ Could not refresh dashboard after feedback:', refreshErr)
        }
        
        setTimeout(() => { 
          setFeedbackReaction(null); 
          setFeedbackComment(''); 
          setFeedbackStatus(null); 
          setFeedbackMessage('') 
        }, 3000)
      } else {
        throw new Error(res.data.message)
      }
    } catch (err: any) { 
      setFeedbackStatus('error'); 
      setFeedbackMessage(err?.response?.data?.detail || 'Failed to submit.') 
    } finally { 
      setSubmittingFeedback(false) 
    }
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const handlePrintNewsletter = () => {
    if (typeof window !== 'undefined') {
      const interactiveElements = document.querySelectorAll('.no-print, button, .print\\:hidden')
      interactiveElements.forEach(el => { (el as HTMLElement).style.display = 'none' })
      window.print()
      setTimeout(() => { interactiveElements.forEach(el => { (el as HTMLElement).style.display = '' }) }, 500)
    }
  }

  const sortedArticles = [...articles].sort((a, b) => a.position - b.position)
  const totalPages = Math.ceil(sortedArticles.length / ARTICLES_PER_PAGE)
  const getPageArticles = () => {
    const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE
    return sortedArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE)
  }
  const pageArticles = getPageArticles()
  const featured = pageArticles[0]
  const firstTwo = pageArticles.slice(1, 3)
  const nextThree = pageArticles.slice(3, 6)

  const goToNextPage = () => { if (currentPage < totalPages) { setCurrentPage(prev => prev + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) } }
  const goToPrevPage = () => { if (currentPage > 1) { setCurrentPage(prev => prev - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) } }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" /></div>
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <p className="text-slate-600">{error}</p>
        <Button onClick={loadDashboard}><RefreshCcw className="mr-2 h-4 w-4" /> Try Again</Button>
      </div>
    </div>
  )

  const user = getUser()
  const userEmail = getUserEmail()
  const userRole = user?.role || 'student'
  const userId = user?.user_id

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 font-sans text-slate-900 pt-20 sm:pt-24 pb-8 relative print:bg-white print:pt-0">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: white !important; color: black !important; zoom: 0.85; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          nav, [role="navigation"], .navbar, header nav, .sticky, .no-print, button, .print\\:hidden, [aria-label="Share article"] { display: none !important; }
          .print\\:block { display: block !important; } .print\\:bg-white { background: white !important; } .print\\:text-black { color: black !important; }
          a { text-decoration: none !important; color: black !important; } .shadow-xl { box-shadow: none !important; } .border { border-color: #000 !important; }
          img { page-break-inside: avoid; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:h-64 { height: 16rem !important; } .print\\:object-contain { object-fit: contain !important; }
          .profile-picture-container { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } .print\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .print\\:break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ✅ Monitor Status Indicator */}
      <div className="fixed top-4 right-4 z-40 print:hidden">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm border ${
          monitorStatus === 'connected' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' :
          monitorStatus === 'sending' ? 'bg-blue-100 border-blue-200 text-blue-700' :
          'bg-slate-100 border-slate-200 text-slate-500'
        }`}>
          {monitorStatus === 'connected' ? (
            <><Signal className="h-3 w-3 text-emerald-500" /> Live</>
          ) : monitorStatus === 'sending' ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</>
          ) : (
            <><WifiOff className="h-3 w-3" /> Offline</>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-white shadow-xl border border-slate-200 print:shadow-none print:border-0 print:max-w-full">
        <div className="h-2 bg-blue-600 print:bg-blue-600"></div>
        <div className="px-4 sm:px-8 md:px-12 py-6 md:py-8 print:px-4 print:py-4">
          
          {/* User Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 md:mb-10 print:mb-4">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-md border-2 border-white profile-picture-container print:border print:border-black overflow-hidden shrink-0">
                {userProfilePicture ? (
                  <img 
                    src={userProfilePicture.replace('@', '%40')}
                    alt={userName} 
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerText = getInitials(userName)
                        parent.classList.add('text-white', 'print:text-black', 'flex', 'items-center', 'justify-center')
                      }
                    }}
                  />
                ) : (
                  <span className="text-white print:text-black">{getInitials(userName)}</span>
                )}
              </div>
             
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-slate-900 print:text-black truncate">{userName}</p>
                <p className="text-xs sm:text-sm text-slate-500 print:text-gray-600">{formatDateWithTime(newsletterDate)}</p>
                {lastUpdate && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 print:hidden">
                    <Clock className="h-3 w-3 shrink-0" />
                    Updated: {formatLastUpdate(lastUpdate)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex flex-row gap-2 print:hidden sm:flex-wrap sm:justify-end">
              <Button variant="outline" onClick={() => { loadArchive(); setShowArchive(true) }} className="gap-1.5 sm:gap-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-10">
                <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>Archive</span>
                {archiveItems.length > 0 && <span className="hidden sm:inline">({archiveItems.length})</span>}
              </Button>
              <Button variant="outline" onClick={handlePrintNewsletter} className="gap-1.5 sm:gap-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-10" title="Print this newsletter">
                <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>Print</span>
              </Button>
            </div>
          </div>

          {/* Title */}
          <div className="mb-8 sm:mb-12 text-center print:mb-6">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-3 print:text-3xl print:text-black">MTI Newsletter</h1>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400 print:text-gray-600">
              <span className="uppercase tracking-widest">Edition #{edition}</span>
              <span>·</span>
              <span>{formatDateWithTime(newsletterDate)}</span>
            </div>
            <div className="mt-4 h-1 w-16 bg-blue-600 mx-auto print:bg-blue-600"></div>
          </div>

          {/* Articles */}
          <main className="mb-8 sm:mb-12 space-y-4 sm:space-y-6 print:mb-4 print:space-y-4">
            {pageArticles.length > 0 ? (
              <>
                {featured && <NewsItem article={featured} newsletterId={newsletterId} userEmail={userEmail} size="large" featured onShowToast={showToast} />}
                {firstTwo.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 print:grid print:grid-cols-2 print:gap-4 print:mb-4">
                    {firstTwo.map(a => <NewsItem key={a.article_id} article={a} newsletterId={newsletterId} userEmail={userEmail} size="medium" onShowToast={showToast} />)}
                  </div>
                )}
                {nextThree.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 print:grid print:grid-cols-3 print:gap-4">
                    {nextThree.map(a => <NewsItem key={a.article_id} article={a} newsletterId={newsletterId} userEmail={userEmail} size="medium" onShowToast={showToast} />)}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 sm:py-20 text-slate-500 print:text-gray-600">No articles this week.</div>
            )}
          </main>

          {/* Pagination Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8 print:hidden">
              <Button variant="outline" onClick={goToPrevPage} disabled={currentPage === 1}
                className="gap-1 sm:gap-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl disabled:opacity-50 text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-10">
                <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                    {page}
                  </button>
                ))}
              </div>
              <Button variant="outline" onClick={goToNextPage} disabled={currentPage === totalPages}
                className="gap-1 sm:gap-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl disabled:opacity-50 text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-10">
                <span className="hidden sm:inline">Next</span> <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Feedback */}
          <div className="border-t border-slate-100 pt-8 sm:pt-10 pb-8 print:hidden">
            <div className="max-w-2xl mx-auto">
              <div className="relative mb-5">
                <input type="text" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full h-12 sm:h-14 pl-4 sm:pl-6 pr-12 sm:pr-14 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-700 placeholder:text-slate-400 transition-all text-sm sm:text-base"
                  disabled={submittingFeedback}
                />
                <button onClick={submitFeedback} disabled={submittingFeedback || (!feedbackReaction && !feedbackComment.trim())}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-colors rounded-xl hover:bg-slate-100">
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="flex justify-center items-center gap-4 sm:gap-6">
                <button onClick={() => setFeedbackReaction(feedbackReaction === 'like' ? null : 'like')}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all ${feedbackReaction === 'like' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'}`} disabled={submittingFeedback}>
                  <Heart className={`h-5 w-5 sm:h-6 sm:w-6 ${feedbackReaction === 'like' ? 'fill-current' : ''}`} />
                </button>
                <div className="w-px h-8 bg-slate-200"></div>
                <button onClick={() => setFeedbackReaction(feedbackReaction === 'dislike' ? null : 'dislike')}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all ${feedbackReaction === 'dislike' ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-500 hover:bg-slate-50'}`} disabled={submittingFeedback}>
                  <ThumbsDown className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
              {feedbackMessage && (
                <div className={`mt-4 p-3 rounded-xl flex items-center gap-3 ${feedbackStatus === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {feedbackStatus === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
                  <p className="text-sm">{feedbackMessage}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer - print:hidden */}
          <div className="border-t border-slate-100 pt-6 pb-2 text-center print:hidden">
            <p className="text-xs text-slate-400 font-medium tracking-wider">WWW.MTI.EDU.EG</p>
          </div>
        </div>
      </div>

      {/* ✅ ChatbotWidget with proper user data */}
      <ChatbotWidget 
        userEmail={userEmail}
        userRole={userRole as any}
        userId={userId}
        currentDashboard="student"
        API_BASE_URL={API_BASE_URL}
      />

      {showArchive && <ArchiveModal archiveItems={archiveItems} userEmail={userEmail} onClose={() => setShowArchive(false)} onSelectNewsletter={loadSpecificNewsletter} />}
    </div>
  )
}