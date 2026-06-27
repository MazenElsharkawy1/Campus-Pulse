'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Loader2,
  AlertTriangle,
  RefreshCcw,
  Play,
  Pause,
  Maximize2,
  X,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import axios from 'axios'

// ============================================================
// 🔧 API CONFIGURATION
// ============================================================
const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'

// ============================================================
// TYPES
// ============================================================
type VideoItem = {
  video_id: number
  stream_url: string
  title: string
  description: string
  thumbnail: string
}

function normalizeVideos(payload: unknown): VideoItem[] {
  const rawArray = Array.isArray(payload) ? payload : []

  return rawArray.map((item: any, index: number) => ({
    video_id: item.video_id || index + 1,

    // 👇 هنا الحل
    stream_url: `/media/video_${item.video_id}.mp4`,

    title: item.title || `Video ${index + 1}`,
    description: item.description || '',
    thumbnail: item.thumbnail || '',
  }))
}

// ============================================================
// COMPONENT: Fullscreen Modal
// ============================================================
function VideoModal({ video, onClose }: { video: VideoItem; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    videoRef.current?.play().catch(() => {})
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl bg-black" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
          <X className="h-6 w-6" />
        </button>
        <video ref={videoRef} src={video.stream_url} controls autoPlay className="w-full max-h-[85vh]" />
      </div>
    </div>
  )
}

// ============================================================
// COMPONENT: Video Card
// ============================================================
function VideoCard({ video, onOpenModal }: { video: VideoItem; onOpenModal: (v: VideoItem) => void }) {
  const [isHovered, setIsHovered] = useState(false)
  const [error, setError] = useState(false)

  if (error) return null // Hide broken videos

  return (
    <div
      className="group relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenModal(video)}
    >
      {/* ✅ Video Preview instead of icon */}
      <video
        src={video.stream_url}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        preload="metadata"
        playsInline
        onError={() => setError(true)}
      />

      {/* Overlay */}
      <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 flex items-center justify-center ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center transition-all duration-200 hover:scale-110">
          <Play className="h-7 w-7 text-white fill-white ml-1" />
        </div>
      </div>

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <h3 className="text-white font-bold text-sm line-clamp-2">{video.title}</h3>
      </div>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function GalleryPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalVideo, setModalVideo] = useState<VideoItem | null>(null)

  const fetchVideos = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('🚀 Fetching gallery from:', `${API_BASE_URL}/gallery`)
      
      const response = await axios.get(`${API_BASE_URL}/gallery`, {
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        timeout: 15000,
      })

      console.log('📦 Backend Response:', response.data)

      const normalized = normalizeVideos(response.data)
      console.log(`✅ Loaded ${normalized.length} videos`)
      
      setVideos(normalized)
      
    } catch (err: any) {
      console.error('❌ Error fetching gallery:', err)
      setError('فشل في تحميل الفيديوهات. تأكد من أن السيرفر يعمل.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  return (
    <div className="min-h-screen mt-20 bg-white dark:bg-slate-950 font-serif text-zinc-900 dark:text-zinc-100">
      <div className="max-w-7xl mx-auto px-6 py-12 mt-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-12 pb-8 border-b border-zinc-200 dark:border-zinc-800">
          <div>
          
            <h1 className="text-4xl font-black tracking-tight uppercase text-zinc-900 dark:text-white">
              Video Gallery
            </h1>
          </div>
          <Button variant="outline" onClick={fetchVideos} disabled={loading} className="border-zinc-300 dark:border-zinc-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-10 p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-4">
            <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
            <div>
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              <button onClick={fetchVideos} className="text-sm text-red-600 underline mt-1">إعادة المحاولة</button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-zinc-500">جاري تحميل الفيديوهات...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && videos.length === 0 && (
          <div className="text-center py-20 bg-zinc-50 dark:bg-slate-900 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700">
            <Video className="h-16 w-16 mx-auto text-zinc-400 mb-4" />
            <h2 className="text-xl font-bold text-zinc-600 dark:text-zinc-300">لا توجد فيديوهات حالياً</h2>
            <p className="text-zinc-500 mt-2">تحقق من البيانات في الـ Backend.</p>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.video_id} video={video} onOpenModal={setModalVideo} />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalVideo && (
        <VideoModal video={modalVideo} onClose={() => setModalVideo(null)} />
      )}
    </div>
  )
}