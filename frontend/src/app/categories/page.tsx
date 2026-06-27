'use client'

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle, Database, Search, X, Filter, Calendar, Tag, ChevronDown, ChevronUp } from "lucide-react"
import axios from 'axios'

// ============================================================
// 🔧 API CONFIGURATION
// ============================================================
const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'
const CATEGORIES_PREVIEW_ENDPOINT = '/categories/preview'

// ============================================================
// 🔧 ARABIC → ENGLISH FACULTY MAPPING (Exact + Variations)
// ============================================================
const ARABIC_TO_ENGLISH_FACULTY: Record<string, string> = {
  // Exact matches from your list
  "كلية الاعلام": "Mass Communication",
  "كلية الإدارة وذكاء الأعمال": "Management & Business",
  "كلية الصيدلة": "Pharmacy",
  "كلية التمريض": "Nursing",
  "كلية الحاسبات والذكاء الإصطناعي": "Computers & AI",
  "كلية الحاسبات والذكاء الاصطناعي": "Computers & AI", // Variation without hamza on ya
  "كلية الهندسة": "Engineering",
  "كلية العلاج الطبيعي": "Physical Therapy",
  "كلية طب الفم و الأسنان": "Dental Medicine",
  "كلية طب الفم والأسنان": "Dental Medicine", // Variation without spaces
  "كلية الطب البشري": "Medicine",
  
  // Short forms / fallbacks
  "الاعلام": "Mass Communication",
  "الإدارة وذكاء الأعمال": "Management & Business",
  "الصيدلة": "Pharmacy",
  "التمريض": "Nursing",
  "الحاسبات والذكاء الإصطناعي": "Computers & AI",
  "الحاسبات والذكاء الاصطناعي": "Computers & AI",
  "الهندسة": "Engineering",
  "العلاج الطبيعي": "Physical Therapy",
  "طب الفم و الأسنان": "Dental Medicine",
  "طب الفم والأسنان": "Dental Medicine",
  "الطب البشري": "Medicine",
}

// ✅ Ultra-safe helper: Returns English if found, otherwise returns the original Arabic name
const getFacultyForDisplay = (arabicName: string | null | undefined): string => {
  if (!arabicName || arabicName.trim() === '') return ""
  
  const cleanName = arabicName.trim()
  
  // Try exact match first
  if (ARABIC_TO_ENGLISH_FACULTY[cleanName]) {
    return ARABIC_TO_ENGLISH_FACULTY[cleanName]
  }
  
  // Try removing "كلية " prefix
  const withoutPrefix = cleanName.replace(/^كلية\s+/, '').trim()
  if (ARABIC_TO_ENGLISH_FACULTY[withoutPrefix]) {
    return ARABIC_TO_ENGLISH_FACULTY[withoutPrefix]
  }
  
  // ✅ FALLBACK: Return the original Arabic name (never show "Unknown")
  return cleanName
}

// ✅ Safe toLowerCase that handles Arabic/Unicode without crashing
const safeToLower = (str: string | null | undefined): string => {
  if (!str) return ''
  try {
    return str.toLocaleLowerCase('en') // More robust than toLowerCase()
  } catch {
    return str
  }
}

// ============================================================
// 🔧 SLUG ↔ CATEGORY_ID MAPPING
// ============================================================
const SLUG_TO_CATEGORY_ID: Record<string, number> = {
  "Medical": 3, "Sports": 5, "Technology": 4,
  "DigitalMedia": 2, "Announcements": 6, "Commerce": 1, "Engineering": 7,
}
const CATEGORY_ID_TO_SLUG: Record<number, string> = Object.fromEntries(
  Object.entries(SLUG_TO_CATEGORY_ID).map(([slug, id]) => [id, slug])
)

// ============================================================
// 🔧 CATEGORY METADATA
// ============================================================
const CATEGORY_META: Record<string, { title: string; description: string; emoji: string }> = {
  Medical:        { title: "Medical",        description: "Health news, medical research, and wellness updates.", emoji: "👨🏼‍⚕️" },
  Sports:         { title: "Sports",         description: "Latest results, highlights, and sports news.", emoji: "⚽" },
  Technology:     { title: "Technology",     description: "Tech innovations, labs, and digital campus news.", emoji: "👨🏼‍💻" },
  DigitalMedia:   { title: "Digital Media",  description: "Creative media, design, and digital content.", emoji: "🎬" },
  Announcements:  { title: "Announcements",  description: "Official updates and notices from the university.", emoji: "📢" },
  Commerce:       { title: "Commerce",       description: "Business news, entrepreneurship, and market insights.", emoji: "💵" },
  Engineering:    { title: "Engineering",    description: "Engineering projects, innovations, and research.", emoji: "👷🏼‍♂️" },
}

// ============================================================
// 🔧 TYPES
// ============================================================
interface BackendArticle {
  article_id: number
  title: string
  summary: string
  photo: string | null
  published_at: string
  content: string
  category?: string
  open_counter?: number
  share_counter?: number
  position?: number
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
  image: string | null
  published_at: string
  category: string
  facultyDisplay: string  // ✅ Display name (English if mapped, else Arabic)
  facultyRaw: string      // ✅ Original Arabic from backend (for debugging)
  publishedDate: Date
}

interface FrontendCategory {
  slug: string
  title: string
  description: string
  emoji: string
  news: FrontendArticle[]
}

// ============================================================
// 🔧 HELPERS
// ============================================================
const processImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url === '') return null
  if (url.startsWith('C:') || (url.startsWith('/') && !url.startsWith('http'))) {
    const filename = url.split(/[/\\]/).pop() || 'image'
    return `https://via.placeholder.com/600x400/6366f1/ffffff?text=${encodeURIComponent(filename)}`
  }
  if (url.startsWith('http')) return url
  if (url.startsWith('/static')) return `${API_BASE_URL}${url}`
  return url
}

const mapBackendToArticle = (backend: BackendArticle, categorySlug: string): FrontendArticle => {
  const facultyRaw = backend.category || backend.source || ""
  
  return {
    article_id: backend.article_id,
    title: backend.title,
    summary: backend.summary,
    image: processImageUrl(backend.photo),
    published_at: backend.published_at,
    category: categorySlug,
    facultyRaw: facultyRaw,  // Keep original for debugging
    facultyDisplay: getFacultyForDisplay(facultyRaw),  // Display name for UI
    publishedDate: new Date(backend.published_at),
  }
}

const mapBackendCategoryToFrontend = (backend: BackendCategoryPreview): FrontendCategory | null => {
  const slug = CATEGORY_ID_TO_SLUG[backend.category_id]
  if (!slug) return null
  const meta = CATEGORY_META[slug]
  if (!meta) return null
  
  return {
    slug, title: meta.title, description: meta.description, emoji: meta.emoji,
    news: backend.articles.map(a => mapBackendToArticle(a, slug)),
  }
}

// ============================================================
// 🔧 MODERN MULTI-SELECT COMPONENT (Fixed)
// ============================================================
function ModernMultiSelect({ 
  options, 
  selected, 
  onChange, 
  placeholder,
  icon 
}: { 
  options: string[], 
  selected: string[], 
  onChange: (values: string[]) => void,
  placeholder: string,
  icon?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-slate-800 hover:border-blue-500 transition-colors text-sm"
      >
        <span className="flex items-center gap-2 truncate">
          {icon}
          {selected.length > 0 
            ? `${selected.length} selected` 
            : <span className="text-zinc-400">{placeholder}</span>
          }
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      
      {isOpen && (
        <>
          <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-60 overflow-auto">
            {options.length === 0 ? (
              <div className="p-4 text-sm text-zinc-400 text-center">
                No faculties found in articles
              </div>
            ) : options.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggleOption(opt)}
                  className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{opt}</span>
              </label>
            ))}
          </div>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
        </>
      )}
    </div>
  )
}

// ============================================================
// 🔧 MAIN COMPONENT
// ============================================================
export default function CategoriesPage() {
  const [categories, setCategories] = useState<FrontendCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFaculties, setSelectedFaculties] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true)
      setError(null)
      try {
        const fullUrl = `${API_BASE_URL}${CATEGORIES_PREVIEW_ENDPOINT}`
        const response = await axios.get<BackendCategoryPreview[]>(fullUrl, {
          headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          timeout: 15000,
        })

        // ✅ DEBUG: Log raw backend response
        console.log('🔍 Raw backend categories:', response.data)
        response.data.forEach((cat, idx) => {
          console.log(`📄 Category ${idx}:`, {
            category_id: cat.category_id,
            category_name: cat.category_name,
            firstArticle: cat.articles[0]?.category || cat.articles[0]?.source
          })
        })

        const frontendCategories: FrontendCategory[] = response.data
          .map(cat => mapBackendCategoryToFrontend(cat))
          .filter((c): c is FrontendCategory => c !== null)
        
        console.log('✅ Mapped frontend categories:', frontendCategories.map(c => ({
          slug: c.slug,
          articleCount: c.news.length,
          sampleFaculty: c.news[0]?.facultyDisplay
        })))
        
        setCategories(frontendCategories)
      } catch (err: any) {
        console.error('❌ Fetch Error:', err)
        setError(err?.response?.data?.detail || err?.message || "Failed to load categories")
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  const availableFaculties = useMemo(() => {
    const faculties = new Set<string>()
    categories.forEach(cat => {
      cat.news.forEach(article => {
        if (article.facultyDisplay && article.facultyDisplay.trim() !== '') {
          faculties.add(article.facultyDisplay)
        }
      })
    })
    const result = Array.from(faculties).sort()
    console.log('🏫 Available faculties for filter:', result)
    return result
  }, [categories])

  const availableCategories = Object.keys(CATEGORY_META)

  const filteredCategories = useMemo(() => {
    let result = [...categories]
    
    // 🔍 Safe Text Search
    if (searchQuery.trim()) {
      const query = safeToLower(searchQuery)
      result = result.map(cat => ({
        ...cat,
        news: cat.news.filter(article => 
          safeToLower(article.title).includes(query) ||
          safeToLower(article.summary).includes(query)
        )
      })).filter(cat => cat.news.length > 0)
    }
 
    
    // 📂 Category Filter
    if (selectedCategories.length > 0) {
      result = result.filter(cat => selectedCategories.includes(cat.slug))
    }
    
    // 📅 Date Filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const cutoff = dateFilter === 'week' 
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      result = result.map(cat => ({
        ...cat,
        news: cat.news.filter(article => article.publishedDate >= cutoff)
      })).filter(cat => cat.news.length > 0)
    }
    
    // 🔥 Sort
    if (sortBy !== 'newest') {
      result = result.map(cat => ({
        ...cat,
        news: [...cat.news].sort((a, b) => {
          if (sortBy === 'oldest') {
            return a.publishedDate.getTime() - b.publishedDate.getTime()
          } else if (sortBy === 'title') {
            return a.title.localeCompare(b.title, 'en')
          }
          return b.publishedDate.getTime() - a.publishedDate.getTime()
        })
      }))
    }
    
    return result
  }, [categories, searchQuery, selectedFaculties, selectedCategories, dateFilter, sortBy])

  const clearFilter = (type: 'faculty' | 'category', value: string) => {
    if (type === 'faculty') {
      setSelectedFaculties(prev => prev.filter(f => f !== value))
    } else {
      setSelectedCategories(prev => prev.filter(c => c !== value))
    }
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedFaculties([])
    setSelectedCategories([])
    setDateFilter('all')
    setSortBy('newest')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-lg font-medium text-zinc-600 dark:text-zinc-300">Loading content...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center space-y-4 max-w-md mx-auto px-6">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="text-lg text-red-500">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-slate-950 dark:to-slate-900 font-serif mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">

        {/* 🔝 Header */}
        <div className="text-center border-b border-zinc-200 dark:border-zinc-800 pb-12 mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <Search className="h-4 w-4" />
            Explore Campus Content
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-900 dark:text-white">Categories</h1>
          <p className="mt-6 text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Discover all newsletter articles, organized by category and faculty.
          </p>
        </div>

        {/* 🔍 Search & Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-6 mb-12 border border-zinc-200 dark:border-zinc-800">
          
          {/* Search Input */}
          <div className="relative mb-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search articles, topics, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-4 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 mb-6 transition-colors"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide advanced filters' : 'Show advanced filters'}
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {/* Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
           
              

              {/* 📂 Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <Database className="h-4 w-4 text-zinc-400" /> Category
                </label>
                <ModernMultiSelect
                  options={availableCategories.map(cat => CATEGORY_META[cat].title)}
                  selected={selectedCategories.map(cat => CATEGORY_META[cat].title)}
                  onChange={(values) => {
                    const slugs = values.map(displayName => 
                      Object.entries(CATEGORY_META).find(([_, meta]) => meta.title === displayName)?.[0]
                    ).filter(Boolean) as string[]
                    setSelectedCategories(slugs)
                  }}
                  placeholder="Filter by category..."
                />
              </div>

              {/* 📅 Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-400" /> Time Period
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>

              {/* 🔥 Sort By */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <ChevronDown className="h-4 w-4 text-zinc-400 rotate-90" /> Sort
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title A-Z</option>
                </select>
              </div>
            </div>
          )}

          {/* Active Filters */}
          {(selectedFaculties.length > 0 || selectedCategories.length > 0 || dateFilter !== 'all' || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-sm font-medium text-zinc-500">Active:</span>
              
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                  🔍 "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {selectedFaculties.map(f => (
                <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-sm">
                  🏫 {f}
                  <button onClick={() => clearFilter('faculty', f)} className="hover:bg-emerald-200 rounded-full p-0.5"><X className="h-3.5 w-3.5" /></button>
                </span>
              ))}
              {selectedCategories.map(c => (
                <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                  📂 {CATEGORY_META[c].title}
                  <button onClick={() => clearFilter('category', c)} className="hover:bg-purple-200 rounded-full p-0.5"><X className="h-3.5 w-3.5" /></button>
                </span>
              ))}
              {dateFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full text-sm">
                  📅 {dateFilter === 'week' ? '7 days' : '30 days'}
                  <button onClick={() => setDateFilter('all')} className="hover:bg-amber-200 rounded-full p-0.5"><X className="h-3.5 w-3.5" /></button>
                </span>
              )}
              <button onClick={clearAllFilters} className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5">Clear all</button>
            </div>
          )}
        </div>

        {/* 📋 Articles */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <Database className="h-20 w-20 text-zinc-300 mx-auto mb-6" />
            <p className="text-xl text-zinc-500">No articles match your filters</p>
            <Button variant="outline" onClick={clearAllFilters} className="mt-4 rounded-xl">Reset filters</Button>
          </div>
        ) : (
          <div className="space-y-16">
            {filteredCategories.map((category) => (
              <section key={category.slug} className="group">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{category.emoji}</span>
                    <div>
                      <h2 className="text-3xl font-bold">{category.title}</h2>
                      <p className="text-zinc-500 mt-1">{category.description}</p>
                    </div>
                  </div>
                  <Button asChild className="bg-blue-600 hover:bg-blue-700 rounded-xl">
                    <Link href={`/categories/${category.slug}`}>View All →</Link>
                  </Button>
                </div>

                <div className="flex gap-6 overflow-x-auto pb-6 scroll-smooth">
                  {category.news.map((item) => (
                    <Link key={item.article_id} href={`/news/${item.article_id}`} className="w-72 sm:w-80 shrink-0 group/card">
                      <div className="relative h-48 bg-zinc-200 rounded-2xl overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-sm text-zinc-400">📰</div>
                        )}
                        {/* Category badge only */}
                        <span className="absolute top-3 left-3 px-3 py-1.5 bg-black/60 text-white text-xs rounded-full">
                          {CATEGORY_META[item.category]?.title || item.category}
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="font-bold text-lg line-clamp-2 min-h-[3rem]">{item.title}</h3>
                        <p className="mt-2 text-sm text-zinc-500 line-clamp-2">{item.summary}</p>
                        {/* ✅ Faculty shown below (not on image) */}
                        {item.facultyDisplay && (
                          <p className="mt-3 text-xs text-blue-600 font-medium flex items-center gap-1">
                            <Tag className="h-3 w-3" /> {item.facultyDisplay}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-zinc-400">
                          {item.publishedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}