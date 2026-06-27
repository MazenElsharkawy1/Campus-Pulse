'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import { ChevronDown, ChevronUp, Bell, AlertTriangle, Loader2, X } from 'lucide-react'
import axios from 'axios'

import 'swiper/css'
import 'swiper/css/pagination'

// ============================================================
// 🔧 API CONFIGURATION
// ============================================================
const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'
const HOME_ENDPOINT = '/api/v1/home'

// ============================================================
// 🔧 CATEGORIES
// ============================================================
const CATEGORIES: Array<{ id: string; name: string; label: string; emoji: string; slug: string }> = [
  { id: "Medical",        name: "Medical",        label: "Medical",        emoji: "👨🏼‍⚕️", slug: "Medical" },
  { id: "Sports",         name: "Sports",         label: "Sports",         emoji: "⚽",      slug: "Sports" },
  { id: "Technology",     name: "Technology",     label: "Technology",     emoji: "👨🏼‍💻",  slug: "Technology" },
  { id: "DigitalMedia",   name: "Digital Media",  label: "Digital Media",  emoji: "🎬",     slug: "DigitalMedia" },
  { id: "Announcements",  name: "Announcements",  label: "Announcements",  emoji: "📢",     slug: "Announcements" },
  { id: "Commerce",       name: "Commerce",       label: "Commerce",       emoji: "💵",     slug: "Commerce" },
  { id: "Engineering",    name: "Engineering",    label: "Engineering",    emoji: "👷🏼‍♂️",  slug: "Engineering" },
]

// ============================================================
// 🔧 BACKEND RESPONSE TYPE
// ============================================================
interface BackendPost {
  id: number
  article_id?: number
  title: string
  summary: string
  content?: string
  category: string
  photo: string | null
  image_url?: string
  photo_url?: string
  date?: string
  published_at?: string
  created_at?: string
  source?: 'announcement' | 'stakeholder'
  is_announcement?: boolean
}

interface BackendHomeResponse {
  posts: BackendPost[]
  total_count: number
  last_updated: string
}

// ============================================================
// 🔧 FRONTEND TYPE
// ============================================================
interface Announcement {
  id: number
  title: string
  summary: string
  date: string
  urgent: boolean
  content: string
  image: string | null
  category: string
  source?: 'announcement' | 'stakeholder'
}

// ============================================================
// 🔧 HELPER: معالجة مسار الصورة
// ============================================================
const processImageUrl = (photo: any): string | null => {
  // ✅ FIXED: Safety check for non-string types
  if (typeof photo !== 'string' || !photo) return null
  
  if (photo.startsWith('C:') || (photo.startsWith('/') && !photo.startsWith('http'))) {
    const filename = photo.split(/[/\\]/).pop() || 'image'
    return `https://via.placeholder.com/800x400/6366f1/ffffff?text=${encodeURIComponent(filename)}`
  }
  
  if (photo.startsWith('http')) return photo
  
  if (photo.startsWith('/static')) {
    return `${API_BASE_URL}${photo}`
  }
  
  return photo
}

// ============================================================
// 🔧 HELPER: تحويل بيانات الـ Backend
// ============================================================
const mapBackendToAnnouncement = (backend: BackendPost): Announcement => {
  const rawDate = backend.date || backend.published_at || backend.created_at
  const fallbackDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  const formattedDate = rawDate 
    ? new Date(rawDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : fallbackDate

  const urgentKeywords = ['urgent', 'عاجل', 'مهم', 'هام', 'تنبيه', 'deadline', 'موعد نهائي', 'فوري']
  const titleToCheck = backend.title || backend.summary || ''
  const isUrgent = urgentKeywords.some(keyword => 
    titleToCheck.toLowerCase().includes(keyword.toLowerCase())
  )

  return {
    id: backend.article_id || backend.id,
    title: backend.title || backend.summary || 'No title',
    summary: backend.summary || '',
    date: formattedDate,
    urgent: isUrgent,
    // ✅ FIXED: Ensure content is always a string
    content: typeof backend.content === 'string' ? backend.content : 
             typeof backend.summary === 'string' ? backend.summary : 'No content available.',
    image: processImageUrl(backend.photo || backend.image_url || backend.photo_url),
    category: backend.category || '',
    source: backend.source || (backend.is_announcement ? 'announcement' : 'stakeholder'),
  }
}

// ============================================================
// 🔧 ANNOUNCEMENT CARD (WITH IMAGE)
// ============================================================
const AnnouncementCard = ({ 
  bulletin, 
  isExpanded, 
  onToggle 
}: { 
  bulletin: Announcement; 
  isExpanded: boolean; 
  onToggle: (id: number) => void 
}) => {
  // ✅ FIXED: Safe content handling
  const contentStr = String(bulletin.content || '');
  const previewText = bulletin.summary || (contentStr.length > 150 ? contentStr.substring(0, 150) + '...' : contentStr);
  
  return (
    <div className={`bg-white dark:bg-slate-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-zinc-400 dark:hover:border-zinc-500 flex flex-col h-full ${bulletin.source === 'stakeholder' ? 'border-t-4 border-t-indigo-500' : ''}`}>
      {/* Image Banner */}
      {bulletin.image ? (
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <Image
            src={bulletin.image}
            alt={bulletin.title}
            fill
            unoptimized
            className="object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                parent.classList.add('bg-gradient-to-br', 'from-indigo-100', 'to-purple-100', 'flex', 'items-center', 'justify-center')
                parent.innerHTML = '<span class="text-4xl">📰</span>'
              }
            }}
          />
          {bulletin.urgent && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white text-[10px] font-bold tracking-wider rounded-full shadow-lg">
              <AlertTriangle className="h-3 w-3" />
              URGENT
            </div>
          )}
          {/* ✅ Source Badge on Image */}
          {bulletin.source === 'stakeholder' && (
             <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600/90 text-white text-[10px] font-bold tracking-wider rounded-full shadow-lg backdrop-blur-sm">
               Stakeholder
             </div>
          )}
        </div>
      ) : (
        <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
          <span className="text-5xl">📰</span>
        </div>
      )}

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col">
        {bulletin.source !== 'announcement' && (
          <h3 className="text-base font-bold text-black dark:text-white leading-tight mb-2 line-clamp-2">
            {bulletin.title}
          </h3>
        )}
        
        {/* ✅ FIXED: Safe rendering of content */}
        <div className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {isExpanded ? (
             <div className="whitespace-pre-line">{contentStr}</div>
          ) : (
             <p className="line-clamp-3">{previewText}</p>
          )}
        </div>
        
        {/* Date + Category */}
        <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-400" />
            {bulletin.date}
          </span>
          {bulletin.category && bulletin.category.toLowerCase() !== 'general' && (
            <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px]">
              {bulletin.category}
            </span>
          )}
        </div>
      </div>

      {/* Expand Button */}
      {(contentStr.length > 150 || !isExpanded) && (
        <button
          onClick={() => onToggle(bulletin.id)}
          className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700"
        >
          {isExpanded ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Read full post</>}
        </button>
      )}
    </div>
  )
}

// ============================================================
// 🔧 ANNOUNCEMENT CARD (NO IMAGE)
// ============================================================
const AnnouncementCardNoImage = ({ 
  bulletin, 
  isExpanded, 
  onToggle 
}: { 
  bulletin: Announcement; 
  isExpanded: boolean; 
  onToggle: (id: number) => void 
}) => {
  // ✅ FIXED: Safe content handling
  const contentStr = String(bulletin.content || '');
  const previewText = bulletin.summary || (contentStr.length > 150 ? contentStr.substring(0, 150) + '...' : contentStr);

  return (
    <div className={`bg-white dark:bg-slate-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-zinc-400 dark:hover:border-zinc-500 ${bulletin.source === 'stakeholder' ? 'border-t-4 border-t-indigo-500' : ''}`}>
      {/* Header Bar */}
      <div className={`px-5 py-3 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 ${bulletin.source === 'stakeholder' ? 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30' : 'bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-slate-800 dark:to-slate-900'}`}>
        <div className="flex items-center gap-3">
          {/* ✅ Stakeholder Indicator */}
          {bulletin.source === 'stakeholder' && (
             <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
               Stakeholder
             </span>
          )}
          
          {bulletin.category && bulletin.category.toLowerCase() !== 'general' && (
            <span className="px-2.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-full">
              {bulletin.category}
            </span>
          )}
          {bulletin.urgent && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
              <AlertTriangle className="h-3 w-3" />
              URGENT
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-400" />
          {bulletin.date}
        </span>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        {bulletin.source !== 'announcement' && (
          <h3 className="text-lg font-bold text-black dark:text-white leading-snug">
            {bulletin.title}
          </h3>
        )}
        
        {/* ✅ FIXED: Safe rendering of content */}
        <div className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {isExpanded ? (
             <div className="whitespace-pre-line">{contentStr}</div>
          ) : (
             <p className="line-clamp-2">{previewText}</p>
          )}
        </div>
        
        {contentStr.length > 150 && (
          <button 
            onClick={() => onToggle(bulletin.id)}
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors mt-1"
          >
            {isExpanded ? <><ChevronUp className="h-4 w-4" /> Show less</> : <><ChevronDown className="h-4 w-4" /> Read full post</>}
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// 🔧 MAIN COMPONENT
// ============================================================
export default function Home() {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [Announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [AnnouncementsError, setAnnouncementsError] = useState<string | null>(null)

  // ============================================================
  // 🔧 FETCH ANNOUNCEMENTS FROM BACKEND
  // ============================================================
  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoadingAnnouncements(true)
      setAnnouncementsError(null)

      try {
        const fullUrl = `${API_BASE_URL}${HOME_ENDPOINT}`
        console.log('🚀 Fetching home feed from:', fullUrl)

        const response = await axios.get<BackendHomeResponse>(fullUrl, {
          headers: {
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          timeout: 15000,
        })

        console.log('✅ Home Response:', response.data)
        console.log('📦 Posts count:', response.data.posts?.length)

        const frontendAnnouncements: Announcement[] = 
          (response.data.posts || []).map(mapBackendToAnnouncement)

        setAnnouncements(frontendAnnouncements)

      } catch (err: any) {
        console.error('❌ Fetch Announcements Error:', {
          name: err?.name,
          message: err?.message,
          status: err?.response?.status,
           data: err?.response?.data,
        })

        const errorMessage =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load announcements. Please try again later."

        setAnnouncementsError(errorMessage)
      } finally {
        setLoadingAnnouncements(false)
      }
    }

    fetchAnnouncements()
  }, [])

  // ============================================================
  // 🔧 TOGGLE BULLETIN EXPAND/COLLAPSE
  // ============================================================
  const toggleBulletin = (id: number) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // ✅ FIXED: Separate posts by image presence
  const postsWithImage = Announcements.filter(p => p.image)
  const postsWithoutImage = Announcements.filter(p => !p.image)

  // ✅ Posts WITH images: Show only latest 4, sorted newest first
  const displayedPostsWithImage = [...postsWithImage]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4)

  // ✅ Posts WITHOUT images: Show all, sorted newest first (don't count toward the 4)
  const displayedPostsWithoutImage = [...postsWithoutImage]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // ============================================================
  // 🔧 MAIN UI
  // ============================================================
  return (
    <div className="min-h-screen bg-[#f8f5f0] dark:bg-slate-950 font-serif">

      {/* Hero Slider */}
      <section className="relative">
        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          loop
          className="h-[70vh] md:h-[80vh] w-full"
        >
          {['/slider/university1.webp', '/slider/university2.webp'].map((src, index) => (
            <SwiperSlide key={index}>
              <div className="relative h-full w-full">
                <Image
                  src={src}
                  alt="University campus"
                  fill
                  sizes="100vw"
                  className="object-cover brightness-[0.65]"
                  priority={index === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white">
                  <div className="uppercase text-xs tracking-[6px] mb-4 opacity-90">MTI University Daily Edition</div>
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tight drop-shadow-2xl leading-none">
                    Welcome to CampusPulse
                  </h1>
                  <p className="mt-6 text-xl md:text-2xl max-w-2xl font-light opacity-90">
                    Real-time news • Events • Announcements • Everything happening on campus
                  </p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* Announcements Section - ✅ FIXED: Full-width no-image posts on top, grid image posts below */}
      <section className="relative mt-16 mb-20 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Section Header */}
          <div className="mb-10 flex items-center gap-4">
            <div className="w-1.5 h-10 bg-red-600 rounded-full" />
            <Bell className="h-7 w-7 text-red-600" />
            <h2 className="text-3xl uppercase font-extrabold tracking-tight text-red-600">
              Announcements
            </h2>
          </div>

          {/* Loading State */}
          {loadingAnnouncements && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-red-500" />
            </div>
          )}

          {/* Error State */}
          {AnnouncementsError && !loadingAnnouncements && (
            <div className="flex items-center gap-4 p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <p>{AnnouncementsError}</p>
            </div>
          )}

          {/* ✅ Announcements List - FIXED LAYOUT & CONTENT LOGIC */}
          {!loadingAnnouncements && !AnnouncementsError && (
            <div className="space-y-8">
              
              {/* 1. Posts WITHOUT images - Full width at the top */}
              {displayedPostsWithoutImage.length > 0 && (
                <div className="space-y-5">
                  {displayedPostsWithoutImage.map((bulletin) => (
                    <AnnouncementCardNoImage 
                      key={bulletin.id} 
                      bulletin={bulletin}
                      isExpanded={expandedIds.has(bulletin.id)}
                      onToggle={toggleBulletin}
                    />
                  ))}
                </div>
              )}
              
              {/* 2. Posts WITH images - 2-column grid, latest 4 only */}
              {displayedPostsWithImage.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {displayedPostsWithImage.map((bulletin) => (
                    <AnnouncementCard 
                      key={bulletin.id} 
                      bulletin={bulletin}
                      isExpanded={expandedIds.has(bulletin.id)}
                      onToggle={toggleBulletin}
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {displayedPostsWithImage.length === 0 && displayedPostsWithoutImage.length === 0 && (
                <p className="text-center text-zinc-500 dark:text-zinc-400 py-16 italic">
                  No announcements at the moment. Check back later.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Explore by Section */}
      <section className="py-20 px-6 bg-white dark:bg-slate-900 border-t border-b border-zinc-300 dark:border-zinc-700">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="uppercase text-xs tracking-[4px] text-zinc-500 dark:text-zinc-400 mb-3">
              INSIDE TODAY'S PAPER
            </div>
            <h2 className="text-4xl font-bold text-black dark:text-white">Explore by Section</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group relative bg-white dark:bg-slate-900 border border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 p-4 text-center transition-all duration-300 rounded-xl hover:shadow-lg hover:-translate-y-1"
              >
                <div className="text-3xl mb-3 transition-transform group-hover:scale-110">
                  {cat.emoji}
                </div>
                <h3 className="font-semibold text-sm text-black dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {cat.label}
                </h3>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" size="lg" className="border-2 border-black dark:border-white" asChild>
              <Link href="/categories">All Sections →</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  ) 
}