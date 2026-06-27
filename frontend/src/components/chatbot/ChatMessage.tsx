'use client'

import { ChatMessage as ChatMessageType } from './types'
import { User, Bot, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user'
  
  // ✅ Color based on mode
  const botGradient = message.mode === 'news'
    ? 'from-purple-500 to-orange-500'
    : 'from-indigo-500 to-purple-600'
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser 
          ? 'bg-blue-600 text-white' 
          : `bg-gradient-to-br ${botGradient} text-white`
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      
      {/* Message Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block px-4 py-3 rounded-2xl text-sm ${
          isUser 
            ? 'bg-blue-600 text-white rounded-tr-sm' 
            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-tl-sm shadow-sm'
        }`}>
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        
        {/* ✅ Articles suggestions (if any) */}
        {message.articles && message.articles.length > 0 && !isUser && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">📚 قد يكون مفيداً:</p>
            {message.articles.slice(0, 2).map((article) => (
              <Link
                key={article.article_id}
                href={`/news/${article.article_id}`}
                className="block p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 transition-colors group"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-blue-600 line-clamp-1">
                  {article.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                  {article.summary}
                </p>
              </Link>
            ))}
          </div>
        )}
        
        {/* Timestamp */}
        <p className={`text-[10px] text-slate-400 mt-1 ${isUser ? 'text-right' : ''}`}>
          {message.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}