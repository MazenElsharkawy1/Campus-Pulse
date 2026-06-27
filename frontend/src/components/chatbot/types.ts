export type ChatRole = 'student' | 'media_advisor' | 'admin' | 'manager' | 'stakeholder'
export type ChatMode = 'help' | 'news'  // ✅ Added 'news' mode

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  mode?: ChatMode  // ✅ Track which mode generated this message
  articles?: Array<{
    article_id: number
    title: string
    summary: string
  }>
}

export interface ChatbotProps {
  userEmail: string
  userRole: ChatRole
  userId?: number
  API_BASE_URL: string
}