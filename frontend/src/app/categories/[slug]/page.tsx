'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Clock, Loader2, AlertTriangle, ImageOff } from "lucide-react"
import axios from 'axios'

// ============================================================
// 🔧 API CONFIGURATION
// ============================================================
const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'
const CATEGORY_ARTICLES_ENDPOINT = '/categories'

// ============================================================
// 🔧 SLUG ↔ CATEGORY_ID MAPPING
// ============================================================
const SLUG_TO_CATEGORY_ID: Record<string, number> = {
  "Medical": 3, "Sports": 5, "Technology": 4, "DigitalMedia": 2,
  "Announcements": 6, "Commerce": 1, "Engineering": 7,
}

const CATEGORY_META: Record<string, { title: string; description: string; emoji: string }> = {
  Medical: { title: "Medical", description: "Health news...", emoji: "👨🏼‍⚕️" },
  Sports: { title: "Sports", description: "Latest results...", emoji: "⚽" },
  Technology: { title: "Technology", description: "Tech innovations...", emoji: "👨🏼‍💻" },
  DigitalMedia: { title: "Digital Media", description: "Creative media...", emoji: "🎬" },
  Announcements: { title: "Announcements", description: "Official updates...", emoji: "📢" },
  Commerce: { title: "Commerce", description: "Business news...", emoji: "💵" },
  Engineering: { title: "Engineering", description: "Engineering projects...", emoji: "👷🏼‍♂️" },
}

// ============================================================
// 🔧 TYPES
// ============================================================
interface BackendArticle {
  article_id: number; title: string; summary: string;
  photo: string | null; image_url?: string; original_media_url?: string;
  published_at: string; source?: string;
}
interface BackendCategoryResponse {
  category_name: string; category_id: number; total_count: number; articles: BackendArticle[];
}
interface FrontendArticle {
  article_id: number; title: string; summary: string; image: string | null;
  published_at: string; category: string; content: string; source?: string;
}

// ============================================================
// 🔧 HELPERS: Image Processing
// ============================================================
const processImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url === '' || url === 'null' || url === 'undefined') return null
  if (url.startsWith('C:') || url.startsWith('D:') || url.startsWith('E:')) {
    const filename = url.split(/[/\\]/).pop() || 'image'
    return `https://via.placeholder.com/600x400/e0e7ff/4f46e5?text=${encodeURIComponent(filename)}`
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  
  const normalized = url.replace(/\\/g, '/')
  const cleanUrl = normalized.startsWith('/') ? normalized : `/${normalized}`
  
  if (typeof window !== 'undefined' && cleanUrl.startsWith('/')) {
    const fullUrl = `${window.location.origin}${cleanUrl}`
    return fullUrl
  }
  return cleanUrl
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ============================================================
// 🔧 MAIN COMPONENT
// ============================================================
export default function CategorySlugPage() {
  const params = useParams(); const router = useRouter(); const slug = params?.slug as string
  const [articles, setArticles] = useState<FrontendArticle[]>([])
  const [categoryTitle, setCategoryTitle] = useState(""); const [categoryEmoji, setCategoryEmoji] = useState("")
  const [totalCount, setTotalCount] = useState(0); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) { setError('Category slug missing'); setLoading(false); return }
    const fetchCategory = async () => {
      setLoading(true); setError(null)
      try {
        const categoryId = SLUG_TO_CATEGORY_ID[slug]
        if (!categoryId) throw new Error(`Unknown category: ${slug}`)
        const res = await axios.get<BackendCategoryResponse>(
          `${API_BASE_URL}${CATEGORY_ARTICLES_ENDPOINT}/${categoryId}/all`,
          { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, timeout: 15000 }
        )
        const meta = CATEGORY_META[slug]
        setCategoryTitle(meta?.title || res.data.category_name)
        setCategoryEmoji(meta?.emoji || '📰')
        setTotalCount(res.data.total_count || res.data.articles?.length || 0)
        
        const frontendArticles: FrontendArticle[] = (res.data.articles || []).map(a => ({
          article_id: a.article_id, title: a.title, summary: a.summary,
          image: processImageUrl(a.photo || a.image_url || a.original_media_url),
          published_at: a.published_at, category: slug, content: a.summary || '', source: a.source
        }))
        setArticles(frontendArticles)
      } catch (err: any) {
        console.error('❌ Fetch error:', err?.message); setError(err?.response?.data?.detail || err?.message || 'Failed')
      } finally { setLoading(false) }
    }
    fetchCategory()
  }, [slug])

  // ✅ Loading State - Updated background
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600"/>
    </div>
  )
  
  // ✅ Error State - Updated background + blue button
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 gap-4 p-6">
      <AlertTriangle className="h-12 w-12 text-red-500"/>
      <p className="text-red-500">{error}</p>
      <Button onClick={() => router.back()} className="bg-blue-600 hover:bg-blue-700 text-white">← Go Back</Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-serif mt-20 pb-20">
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* ✅ Back Button - Blue instead of ghost */}
        <Button 
          onClick={() => router.back()} 
          className="mb-6 bg-blue-600 hover:bg-blue-700 text-white border-0"
        >
          <ArrowLeft className="h-4 w-4 mr-2"/>Back
        </Button>
        
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">{categoryEmoji}</span>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">{categoryTitle}</h1>
            {totalCount > 0 && <p className="text-sm text-zinc-500">{totalCount} article{totalCount!==1?'s':''}</p>}
          </div>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 mb-10">{CATEGORY_META[slug]?.description}</p>

        {articles.length === 0 ? (
          <div className="text-center py-20">
            <ImageOff className="h-16 w-16 mx-auto mb-4 text-zinc-400"/>
            <p className="text-zinc-500 dark:text-zinc-400">No articles yet</p>
            <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => router.push('/categories')}>
              Browse Categories
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {articles.map((item) => (
              <Link key={item.article_id} href={`/news/${item.article_id}`} className="group block">
                {/* ✅ FIXED: Uniform fixed height + corrected border class */}
                <div className="w-full h-56 overflow-hidden rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="eager"
                      decoding="async"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement
                        t.onerror = null
                        t.src = `https://via.placeholder.com/600x400/e0e7ff/4f46e5?text=Image+Error`
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400 bg-zinc-100 dark:bg-zinc-900">
                      <ImageOff className="h-10 w-10" />
                    </div>
                  )}
                </div>
                
                {/* Article Info */}
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(item.published_at)}</p>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm line-clamp-3">{item.summary}</p>
                  <span className="text-xs text-blue-600 dark:text-blue-400 group-hover:underline">Read more →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}