'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Chart from 'chart.js/auto'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import {
  FileText, Loader2, AlertTriangle, RefreshCcw,
  Calendar, Database, ArrowLeft, ChevronDown,
  ChevronUp, Pencil, Check, X, Send, Wand2, Clock, CheckCircle, LogOut, Info,
  Monitor, Users, Signal, Globe, Download, FileDown, ThumbsUp, ThumbsDown, MessageSquare, Activity,
  Play,
  AlertCircle
} from 'lucide-react'
import axios from 'axios'
Chart.register(ChartDataLabels)
import ChatbotWidget from '@/components/chatbot/ChatbotWidget'


// ============================================================
// 🔧 Config & Constants
// ============================================================
const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'
const WS_BASE_URL = 'wss://rookier-ruffly-maxie.ngrok-free.dev'

const noChartReports = [
  'student_interests', 'dormant_articles_report', 'dormant_students_report',
  'my_reactions_history', 'my_activity_summary'
]

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
  { id: 'pinned_articles', title: 'Pinned Articles', icon: 'fa-table' },
  { id: 'students_only', title: 'Students Only', icon: 'fa-table' },
  { id: 'user_preferences_ranked', title: 'Content Preference Analytics', icon: 'fa-table' },
  { id: 'stakeholder_access_list', title: 'Stakeholder Access List', icon: 'fa-table' },
]

// ============================================================
// 🔧 QUERY METADATA
// ============================================================
export const QUERY_METADATA: Record<string, {
  designation: string;
  objective: string;
  logic: { input: string; processing: string; output: string };
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
    tags: ["Permissions", "Access-Control", "Compliance"]
  }
}

// ============================================================
// 🔧 HELPER: Get Query Metadata
// ============================================================
const getQueryMetadata = (viewName: string) => {
  if (!viewName) return null
  if (QUERY_METADATA[viewName]) return QUERY_METADATA[viewName]
  const lowerName = viewName.toLowerCase()
  const matchedKey = Object.keys(QUERY_METADATA).find(key => key.toLowerCase() === lowerName)
  if (matchedKey) return QUERY_METADATA[matchedKey]
  const cleanName = lowerName.replace(/_(report|view|query)$/, '')
  const matchedClean = Object.keys(QUERY_METADATA).find(
    key => key.toLowerCase().replace(/_(report|view|query)$/, '') === cleanName
  )
  if (matchedClean) return QUERY_METADATA[matchedClean]
  return null
}

// ============================================================
// 🔧 TYPES
// ============================================================
interface BackendArticle {
  article_id: number
  title: string
  summary: string
  content: string
  category: string
  category_id?: number | string
  photo?: string | null
  image_url?: string
  image?: string
  original_media_url?: string
  created_at: string
  published_at?: string
  status?: 'cleaned' | 'pending' | 'pinned' | 'published'
}

interface FrontendArticle {
  article_id: number
  title: string
  summary: string
  content: string
  category: string
  image: string | null
  created_at: string
  status: 'cleaned' | 'pending' | 'pinned' | 'published'
}

interface Article {
  article_id: number
  title: string
  summary: string
  photo?: string | null
  published_at?: string
  position: number
}

interface NewsletterData {
  student_name: string
  student_profile_picture?: string
  edition: number
  newsletter_date: string
  newsletter_id: number
  articles: Article[]
}

interface StakeholderSubmission {
  submission_id: number
  title: string
  content: string
  image_url?: string | null
  attachment_url?: string | null
  stakeholder_email: string
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at?: string
  rejection_reason?: string
  reviewer_email?: string
  published_at?: string
  version?: number
  reviewed_by_email?: string
  edited_by_email?: string
  edited_at?: string
  edit_reason?: string
  original_title?: string
  original_content?: string
}

type Tab = 'cleaned' | 'pending' | 'published' | 'submissions'
type MonitorPage = 'home' | 'reports' | 'queries' | 'monitor'

// ============================================================
// 🔧 HELPERS
// ============================================================
const processImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url === '' || url === 'null' || url === 'undefined') return null
  if (url.startsWith('C:') || url.startsWith('D:')) {
    const filename = url.split(/[/\\]/).pop() || 'image'
    return `https://via.placeholder.com/600x400/bfdbfe/1e40af?text=${encodeURIComponent(filename)}`
  }
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`
  return url
}

const CATEGORY_LABELS: Record<string, string> = {
  events: "Campus Events", sports: "Sports", tech: "Technology",
  research: "Research", announcements: "Announcements", clubs: "Student Clubs",
  Medical: "Medical", Technology: "Technology", "Digital Media": "Digital Media",
  Commerce: "Commerce", Engineering: "Engineering",
}

const CATEGORY_COLORS: Record<string, string> = {
  events: "bg-rose-100 text-rose-700", sports: "bg-emerald-100 text-emerald-700",
  tech: "bg-blue-100 text-blue-700", research: "bg-purple-100 text-purple-700",
  announcements: "bg-amber-100 text-amber-700", clubs: "bg-indigo-100 text-indigo-700",
  Medical: "bg-emerald-100 text-emerald-700", Technology: "bg-blue-100 text-blue-700",
  "Digital Media": "bg-purple-100 text-purple-700", Commerce: "bg-amber-100 text-amber-700",
  Engineering: "bg-indigo-100 text-indigo-700",
}

// ============================================================
// 🔧 TOAST COMPONENT
// ============================================================
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    success: 'bg-emerald-600 border-emerald-700',
    error: 'bg-red-600 border-red-700',
    info: 'bg-blue-600 border-blue-700'
  }

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertTriangle : Info

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-white border ${colors[type]} animate-in slide-in-from-bottom-5 fade-in duration-300`}>
      <Icon className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium max-w-sm">{message}</p>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ============================================================
// UI Button Helper
// ============================================================
function UIButton({ children, onClick, variant = 'default', size = 'md', className = '', disabled = false, type = 'button' }: any) {
  const baseClasses = "font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
  const variants: any = {
    default: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
    ghost: "hover:bg-blue-50 text-blue-600",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg",
  }
  const sizes: any = { sm: "px-3 py-1.5 text-xs", md: "px-6 py-3", lg: "px-8 py-4 text-lg" }
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}


// ============================================================
// 🔧 MonitorView Component - FULLY WORKING VERSION
// ✅ Matches your backend: /monitor/heartbeat, /active-users, /student-dashboard
// ✅ Sends { email, data } payload (NOT { email, content })
// ✅ Polls every 5 seconds, filters by 10s heartbeat timeout
// ✅ Exact newsletter preview with images, titles, no clipping
// ============================================================


export function MonitorView({ 
  onBack, 
  onShowToast,
}: { 
  onBack: () => void; 
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}) {
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [userDashboards, setUserDashboards] = useState<Record<string, any>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [lastError, setLastError] = useState<string>('');
  
  const pollTimer = useRef<NodeJS.Timeout | null>(null); 
  const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev';

  // ✅ Helpers
  const formatDate = (d: string) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return d; }
  };
  const formatShortDate = (d: string) => {
    if (!d) return "Recent";
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return d; }
  };
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ✅ EXACT SAME processImageUrl AS STUDENT DASHBOARD - NO @ ENCODING
  const processImageUrl = (url: string | null | undefined): string | null => {
    if (!url || url === '' || url === 'null' || url === 'undefined' || url === 'None') return null
    if (url.startsWith('C:') || url.startsWith('D:') || url.startsWith('E:')) {
      const filename = url.split(/[/\\]/).pop() || 'image'
      return `https://via.placeholder.com/600x400/e0e7ff/4f46e5?text=${encodeURIComponent(filename)}`
    }
    if (url.startsWith('http')) return url
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`
    return url
  };

  // ✅ MiniNewsletterPreview - Uses <Image unoptimized> for ngrok
  const MiniNewsletterPreview = ({ data }: { data: any }) => {
    const articles = data.articles || [];
    const sorted = [...articles].sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
    const featured = sorted[0];
    const others = sorted.slice(1);

    const profilePicUrl = processImageUrl(data.student_profile_picture);

    return (
      <div className="w-full min-w-[600px] bg-white font-sans text-slate-900 overflow-visible">
        <div className="w-full shadow-xl border border-slate-200 flex flex-col overflow-visible">
          <div className="h-2 bg-blue-600"></div>
          <div className="px-4 py-4">
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden border-2 border-white relative">
                {profilePicUrl ? (
                  <Image 
                    src={profilePicUrl} 
                    alt={data.student_name} 
                    width={48}
                    height={48}
                    unoptimized
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerText = getInitials(data.student_name || 'S');
                        parent.classList.add('flex', 'items-center', 'justify-center', 'text-white');
                      }
                    }}
                  />
                ) : (
                  <span className="text-white">{getInitials(data.student_name || 'S')}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{data.student_name || 'Student'}</p>
                <p className="text-xs text-slate-500">{formatDate(data.newsletter_date)}</p>
              </div>
            </div>

            {/* Title */}
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">MTI Newsletter</h1>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-1">
                <span className="uppercase tracking-widest">Edition #{data.edition || '-'}</span>
                <span>·</span>
                <span>{formatShortDate(data.newsletter_date)}</span>
              </div>
              <div className="mt-2 h-1 w-12 bg-blue-600 mx-auto"></div>
            </div>

            {/* Featured Article */}
            {featured && (
              <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-1/2 h-40 bg-gradient-to-br from-blue-100 to-purple-100 shrink-0 relative">
                    {featured.photo && processImageUrl(featured.photo) ? (
                      <Image 
                        src={processImageUrl(featured.photo)!} 
                        alt={featured.title} 
                        width={400}
                        height={160}
                        unoptimized
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<span class="text-3xl flex items-center justify-center h-full text-slate-400">📰</span>';
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-3xl text-slate-400">📰</div>
                    )}
                    {featured.category && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-600 text-white text-[10px] font-medium rounded-full shadow-sm z-10">
                        {featured.category}
                      </span>
                    )}
                  </div>
                  <div className="p-4 md:w-1/2 flex flex-col justify-center">
                    <h3 className="font-bold text-slate-900 mb-2 text-sm md:text-base line-clamp-2">{featured.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-3">{featured.summary}</p>
                    <div className="mt-2 text-[10px] text-slate-400">{formatShortDate(featured.published_at)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Articles */}
            {others.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {others.map((article: any) => {
                  const articlePhotoUrl = processImageUrl(article.photo);
                  return (
                    <div key={article.article_id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="h-28 bg-gradient-to-br from-blue-100 to-purple-100 relative">
                        {article.photo && articlePhotoUrl ? (
                          <Image 
                            src={articlePhotoUrl} 
                            alt={article.title} 
                            width={300}
                            height={112}
                            unoptimized
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<span class="text-2xl flex items-center justify-center h-full text-slate-400">📰</span>';
                              }
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-2xl text-slate-400">📰</div>
                        )}
                        {article.category && (
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-slate-600 text-white text-[8px] font-medium rounded-full shadow-sm z-10">
                            {article.category}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-semibold text-slate-900 text-xs mb-1 line-clamp-2">{article.title}</h4>
                        <p className="text-[10px] text-slate-600 line-clamp-2">{article.summary}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {articles.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <span className="text-3xl block mb-2">📭</span>
                <p className="text-sm">No articles this week.</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 tracking-wider">WWW.MTI.EDU.EG</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ✅ FIXED: fetchActiveUsers - NO userDashboards dependency, NO client-side filter
  const fetchActiveUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/monitor/active-users`, {
        headers: { 
          'Accept': 'application/json', 
          'ngrok-skip-browser-warning': 'true' 
        },
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      // ✅ Trust backend - it already filters by heartbeat timeout
      const users = data.active_users || data.users || [];
      
      console.log('👥 Active users from backend:', users);
      
      setActiveUsers(users);
      setConnectionStatus('connected');
      setLastError('');
      
      // Fetch dashboard data for each active user
      for (const userId of users.slice(0, 5)) {
        try {
          const dashboardRes = await fetch(
            `${API_BASE_URL}/monitor/student-dashboard?user_id=${encodeURIComponent(userId)}`,
            { headers: { 'ngrok-skip-browser-warning': 'true' } }
          );
          if (dashboardRes.ok) {
            const dashboardData = await dashboardRes.json();
            console.log(`📦 Dashboard for ${userId}:`, {
              hasArticles: dashboardData.articles?.length > 0,
              edition: dashboardData.edition,
              student: dashboardData.student_name,
              firstArticlePhoto: dashboardData.articles?.[0]?.photo,
              allPhotos: dashboardData.articles?.map((a: any) => a.photo)
            });
            setUserDashboards(prev => ({ ...prev, [userId]: dashboardData }));
          } else {
            console.warn(`⚠️ Failed to fetch dashboard for ${userId}: ${dashboardRes.status}`);
          }
        } catch (e) {
          console.warn(`⚠️ Error fetching dashboard for ${userId}:`, e);
        }
      }
    } catch (err: any) {
      console.error('Monitor fetch error:', err);
      setConnectionStatus('error');
      setLastError(err?.message || 'Failed to connect to monitor service');
      if (!lastError) {
        onShowToast('Monitor service unavailable - waiting for backend', 'info');
      }
    }
  }, [onShowToast, lastError]); // ✅ REMOVED userDashboards from dependencies

  // ✅ Poll every 5 seconds
  useEffect(() => {
    fetchActiveUsers();
    pollTimer.current = setInterval(fetchActiveUsers, 5000);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [fetchActiveUsers]);

  const handleRefresh = () => {
    setConnectionStatus('connecting');
    fetchActiveUsers();
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft className="h-5 w-5" /> Back to Dashboard
        </button>
      </div>

      <div className={`border rounded-2xl shadow-sm p-4 mb-6 ${
        connectionStatus === 'connected' ? 'bg-emerald-50 border-emerald-200' : 
        connectionStatus === 'error' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-500' :
              connectionStatus === 'error' ? 'bg-amber-500' : 'bg-blue-500 animate-pulse'
            }`}></div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Monitor className="h-5 w-5 text-slate-600" /> Live Student Monitor
            </h2>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' :
              connectionStatus === 'error' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {connectionStatus === 'connected' ? `● ${activeUsers.length} students online` :
               connectionStatus === 'error' ? '● Waiting for backend' : '● Connecting...'}
            </span>
            <button onClick={handleRefresh} disabled={connectionStatus === 'connecting'}
              className="text-xs flex items-center px-2 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50">
              <RefreshCcw className={`h-3 w-3 mr-1 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
        {connectionStatus === 'error' && (
          <div className="mt-3 p-3 bg-white border border-amber-200 rounded-lg text-xs text-amber-700">
            <p className="font-medium mb-1">⚠️ Monitor service not responding</p>
            <p className="text-[10px]">Backend should have: <code className="bg-amber-100 px-1 rounded">GET /monitor/active-users</code></p>
          </div>
        )}
      </div>

      {connectionStatus === 'connected' && activeUsers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeUsers.map((userId) => {
            const data = userDashboards[userId];
            return (
              <div key={userId} className="rounded-xl overflow-visible shadow-lg border border-slate-200 bg-white">
                {data ? (
                  <>
                    <div className="max-h-[600px] overflow-y-auto border-b border-slate-100">
                      <div className="p-2">
                        <MiniNewsletterPreview data={data} />
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Signal className="h-3 w-3 text-emerald-500" /> {data.student_name || 'Student'} • Edition #{data.edition || '-'}
                      </span>
                      <span>{data.last_seen ? new Date(data.last_seen).toLocaleTimeString() : '-'}</span>
                    </div>
                  </>
                ) : (
                  <div className="h-[500px] flex items-center justify-center bg-slate-50">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : connectionStatus === 'connected' ? (
        <div className="flex flex-col items-center justify-center h-[40vh] bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Users className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">No students currently viewing newsletters</p>
          <p className="text-slate-400 text-sm mt-1">Dashboards will appear here when students open their dashboard</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[40vh] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          {connectionStatus === 'connecting' ? (
            <><Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" /><p className="text-slate-600">Connecting to monitor service...</p></>
          ) : (
            <><AlertCircle className="h-10 w-10 text-amber-500 mb-4" /><p className="text-slate-600 font-medium mb-2">Waiting for backend</p>
            <p className="text-slate-400 text-sm text-center max-w-sm mb-4">The monitor endpoint isn't responding.</p>
            <button onClick={handleRefresh} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" /> Try Again
            </button></>
          )}
        </div>
      )}
    </div>
  );
}
// ============================================================
// Article Card Component
// ============================================================
function ArticleCard({ 
  article, 
  onPublish,
  onShowToast
}: { 
  article: FrontendArticle
  onPublish?: (id: number, summary: string) => Promise<void>
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editingSummary, setEditingSummary] = useState(false)
  const [summary, setSummary] = useState(article.summary)
  const [tempSummary, setTempSummary] = useState(article.summary)
  const [publishing, setPublishing] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleSaveSummary = () => { setSummary(tempSummary); setEditingSummary(false) }
  const handleCancelSummary = () => { setTempSummary(summary); setEditingSummary(false) }

  const handlePublish = async () => {
    if (!onPublish) return
    setPublishing(true)
    await onPublish(article.article_id, summary)
    setPublishing(false)
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col h-full">
      <div className="relative h-52 w-full bg-blue-100 dark:bg-slate-800 overflow-hidden">
        {article.image && !imageError ? (
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            onError={(e) => {
              console.error('❌ Image load failed:', article.image)
              setImageError(true)
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-blue-300 dark:text-slate-600 tracking-widest uppercase bg-blue-50 dark:bg-slate-900">
            No Image
          </div>
        )}
        <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold ${CATEGORY_COLORS[article.category] || 'bg-blue-100 text-blue-700'}`}>
          {CATEGORY_LABELS[article.category] || article.category}
        </div>
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${
          article.status === 'cleaned' ? 'bg-blue-100 text-blue-700' :
          article.status === 'pending' ? 'bg-amber-100 text-amber-700' :
          'bg-emerald-100 text-emerald-700'
        }`}>
          {article.status.toUpperCase()}
        </div>
      </div>

      <div className="p-7 space-y-5 flex-1 flex flex-col">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">{article.title}</h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(article.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Summary</p>
            {!editingSummary && onPublish && (
              <button onClick={() => { setTempSummary(summary); setEditingSummary(true) }} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
          </div>
          {editingSummary ? (
            <div className="space-y-3">
              <textarea value={tempSummary} onChange={(e) => setTempSummary(e.target.value)} rows={4} autoFocus className="w-full text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-2">
                <Button onClick={handleSaveSummary} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-4 flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Save</Button>
                <Button onClick={handleCancelSummary} size="sm" variant="outline" className="rounded-xl h-9 px-4 flex items-center gap-1.5"><X className="h-3.5 w-3.5" /> Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{summary}</p>
          )}
        </div>

        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors">
          {expanded ? <><ChevronUp className="h-4 w-4" /> Hide Full Article</> : <><ChevronDown className="h-4 w-4" /> Read Full Article</>}
        </button>

        {expanded && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{article.content}</p>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto">
          {article.status === 'pinned' || article.status === 'pending' && onPublish && (
            <Button 
              onClick={handlePublish} 
              disabled={publishing || editingSummary} 
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {publishing ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing...</> : <><Send className="h-4 w-4" /> Publish</>}
            </Button>
          )}
          {article.status === 'cleaned' && (
            <div className="w-full h-11 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl font-semibold flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800">
              <Wand2 className="h-4 w-4" /> Ready for AI
            </div>
          )}
          {article.status === 'published' && (
            <div className="w-full h-11 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl font-semibold flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-4 w-4" /> Published
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SubmissionCard Component
// ============================================================
function SubmissionCard({ 
  submission, 
  onReview,
  onEdit,
  onShowToast
}: { 
  submission: StakeholderSubmission
  onReview: (submission: StakeholderSubmission, status: 'approved' | 'rejected', reason?: string) => Promise<void>
  onEdit: (id: number, edits: { title?: string; content?: string; image_url?: string }, reason?: string) => Promise<void>
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTitle, setEditingTitle] = useState(submission.title)
  const [editingContent, setEditingContent] = useState(submission.content)
  const [editingImageUrl, setEditingImageUrl] = useState(submission.image_url || '')
  const [editReason, setEditReason] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const handleApprove = async () => {
    setReviewing(true)
    await onReview(submission, 'approved')
    setReviewing(false)
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      onShowToast('Please provide a reason for rejection', 'error')
      return
    }
    setReviewing(true)
    await onReview(submission, 'rejected', rejectionReason.trim())
    setReviewing(false)
    setShowRejectModal(false)
    setRejectionReason('')
  }

  const handleEditSubmit = async () => {
    if (!editingTitle.trim() || !editingContent.trim()) {
      onShowToast('Title and Content are required', 'error')
      return
    }
    
    setSavingEdit(true)
    const edits: { title?: string; content?: string; image_url?: string } = {}
    
    if (editingTitle !== submission.title) edits.title = editingTitle
    if (editingContent !== submission.content) edits.content = editingContent
    if (editingImageUrl !== submission.image_url) edits.image_url = editingImageUrl
    
    if (Object.keys(edits).length === 0) {
      onShowToast('No changes made', 'info')
      setSavingEdit(false)
      return
    }
    
    await onEdit(submission.submission_id, edits, editReason.trim() || undefined)
    setSavingEdit(false)
    setShowEditModal(false)
    setEditReason('')
  }

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return d; }
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col h-full">
        <div className="relative h-40 w-full bg-blue-100 dark:bg-slate-800 overflow-hidden">
          {submission.image_url && submission.image_url !== 'null' ? (
            <img src={submission.image_url} alt={submission.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-blue-300 dark:text-slate-600"><MessageSquare className="h-10 w-10" /></div>
          )}
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold ${submission.status === 'pending' ? 'bg-amber-100 text-amber-700' : submission.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {submission.status.toUpperCase()}
          </div>
        </div>

        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
              {submission.stakeholder_email?.[0]?.toUpperCase() || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{submission.stakeholder_email}</p>
              <p className="text-[10px] text-slate-500">{formatDate(submission.submitted_at)}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">{submission.title}</h3>
            <p className={`text-xs text-slate-600 dark:text-slate-400 leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>{submission.content}</p>
            {submission.content.length > 100 && (
              <button onClick={() => setExpanded(!expanded)} className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">
                {expanded ? '▲ Less' : '▼ More'}
              </button>
            )}
          </div>

          {submission.status === 'rejected' && submission.rejection_reason && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">❌ Reason:</p>
              <p className="text-xs text-red-700 dark:text-red-300 line-clamp-2">{submission.rejection_reason}</p>
            </div>
          )}

          {submission.status === 'pending' && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
              <div className="flex gap-1.5">
                <UIButton 
                  onClick={() => {
                    setEditingTitle(submission.title)
                    setEditingContent(submission.content)
                    setEditingImageUrl(submission.image_url || '')
                    setShowEditModal(true)
                  }} 
                  disabled={reviewing}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50 py-1.5 rounded-lg font-medium text-xs flex items-center justify-center gap-1"
                  title="Edit post"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </UIButton>
                
                <UIButton 
                  onClick={handleApprove} 
                  disabled={reviewing}
                  variant="success"
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg font-medium text-xs flex items-center justify-center gap-1"
                  title="Approve post"
                >
                  {reviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Approve
                </UIButton>
                
                <UIButton 
                  onClick={() => setShowRejectModal(true)} 
                  disabled={reviewing}
                  variant="danger"
                  size="sm"
                  className="flex-1 py-1.5 rounded-lg font-medium text-xs flex items-center justify-center gap-1"
                  title="Reject post"
                >
                  <X className="h-3 w-3" />
                  Reject
                </UIButton>
              </div>
            </div>
          )}

          {submission.status !== 'pending' && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
              <div className={`w-full py-1.5 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 ${
                submission.status === 'approved' 
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {submission.status === 'approved' ? <CheckCircle className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {submission.status === 'approved' ? 'Approved' : 'Rejected'}
                {submission.reviewed_at && <span className="text-[10px] opacity-75">• {formatDate(submission.reviewed_at)}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-red-200 dark:border-red-800 p-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Reject Submission</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Please provide a reason for rejection:</p>
            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="e.g., Content doesn't meet guidelines..." className="w-full h-20 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-red-500 outline-none resize-none mb-3" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowRejectModal(false); setRejectionReason('') }} className="flex-1 text-xs">Cancel</Button>
              <Button size="sm" onClick={handleReject} disabled={!rejectionReason.trim() || reviewing} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs">Reject</Button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-blue-200 dark:border-blue-800 p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="h-4 w-4 text-blue-600" />
                Edit Submission
              </h3>
              <button onClick={() => setShowEditModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">Title *</label>
              <input type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900 text-xs text-stone-700 dark:text-stone-300 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">Content *</label>
              <textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)} rows={4} className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900 text-xs text-stone-700 dark:text-stone-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">Image URL (optional)</label>
              <input type="url" value={editingImageUrl} onChange={(e) => setEditingImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900 text-xs text-stone-700 dark:text-stone-300 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">Edit Reason (optional)</label>
              <textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="Why are you editing this?" rows={2} className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900 text-xs text-stone-700 dark:text-stone-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)} disabled={savingEdit} className="flex-1 text-xs">Cancel</Button>
              <Button size="sm" onClick={handleEditSubmit} disabled={savingEdit || !editingTitle.trim() || !editingContent.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                {savingEdit ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving...</> : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================
// 🔧 ReportsSystem Component - UNCHANGED
// ============================================================
function ReportsSystem({ onBack, onShowToast }: { onBack: () => void; onShowToast: (message: string, type: 'success' | 'error' | 'info') => void }) {
  const [currentView, setCurrentView] = useState("")
  const [reportName, setReportName] = useState("")
  const [activeReport, setActiveReport] = useState<any>(null)
  const [lastFetchedData, setLastFetchedData] = useState<any>(null)
  const [displayOptions, setDisplayOptions] = useState({ table: true, bar: true, pie: false })
  const [loading, setLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  const barChartRef = useRef<HTMLCanvasElement>(null)
  const pieChartRef = useRef<HTMLCanvasElement>(null)
  const barChartInstance = useRef<any>(null)
  const pieChartInstance = useRef<any>(null)
  
  const isNoChart = noChartReports.includes(currentView)

  useEffect(() => {
    if (!currentView) return
    if (isNoChart) setDisplayOptions({ table: true, bar: false, pie: false })
    else setDisplayOptions(prev => ({ ...prev, bar: true }))
  }, [currentView])

  useEffect(() => {
    barChartInstance.current?.destroy()
    pieChartInstance.current?.destroy()
    if (!lastFetchedData?.length) return

    const keys = Object.keys(lastFetchedData[0])
    const labelKey = keys.find(k => k.includes('name') || k.includes('title') || k.includes('id')) || keys[0]
    const valueKey = keys.find(k => typeof lastFetchedData[0][k] === 'number' && k !== labelKey) || keys[1] || keys[0]
    
    const chartData = lastFetchedData.slice(0, 6)
    const labels = chartData.map((d: any) => String(d[labelKey]).substring(0, 20))
    const values = chartData.map((d: any) => Number(d[valueKey]) || 0)
    const datasetLabel = String(valueKey).replace(/_/g, ' ').toUpperCase()

    const BLUE_NAVY_COLORS = {
      background: ['#132B47', '#557669', '#6B8091', '#8C8A95', '#C59EA2', '#C97A53', '#673625', '#C9A875', '#BAA39D'],
      border: ['#1e293b', '#1e3a8a', '#1d4ed8', '#2563eb', '#0369a1', '#0284c7', '#0e7490', '#0891b2']
    }

    if (displayOptions.bar && barChartRef.current && !isNoChart) {
      barChartInstance.current = new Chart(barChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ 
            label: datasetLabel, 
            data: values,
            backgroundColor: BLUE_NAVY_COLORS.background, 
            barThickness: 35 
          }]
        },
        options: {
          responsive: true, 
          maintainAspectRatio: false,
          scales: { 
            x: { title: { display: true, text: String(labelKey).replace(/_/g, ' ').toUpperCase() }, grid: { display: false } }, 
            y: { title: { display: true, text: datasetLabel }, beginAtZero: true } 
          },
          plugins: { legend: { display: false }, datalabels: { anchor: 'center', align: 'center', color: '#fff', font: { weight: 'bold' } } }
        }
      })
    }

    if (displayOptions.pie && pieChartRef.current && !isNoChart) {
      pieChartInstance.current = new Chart(pieChartRef.current, {
        type: 'pie',
        data: {
          labels,
          datasets: [{ 
            label: datasetLabel, 
            data: values,
            backgroundColor: BLUE_NAVY_COLORS.background 
          }]
        },
        options: {
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'bottom' },
            datalabels: { 
              anchor: 'center', 
              align: 'center', 
              color: '#fff', 
              font: { weight: 'bold' }, 
              formatter: (value: number, context: any) => { 
                const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0)
                return ((Number(value) / total) * 100).toFixed(1) + "%" 
              } 
            }
          }
        }
      })
    }
    
    return () => { 
      barChartInstance.current?.destroy()
      pieChartInstance.current?.destroy() 
    }
  }, [lastFetchedData, displayOptions, currentView, reportName, isNoChart])

  const loadReport = async (viewName: string, title: string) => {
    setLoading(true); setActiveReport(viewName); setCurrentView(viewName); setReportName(title)
    try {
      const res = await axios.get(`${API_BASE_URL}/api/reports/api/report-data/${viewName}`, {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        timeout: 15000,
      })
      setLastFetchedData(res.data)
    } catch {
      setLastFetchedData([{ error: "Server offline", status: "offline" }])
      onShowToast('Failed to load report data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async (opts: { table: boolean; bar: boolean; pie: boolean }) => {
    if (!currentView) return onShowToast("Please select a report first.", 'error')
    setIsExporting(true)
    
    try {
      const includeParts = []
      if (opts.table) includeParts.push('table')
      if (opts.bar) includeParts.push('bar')
      if (opts.pie) includeParts.push('pie')
      
      const includeParam = includeParts.join(',') || 'table'
      const url = `${API_BASE_URL}/api/reports/api/generate-pdf/${currentView}?include=${encodeURIComponent(includeParam)}`
      
      console.log('📥 Downloading PDF with options:', includeParam)
      
      const response = await fetch(url, { 
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const dUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = dUrl
        a.download = `${currentView}_Report.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(dUrl)
        onShowToast('PDF downloaded successfully!', 'success')
      } else {
        const errorText = await response.text()
        onShowToast(`Server error: ${response.status}`, 'error')
      }
    } catch (e: any) {
      console.error('PDF download error:', e)
      onShowToast("Connection error", 'error')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors font-medium">
          <ArrowLeft className="h-5 w-5" /> Back to Dashboard
        </button>
      </div>
      
      <div className="flex bg-white rounded-2xl shadow-xl overflow-hidden min-h-[70vh] border border-stone-200">
        <div className="w-72 bg-slate-950 text-white p-6 overflow-y-auto border-r border-slate-800 flex-shrink-0 hidden md:block">
          <div className="text-center mb-6">
            <h2 className="text-orange-500 text-lg font-black tracking-widest uppercase">Reports Explorer</h2>
            <div className="h-1 w-12 bg-blue-500 mx-auto mt-2 rounded-full"></div>
          </div>
          <div className="space-y-1">
            {standardReports.map((report: any) => (
              <button key={report.id} onClick={() => loadReport(report.id, report.title)} 
                className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 text-sm ${activeReport === report.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] ${activeReport === report.id ? 'bg-white/20' : 'bg-slate-800'}`}>{report.num}</span>
                <span className="truncate">{report.title}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 p-6 md:p-8 bg-stone-50 overflow-y-auto">
          {/* ✅ FIXED: Title header for Reports */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 mb-6">
            <div className="flex justify-between items-center w-full border-b-2 border-orange-500 pb-4 mb-4 px-2">
              <img src="/logoL.jpeg" alt="Faculty" className="h-12 w-auto object-contain" />
              <img src="/logoR.jpeg" alt="Newsletter" className="h-14 w-auto object-contain" />
              <img src="/logoC.jpeg" alt="MTI" className="h-12 w-auto object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-center text-stone-800 uppercase">
              {loading ? 'Loading...' : currentView ? reportName.toUpperCase() : 'Select a Report'}
            </h2>
          </div>
          
          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-stone-200 dark:border-slate-800 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <span className="font-black text-blue-600 text-sm uppercase tracking-widest">Display Options:</span>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input type="checkbox" className="rounded" checked={displayOptions.table} onChange={e => setDisplayOptions(s => ({ ...s, table: e.target.checked }))} />
                <i className="fas fa-table"></i> Data Table
              </label>
              {!isNoChart && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input type="checkbox" className="rounded" checked={displayOptions.bar} onChange={e => setDisplayOptions(s => ({ ...s, bar: e.target.checked }))} />
                    <i className="fas fa-chart-bar"></i> Bar Chart
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input type="checkbox" className="rounded" checked={displayOptions.pie} onChange={e => setDisplayOptions(s => ({ ...s, pie: e.target.checked }))} />
                    <i className="fas fa-chart-pie"></i> Pie Chart
                  </label>
                </>
              )}
            </div>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
              <p className="text-stone-500 font-bold animate-pulse">Fetching Insights...</p>
            </div>
          ) : lastFetchedData ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              {(displayOptions.bar || displayOptions.pie) && !isNoChart && (
                <div className="flex flex-col gap-6">
                  {displayOptions.bar && (
                    <div className="bg-white p-4 rounded-xl border border-stone-200 h-80"><canvas ref={barChartRef}></canvas></div>
                  )}
                  {displayOptions.pie && (
                    <div className="bg-white p-4 rounded-xl border border-stone-200 h-80"><canvas ref={pieChartRef}></canvas></div>
                  )}
                </div>
              )}
              
              {displayOptions.table && (
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-center">
                      <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                        <tr>
                          {Object.keys(lastFetchedData[0] || {}).map(key => (
                            <th key={key} className="p-4 font-bold uppercase tracking-wider text-[11px]">{key.replace(/_/g, ' ')}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {lastFetchedData.length > 0 ? (
                          lastFetchedData.map((row: any, i: number) => {
                            const rowKey = row.id || row.article_id || row.user_id || `${i}-${JSON.stringify(row).slice(0, 20)}`
                            return (
                              <tr key={rowKey} className="hover:bg-stone-50 transition-colors">
                                {Object.values(row).map((val: any, j: number) => (
                                  <td key={`${rowKey}-${j}`} className="p-4 text-stone-600 font-medium">{val ?? 'N/A'}</td>
                                ))}
                              </tr>
                            )
                          })
                        ) : (
                          <tr><td colSpan={99} className="p-10 text-stone-400 italic">No records found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end pt-4 border-t border-stone-100">
                <UIButton 
                  onClick={() => downloadPDF(displayOptions)} 
                  disabled={isExporting} 
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl shadow-lg flex items-center gap-2"
                >
                  {isExporting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><FileDown className="h-4 w-4" /> Export PDF Report</>
                  )}
                </UIButton>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-stone-200 rounded-3xl">
              <Database className="h-16 w-16 text-stone-300 mb-4" />
              <p className="text-stone-500 font-medium">Select a dataset from the sidebar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 🔧 ReportsExplorer Component - ✅ FIXED: Query title now shows properly
// ============================================================
function ReportsExplorer({ onBack, onShowToast }: { onBack: () => void; onShowToast: (message: string, type: 'success' | 'error' | 'info') => void }) {
  const [lastFetchedData, setLastFetchedData] = useState<any>(null)
  const [reportTitle, setReportTitle] = useState("Select a Query")
  const [currentView, setCurrentView] = useState("")
  const [loading, setLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const loadQuery = async (viewName: string, title: string) => {
    setLoading(true); setCurrentView(viewName); setReportTitle(title) // ✅ Title is set here
    try {
      const response = await axios.get(`${API_BASE_URL}/api/reports/api/report-data/${viewName}`, {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        timeout: 15000,
      })
      setLastFetchedData(response.data)
    } catch {
      setLastFetchedData([{ error: "Server offline" }])
      onShowToast('Failed to load query data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    if (!currentView) return onShowToast("Please select a query first.", 'error')
    setIsExporting(true)
    
    try {
      const url = `${API_BASE_URL}/api/reports/api/generate-pdf/${currentView}?include=table`
      
      console.log('📥 Opening PDF for query:', currentView)
      
      const response = await fetch(url, { 
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const dUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = dUrl
        a.download = `${currentView}_Query.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(dUrl)
        onShowToast('PDF downloaded successfully!', 'success')
      } else {
        const errorText = await response.text()
        onShowToast(`Server error: ${response.status}`, 'error')
      }
    } catch (e: any) {
      console.error('PDF download error:', e)
      onShowToast("Connection error", 'error')
    } finally {
      setIsExporting(false)
    }
  }

  // ✅ Get metadata for current query
  const metadata = currentView ? getQueryMetadata(currentView) : null

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors font-medium">
          <ArrowLeft className="h-5 w-5" /> Back to Dashboard
        </button>
      </div>
      
      <div className="flex bg-white rounded-2xl shadow-xl overflow-hidden min-h-[70vh] border border-stone-200">
        <div className="w-72 bg-slate-950 text-white p-6 overflow-y-auto border-r border-slate-800 flex-shrink-0 hidden md:block">
          <h2 className="text-orange-500 text-lg font-black tracking-widest uppercase text-center mb-6">Queries Explorer</h2>
          <div className="space-y-1">
            {standardQueries.map((q: any, i: number) => (
              <button key={q.id} onClick={() => loadQuery(q.id, q.title)} 
                className={`w-full text-left p-3 rounded-lg transition-all text-sm ${currentView === q.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                {i + 1}. {q.title}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 p-6 md:p-8 bg-stone-50 overflow-y-auto">
          {/* ✅ FIXED: Title header for Queries - NOW SHOWS PROPERLY */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 mb-6">
            <div className="flex justify-between items-center w-full border-b-2 border-orange-500 pb-4 mb-4 px-2">
              <img src="/logoL.jpeg" alt="Faculty" className="h-12 w-auto object-contain" />
              <img src="/logoR.jpeg" alt="Newsletter" className="h-14 w-auto object-contain" />
              <img src="/logoC.jpeg" alt="MTI" className="h-12 w-auto object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-center text-stone-800 uppercase">
              {loading ? 'Loading...' : currentView ? reportTitle.toUpperCase() : 'Select a Query'}
            </h2>
          </div>
          
          {/* ✅ QUERIES ONLY: Show designation/objective/how-it-works ABOVE table */}
          {metadata && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 mb-6">
              {/* Designation Header */}
              <div className="border-b border-stone-200 pb-4 mb-4">
                <h3 className="text-xl font-bold text-stone-800">
                  {metadata.designation}
                </h3>
                {metadata.objective && (
                  <p className="text-sm text-stone-500 mt-2 leading-relaxed">
                    {metadata.objective}
                  </p>
                )}
              </div>

              {/* How It Works */}
              {metadata.logic && (
                <div className="bg-stone-50 rounded-xl p-4 mb-4">
                  <h4 className="text-sm font-bold text-stone-600 uppercase tracking-wide mb-3">
                    How It Works
                  </h4>
                  <div className="space-y-2 text-sm text-stone-600">
                    <div className="flex gap-2">
                      <span className="font-semibold text-green-600 min-w-[40px]">IN:</span>
                      <span>{metadata.logic.input}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-yellow-600 min-w-[40px]">⚙:</span>
                      <span>{metadata.logic.processing}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-purple-600 min-w-[40px]">OUT:</span>
                      <span>{metadata.logic.output}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              {metadata.tags && metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {metadata.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>
          ) : lastFetchedData ? (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* ✅ Table ONLY for Queries (no charts) */}
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-center">
                    <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                      <tr>
                        {Object.keys(lastFetchedData[0] || {}).map(key => (
                          <th key={key} className="p-4 font-bold uppercase tracking-wider text-[11px]">{key.replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {lastFetchedData.length > 0 ? (
                        lastFetchedData.map((row: any, index: number) => {
                          const rowKey = row.id || row.article_id || row.user_id || `${index}-${JSON.stringify(row).slice(0, 20)}`
                          return (
                            <tr key={rowKey} className="hover:bg-stone-50 transition-colors">
                              {Object.entries(row).map(([key, val], colIndex) => (
                                <td key={`${rowKey}-${colIndex}`} className="p-4 text-stone-600 font-medium">{val ?? '-'}</td>
                              ))}
                            </tr>
                          )
                        })
                      ) : (
                        <tr><td colSpan={99} className="p-10 text-stone-400 italic">No records found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-stone-100">
                <UIButton 
                  onClick={downloadPDF} 
                  disabled={isExporting} 
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl shadow-lg flex items-center gap-2"
                >
                  {isExporting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><FileDown className="h-4 w-4" /> Export PDF Report</>
                  )}
                </UIButton>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-stone-200 rounded-3xl">
              <Database className="h-16 w-16 text-stone-300 mb-4" />
              <p className="text-stone-500 font-medium">Select a query from the sidebar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SubmissionsViewer Component
// ============================================================
function SubmissionsViewer({ 
  onBack, 
  onShowToast,
  onPostApproved
}: { 
  onBack: () => void
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void
  onPostApproved?: () => void
}) {
  const [submissions, setSubmissions] = useState<StakeholderSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

  const fetchSubmissions = async () => {
    setLoading(true)
    try {
      const endpoint = filter === 'pending' 
        ? `${API_BASE_URL}/media-advisor/posts/pending`
        : `${API_BASE_URL}/media-advisor/posts/all${filter !== 'all' ? `?status=${filter}` : ''}`
      
      const response = await axios.get<StakeholderSubmission[]>(endpoint, {
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        timeout: 15000,
      })
      
      if (response.data?.[0]) {
        console.log('🔍 First submission structure:', JSON.stringify(response.data[0], null, 2))
        console.log('🔍 Available keys:', Object.keys(response.data[0]))
      }
      
      setSubmissions(response.data)
    } catch (err: any) {
      console.error('❌ Fetch submissions error:', err)
      onShowToast('Failed to load submissions', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSubmissions() }, [filter])

  const handleReview = async (
    submission: StakeholderSubmission | undefined,
    status: 'approved' | 'rejected', 
    reason?: string
  ) => {
    try {
      if (!submission) {
        console.error('❌ handleReview called with undefined submission')
        throw new Error('Submission is undefined')
      }
      
      const id = submission.submission_id
      if (!id) {
        console.error('❌ Could not find submission_id in submission:', submission)
        throw new Error('Invalid submission: missing submission_id field')
      }
      
      console.log('🔄 Reviewing submission ID:', id, 'with action:', status)
      
      const payloadStatus = status === 'approved' ? 'published' : 'rejected'
      
      console.log('📤 Sending status:', payloadStatus)
      
      const payload: any = {
        status: payloadStatus,
      }
      
      if (status === 'rejected' && reason?.trim()) {
        payload.rejection_reason = reason.trim()
      }
      
      console.log('📦 Full Payload:', payload)
      
      const response = await axios.post(
        `${API_BASE_URL}/media-advisor/posts/review/${id}`,
        payload,
        {
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          timeout: 15000,
          withCredentials: false,
        }
      )
      
      const actionText = status === 'approved' ? 'published' : 'rejected'
      onShowToast(`Post ${actionText} successfully!`, 'success')
      
      fetchSubmissions()
      
      if (status === 'approved' && onPostApproved) {
        console.log('🔄 Triggering published articles refresh...')
        onPostApproved()
      }
      
    } catch (err: any) {
      console.error('❌ Review Error Full:', err)
      
      const detail = err?.response?.data?.detail
      let errorMsg = 'Failed to review post'
      
      if (Array.isArray(detail)) {
        errorMsg = detail.map((e: any) => {
          const field = e.loc?.slice(1)?.join('.') || 'body'
          const msg = e.msg || 'Invalid value'
          return `${field}: ${msg}`
        }).join('; ')
      } else if (detail) {
        errorMsg = typeof detail === 'string' ? detail : JSON.stringify(detail)
      } else if (err?.message) {
        errorMsg = err.message
      }
      
      console.error('🔍 Validation Error:', errorMsg)
      onShowToast(`Error: ${errorMsg}`, 'error')
    }
  }

  const handleEdit = async (
    submissionId: number, 
    edits: { title?: string; content?: string; image_url?: string }, 
    reason?: string
  ) => {
    try {
      await axios.put(
        `${API_BASE_URL}/media-advisor/posts/edit/${submissionId}`,
        { ...edits, edit_reason: reason },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          timeout: 15000
        }
      )
      onShowToast('Post edited successfully!', 'success')
      fetchSubmissions()
    } catch (err: any) {
      console.error('❌ Edit error:', err)
      onShowToast(`Failed to edit: ${err?.response?.data?.detail || err?.message}`, 'error')
    }
  }

  const counts = {
    all: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  }

  const filteredSubmissions = submissions.filter(s => 
    filter === 'all' ? true : s.status === filter
  )

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors font-medium">
          <ArrowLeft className="h-5 w-5" /> Back to Dashboard
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              Stakeholder Submissions
            </h2>
            <p className="text-sm text-stone-500 mt-1">Review and approve posts from stakeholders</p>
          </div>
          <Button onClick={fetchSubmissions} variant="outline" size="sm" className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap capitalize ${
              filter === f 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-slate-600 border-stone-200 hover:border-blue-400'
            }`}
          >
            {f} <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{counts[f]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-stone-200">
          <MessageSquare className="h-12 w-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500">No submissions found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubmissions.map((sub, index) => (
            <SubmissionCard 
              key={`${sub.submission_id}-${sub.submitted_at}-${index}`}
              submission={sub} 
              onReview={handleReview}
              onEdit={handleEdit}
              onShowToast={onShowToast}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// MAIN COMPONENT - MediaAdviserDashboard
// ============================================================
export default function MediaAdviserDashboard() {
  const router = useRouter()
  const [activePage, setActivePage] = useState<MonitorPage>('home')
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const [articles, setArticles] = useState<FrontendArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [scraping, setScraping] = useState(false)
  const [scrapeLimit, setScrapeLimit] = useState(5)
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }, [])

  const getUserEmail = (): string => {
    if (typeof window === 'undefined') return ''
    try { const user = JSON.parse(localStorage.getItem('user') || '{}'); return user?.email || '' } catch { return '' }
  }

  const handleLogout = async () => {
    try { console.log("📦 Logout called") } catch {}
    finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/auth/login')
    }
  }

  const handleScrapeMore = async () => {
    if (scraping) return
    setScraping(true)
    showToast(`🚀 Starting scraper for ${scrapeLimit} posts per page...`, 'info')
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/start-scraping`,
        { limit: scrapeLimit },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          timeout: 30000,
        }
      )
      
      if (response.data.success) {
        showToast(`✅ Started! Collecting from ${response.data.pages_count} pages`, 'success')
        setTimeout(() => { if (activeTab === 'cleaned') fetchCleanedArticles() }, 15000)
      } else {
        showToast('❌ Failed: ' + (response.data.detail || response.data.message), 'error')
      }
    } catch (err: any) {
      console.error('❌ Scrape error:', err)
      if (err?.response?.status === 404) {
        showToast('❌ Scraper endpoint not found. Check backend.', 'error')
      } else if (err?.code === 'ERR_NETWORK') {
        showToast('❌ Cannot connect to backend server.', 'error')
      } else {
        showToast('Failed to start scraper.', 'error')
      }
    } finally {
      setScraping(false)
    }
  }

  const fetchCleanedArticles = async () => {
    setLoading(true); setError(null)
    try {
      const response = await axios.get<BackendArticle[]>(`${API_BASE_URL}/api/posts/clean-articles`, { 
        headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, 
        timeout: 15000 
      })
      const frontendArticles: FrontendArticle[] = response.data.map(backend => {
        const localPhoto = backend.photo || backend.image_url || backend.image
        return {
          article_id: backend.article_id,
          title: backend.title,
          summary: backend.summary,
          content: backend.content || backend.summary || '',
          category: backend.category || 'Unknown',
          image: processImageUrl(localPhoto),
          created_at: backend.created_at || new Date().toISOString(),
          status: 'cleaned'
        }
      })
      setArticles(frontendArticles)
    } catch (err: any) {
      console.error('❌ Fetch cleaned error:', err?.message)
      setError('Failed to load cleaned articles. ' + (err?.response?.status === 404 ? 'Endpoint not found.' : err?.message || ''))
      showToast('Failed to load cleaned articles', 'error')
    } finally { setLoading(false) }
  }

 const fetchPendingArticles = async () => {
  const email = getUserEmail()
  if (!email) { setError('Please login first'); setLoading(false); showToast('Please login first', 'error'); return }
  setLoading(true); setError(null)
  try {
    const response = await axios.get<BackendArticle[]>(`${API_BASE_URL}/articles/pinned-articles?email=${encodeURIComponent(email)}`, { 
      headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, 
      timeout: 15000 
    })
    const frontendArticles: FrontendArticle[] = response.data.map(backend => {
      const localPhoto = backend.photo || backend.image_url || backend.image
      return {
        article_id: backend.article_id, 
        title: backend.title, 
        summary: backend.summary, 
        content: backend.content || backend.summary || '',
        category: backend.category || 'Unknown',
        image: processImageUrl(localPhoto),
        created_at: backend.created_at || new Date().toISOString(), 
        // ✅ FIXED: Map backend 'pinned' status to frontend 'pending'
        status: backend.status === 'pinned' ? 'pending' : backend.status || 'pending'
      }
    })
    setArticles(frontendArticles)
  } catch (err: any) {
    console.error('❌ Fetch pending error:', err?.message)
    setError('Failed to load pending articles. ' + (err?.response?.status === 404 ? 'Endpoint not found.' : err?.message || ''))
    showToast('Failed to load pending articles', 'error')
  } finally { setLoading(false) }
}
  const fetchPublishedArticles = async () => {
    const email = getUserEmail()
    if (!email) { setError('Please login first'); showToast('Please login first', 'error'); return }
    setLoading(true); setError(null)
    try {
      const response = await axios.get<BackendArticle[]>(`${API_BASE_URL}/articles/my-articles?email=${encodeURIComponent(email)}`, { headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, timeout: 15000 })
      const frontendArticles: FrontendArticle[] = response.data.map(backend => {
        const localPhoto = backend.photo || backend.image_url || backend.image
        return {
          article_id: backend.article_id, title: backend.title, summary: backend.summary, content: backend.content || backend.summary || '',
          category: backend.category || 'Unknown',
          image: processImageUrl(localPhoto),
          created_at: backend.created_at || new Date().toISOString(), status: 'published'
        }
      })
      setArticles(frontendArticles)
    } catch (err: any) {
      console.error('❌ Fetch published error:', err?.message)
      setError('Failed to load published articles. ' + (err?.response?.status === 404 ? 'User not found.' : err?.message || ''))
      showToast('Failed to load published articles', 'error')
    } finally { setLoading(false) }
  }

  const handlePublish = async (articleId: number, summary: string) => {
    const email = getUserEmail()
    if (!email) { showToast('Please login first', 'error'); return }
    
    setActionLoading(true)
    try {
      await axios.post(
        `${API_BASE_URL}/articles/publish/${articleId}`, 
        { final_summary: summary || undefined }, 
        { 
          headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
            'ngrok-skip-browser-warning': 'true',
            'x-user-email': email
          }, 
          timeout: 15000 
        }
      )
      setArticles(prev => prev.filter(a => a.article_id !== articleId))
      showToast('Article published successfully! 🎉', 'success')
    } catch (err: any) {
      console.error('❌ Publish error:', err?.message)
      showToast('Failed to publish: ' + (err?.response?.data?.detail || err?.message || 'Unknown error'), 'error')
    } finally { setActionLoading(false) }
  }

  const handleProcessAllCleaned = async () => {
    if (!confirm('Process ALL cleaned articles with AI? This may take a while.')) return
    setActionLoading(true)
    try {
      await axios.post(`${API_BASE_URL}/api/posts/sync-articles`, {}, { 
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }, 
        timeout: 30000 
      })
      showToast('✅ All cleaned articles processed! Refreshing list...', 'success')
      fetchCleanedArticles()
      if (activeTab === 'pending') fetchPendingArticles()
    } catch (err: any) {
      console.error('❌ Process all error:', err?.message)
      showToast('Failed: ' + (err?.response?.data?.detail || err?.message || 'Unknown error'), 'error')
    } finally { setActionLoading(false) }
  }

  useEffect(() => {
    if (activePage !== 'home') return
    if (activeTab === 'cleaned') fetchCleanedArticles()
    else if (activeTab === 'pending') fetchPendingArticles()
    else if (activeTab === 'published') fetchPublishedArticles()
  }, [activeTab, activePage])

  const TAB_CONFIG: Record<Tab, { label: string; icon: React.ReactNode; color: string; buttonColor: string }> = {
    cleaned: { label: "Cleaned (AI Ready)", icon: <Wand2 className="h-4 w-4" />, color: "text-blue-600", buttonColor: "bg-blue-600" },
    pending: { label: "Pending Review", icon: <Clock className="h-4 w-4" />, color: "text-amber-600", buttonColor: "bg-blue-600" },
    published: { label: "Published", icon: <CheckCircle className="h-4 w-4" />, color: "text-emerald-600", buttonColor: "bg-blue-600" },
    submissions: { label: "Submissions", icon: <MessageSquare className="h-4 w-4" />, color: "text-purple-600", buttonColor: "bg-purple-600" },
  }

 const filteredArticles = articles.filter(a => {
  if (activeTab === 'cleaned') return a.status === 'cleaned'
  // ✅ FIXED: Accept both 'pending' (frontend) and 'pinned' (backend)
  if (activeTab === 'pending') return a.status === 'pending' || a.status === 'pinned'
  if (activeTab === 'published') return a.status === 'published'
  return false
})

  const counts = {
    cleaned: articles.filter(a => a.status === 'cleaned').length,
    pending: articles.filter(a => a.status === 'pending').length,
    published: articles.filter(a => a.status === 'published').length,
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-serif">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <nav className="bg-white dark:bg-slate-900 shadow-md border-b border-blue-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
                      <div className="relative">
                        <Image
                          src="/logo.jfif"
                          alt="CampusPulse Logo"
                          width={44}
                          height={44}
                          className="rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                        Media Adviser 
                      </span>
                    </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {[
                { id: 'home', label: 'Articles', icon: <FileText className="h-4 w-4" /> }, 
                { id: 'reports', label: 'Reports', icon: <Database className="h-4 w-4" /> }, 
                { id: 'queries', label: 'Queries', icon: <Database className="h-4 w-4" /> },
                { id: 'monitor', label: 'Monitor', icon: <Monitor className="h-4 w-4" /> }
              ].map((page) => (
                <button 
                  key={page.id} 
                  onClick={() => setActivePage(page.id as MonitorPage)} 
                  className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                    activePage === page.id 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-slate-600 hover:bg-blue-50'
                  }`}
                >
                  {page.icon} {page.label}
                </button>
              ))}
            </div>
            <Button 
              onClick={handleLogout}
              variant="ghost" 
              size="sm"
              className="h-9 px-4 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activePage === 'home' && (
          <>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 border-b border-blue-100 pb-6">
              <div>
                <h1 className="text-3xl font-black uppercase text-slate-900 dark:text-white">Article Management</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Review, process, and publish campus articles.</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0" /><p className="text-sm">{error}</p>
                <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
              </div>
            )}

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {(Object.keys(TAB_CONFIG) as Tab[]).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-blue-200 dark:border-slate-700 hover:border-blue-400'}`}>
                  {TAB_CONFIG[tab].icon} {TAB_CONFIG[tab].label} <span className="bg-white/20 dark:bg-slate-900/20 px-2 py-0.5 rounded-full text-xs">{tab === 'submissions' ? '...' : counts[tab]}</span>
                </button>
              ))}
              {activeTab !== 'submissions' && (
                <button onClick={() => { if (activeTab === 'cleaned') fetchCleanedArticles(); else if (activeTab === 'pending') fetchPendingArticles(); else if (activeTab === 'published') fetchPublishedArticles(); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-blue-600 transition-colors"><RefreshCcw className="h-4 w-4" /> Refresh</button>
              )}
            </div>

            {activeTab === 'submissions' ? (
              <SubmissionsViewer 
                onBack={() => {}} 
                onShowToast={showToast}
                onPostApproved={() => {
                  if (activeTab === 'published') {
                    fetchPublishedArticles()
                  }
                }}
              />
            ) : (
              <>
                {activeTab === 'cleaned' && (
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-blue-600" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {counts.cleaned} cleaned article{counts.cleaned !== 1 ? 's' : ''} ready for AI processing
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Button 
                        onClick={handleScrapeMore} 
                        disabled={scraping || actionLoading}
                        className={`gap-2 ${scraping ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-xl`}
                      >
                        {scraping ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Scraping...</>
                        ) : (
                          <><Download className="h-4 w-4" /> Scrape More</>
                        )}
                      </Button>
                      <Button 
                        onClick={handleProcessAllCleaned} 
                        disabled={actionLoading || scraping || counts.cleaned === 0}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                      >
                        {actionLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><Wand2 className="h-4 w-4" /> Process All with AI</>}
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab !== 'cleaned' && filteredArticles.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3"><Wand2 className="h-5 w-5 text-blue-600" /><p className="text-sm text-blue-700 dark:text-blue-300">{filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} in this category</p></div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {loading ? (
                    <div className="col-span-full flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>
                  ) : filteredArticles.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-slate-400"><Database className="h-16 w-16 mx-auto mb-4 opacity-20" /><p>No articles in this category.</p></div>
                  ) : filteredArticles.map((article, index) => (
                    <ArticleCard
                      key={`${article.article_id}-${index}`}
                      article={article}
                      onPublish={activeTab === 'pending' ? handlePublish : undefined}
                      onShowToast={showToast}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
        
        {activePage === 'reports' && <ReportsSystem onBack={() => setActivePage('home')} onShowToast={showToast} />}
        {activePage === 'queries' && <ReportsExplorer onBack={() => setActivePage('home')} onShowToast={showToast} />}
        {activePage === 'monitor' && <MonitorView onBack={() => setActivePage('home')} onShowToast={showToast} />}
      </div>
    </div>
  )
}