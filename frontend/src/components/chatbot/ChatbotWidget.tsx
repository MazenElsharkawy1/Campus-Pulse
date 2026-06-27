'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Loader2, Sparkles, LifeBuoy, Zap, Newspaper, ArrowLeft } from 'lucide-react'
import { ChatbotProps, ChatMessage as ChatMessageType, ChatMode } from './types'
import ChatMessage from './ChatMessage'
import axios from 'axios'

// ✅ Quick Actions by Mode + Role
const QUICK_ACTIONS: Record<ChatMode, Record<string, Array<{ label: string; query: string }>>> = {
  help: {
    student: [
      { label: 'ازاي اغير الصورة؟', query: 'ازاي اغير الصورة الشخصية' },
      { label: 'الاخبار مش بتظهر', query: 'الاخبار مش بتظهر في الداشبورد' },
      { label: 'ازاي اعمل ريجيستر؟', query: 'ازاي اعمل ريجيستر' },
      { label: 'ازاي اغير تفضيلاتى؟', query: 'ازاي اغير تفضيلاتى' },
    ],
    media_advisor: [
      { label: 'ازاي انشر خبر؟', query: 'ازاي انشر خبر' },
      { label: 'ازاي اراجع المانيوال؟', query: 'ازاي اراجع المانيوال' },
      { label: 'مين فتح الداشبورد؟', query: 'مراقبة الطلاب' },
      { label: 'التلخيص غلط', query: 'التلخيص غلط' },
    ],
    admin: [
      { label: 'الريبورتات فين؟', query: 'الريبورتات فين' },
      { label: 'ازاي ابعت تعميم؟', query: 'ازاي ابعت تعميم' },
      { label: 'شوف الاحصائيات', query: 'شوف الاحصائيات' },
      { label: 'إرسال خبر للجهات', query: 'إرسال خبر للجهات' },
    ],
    manager: [
      { label: 'الريبورتات فين؟', query: 'الريبورتات فين' },
      { label: 'ازاي ابعت تعميم؟', query: 'ازاي ابعت تعميم' },
      { label: 'الداتا بتاعت القراءات', query: 'الداتا بتاعت القراءات' },
      { label: 'أين التقارير', query: 'أين التقارير' },
    ],
    stakeholder: [
      { label: 'ازاي ابعت خبر؟', query: 'ازاي ابعت خبر' },
      { label: 'مين بيراجع الخبر؟', query: 'مين بيراجع الخبر' },
      { label: 'متى ينشر الخبر؟', query: 'متى ينشر الخبر' },
      { label: 'حالة الخبر إيه؟', query: 'حالة الخبر إيه' },
    ],
  },
  news: {
    student: [
      { label: '📰 آخر الأخبار', query: 'اعرض لي آخر الأخبار' },
      { label: '🏫 أخبار الكلية', query: 'أخبار الكلية اللي أنا فيها' },
      { label: '🏆 أخبار الرياضة', query: 'أخبار الرياضة الأخيرة' },
      { label: '🎉 الفعاليات', query: 'أخبار الفعاليات والأنشطة' },
    ],
    media_advisor: [
      { label: '📰 الأخبار المنشورة', query: 'الأخبار اللي نشرتها مؤخراً' },
      { label: '⏳ الأخبار المعلقة', query: 'الأخبار اللي لسه معلقة للمراجعة' },
      { label: '🔥 الأكثر قراءة', query: 'الأخبار الأكثر قراءة' },
      { label: '📊 إحصائيات الأخبار', query: 'إحصائيات عن الأخبار' },
    ],
    admin: [
      { label: '📰 كل الأخبار', query: 'عرض كل الأخبار في النظام' },
      { label: '📈 إحصائيات شاملة', query: 'إحصائيات شاملة عن الأخبار' },
      { label: '🔍 أخبار اليوم', query: 'أخبار اليوم' },
      { label: '📅 أخبار الأسبوع', query: 'أخبار الأسبوع الماضي' },
    ],
    manager: [
      { label: '📰 الأخبار المنشورة', query: 'الأخبار المنشورة' },
      { label: '📊 تحليل القراءات', query: 'تحليل قراءات الأخبار' },
      { label: '🔥 الأكثر تفاعلاً', query: 'الأخبار الأكثر تفاعلاً' },
      { label: '📅 أخبار الشهر', query: 'أخبار الشهر الحالي' },
    ],
    stakeholder: [
      { label: '📰 آخر الأخبار', query: 'آخر الأخبار المنشورة' },
      { label: '🏫 أخبار الجامعة', query: 'أخبار الجامعة' },
      { label: '🎓 أخبار الكليات', query: 'أخبار الكليات' },
      { label: '📅 أخبار الأسبوع', query: 'أخبار الأسبوع' },
    ],
  },
}

// ✅ Welcome messages by mode
const WELCOME_MESSAGES: Record<ChatMode, string> = {
  help: `أهلاً بك! 👋

أنا مساعد CampusPulse للمساعدة والدعم.

🔹 اسألني عن أي مشكلة تواجهك
🔹 استفسر عن كيفية استخدام النظام
🔹 اطلب شرح لأي ميزة أو تقرير

اكتب سؤالك وأنا هجاوبك فوراً! 🚀`,
  news: `📰 أهلاً بك في قسم الأخبار!

🔹 اسألني عن آخر الأخبار
🔹 استفسر عن أخبار كلية معينة
🔹 ابحث عن أخبار حسب الموضوع
🔹 تابع الأخبار الأكثر قراءة

اكتب سؤالك وأنا هجاوبك فوراً! 🚀`,
}

// ✅ Mode selector screen messages
const MODE_DESCRIPTIONS: Record<ChatMode, { title: string; description: string; icon: string; gradient: string }> = {
  help: {
    title: '🆘 المساعدة والدعم',
    description: 'اسأل عن أي مشكلة، ميزة، أو كيفية استخدام النظام',
    icon: '💡',
    gradient: 'from-blue-500 to-cyan-500',
  },
  news: {
    title: '📰 الأخبار',
    description: 'تابع آخر الأخبار، استفسر عن الأخبار، وابحث بالموضوع',
    icon: '📰',
    gradient: 'from-purple-500 to-pink-500',
  },
}

export default function ChatbotWidget({ 
  userEmail, 
  userRole, 
  userId, 
  API_BASE_URL 
}: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasSentAutoHelp, setHasSentAutoHelp] = useState(false)
  const [currentMode, setCurrentMode] = useState<ChatMode | null>(null) // ✅ null = show mode selector
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ✅ Get quick actions for current mode + role
  const quickActions = currentMode 
    ? (QUICK_ACTIONS[currentMode][userRole] || QUICK_ACTIONS[currentMode].student)
    : []

  // ✅ Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ✅ Reset state when closing
  const handleClose = () => {
    setIsOpen(false)
  }

  // ✅ Reset everything (full reset)
  const handleFullReset = () => {
    setMessages([])
    setCurrentMode(null)
    setHasSentAutoHelp(false)
    setInput('')
  }

  // ✅ Auto-send welcome message when mode is selected
  useEffect(() => {
    const sendWelcomeMessage = async () => {
      if (isOpen && currentMode && !hasSentAutoHelp && messages.length === 0) {
        setHasSentAutoHelp(true)
        setIsLoading(true)
        
        try {
          // ✅ Send FormData instead of JSON
          const formData = new FormData()
          formData.append('query', 'help')
          formData.append('mode', currentMode)
          formData.append('user_role', userRole)
          if (userId) formData.append('user_id', userId.toString())

          const response = await axios.post(
            `${API_BASE_URL}/api/chat`,
            formData,
            {
              headers: { 
                'ngrok-skip-browser-warning': 'true'
              },
              timeout: 30000
            }
          )
          
          const botMessage: ChatMessageType = {
            id: 'auto-help-response',
            role: 'assistant',
            content: response.data.response || WELCOME_MESSAGES[currentMode],
            timestamp: new Date(),
            mode: currentMode,
            articles: response.data.articles
          }
          
          setMessages([botMessage])
          
        } catch (error: any) {
          console.error('❌ Auto-help error:', error)
          const fallbackMessage: ChatMessageType = {
            id: 'auto-help-response',
            role: 'assistant',
            content: WELCOME_MESSAGES[currentMode],
            timestamp: new Date(),
            mode: currentMode
          }
          setMessages([fallbackMessage])
        } finally {
          setIsLoading(false)
        }
      }
    }
    
    sendWelcomeMessage()
  }, [isOpen, currentMode, hasSentAutoHelp, messages.length, userRole, userId, API_BASE_URL])

  // ✅ Send user message to backend with FormData
  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentMode) return
    
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      mode: currentMode
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    
    try {
      // ✅ Send FormData instead of JSON
      const formData = new FormData()
      formData.append('query', userMessage.content)
      formData.append('mode', currentMode)
      formData.append('user_role', userRole)
      if (userId) formData.append('user_id', userId.toString())

      const response = await axios.post(
        `${API_BASE_URL}/api/chat`,
        formData,
        {
          headers: { 
            'ngrok-skip-browser-warning': 'true'
          },
          timeout: 30000
        }
      )
      
      const botMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
        mode: currentMode,
        articles: response.data.articles
      }
      
      setMessages(prev => [...prev, botMessage])
      
    } catch (error: any) {
      console.error('❌ Chatbot error:', error)
      
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'عذراً، حدث خطأ أثناء معالجة سؤالك. 😔\n\nحاول مرة أخرى، أو تأكد من اتصالك بالإنترنت.',
        timestamp: new Date(),
        mode: currentMode
      }
      setMessages(prev => [...prev, errorMessage])
      
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ✅ Handle mode selection
  const handleModeSelect = (mode: ChatMode) => {
    setCurrentMode(mode)
  }

  // ✅ Handle mode switch (from header)
  const handleModeSwitch = () => {
    const newMode: ChatMode = currentMode === 'help' ? 'news' : 'help'
    setCurrentMode(newMode)
    const switchMessage: ChatMessageType = {
      id: `mode-switch-${Date.now()}`,
      role: 'assistant',
      content: newMode === 'help' 
        ? '🔄 تم التبديل إلى وضع المساعدة. كيف أقدر أساعدك؟'
        : '🔄 تم التبديل إلى وضع الأخبار. اسألني عن أي أخبار!',
      timestamp: new Date(),
      mode: newMode
    }
    setMessages(prev => [...prev, switchMessage])
  }

  return (
    <>
      {/* ✅ COLORFUL ANIMATED FLOATING BOT BUTTON */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[100] group"
        aria-label="Open help chatbot"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-ping opacity-30 group-hover:opacity-50 transition-opacity" />
        
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-pink-500/50 hover:shadow-lg">
          <div className="relative">
            <Bot className="h-7 w-7 text-white drop-shadow-md animate-bounce-slow" />
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 animate-pulse" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse shadow-sm" />
        </div>
        
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
          مساعدة سريعة 💬
          <div className="absolute top-full right-3 w-2 h-2 bg-slate-900 rotate-45" />
        </div>
      </button>

      {/* ✅ Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={handleClose}>
          <div 
            className="bg-white dark:bg-slate-900 w-full sm:w-[420px] h-[90vh] sm:h-[600px] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col animate-in slide-in-from-bottom-10 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Dynamic based on mode */}
            <div className={`flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 text-white rounded-t-3xl sm:rounded-t-3xl ${
              currentMode === 'help' 
                ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500'
                : currentMode === 'news'
                ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500'
                : 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  {currentMode === 'news' ? <Newspaper className="h-5 w-5" /> : <LifeBuoy className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {currentMode === 'help' ? 'CampusPulse Help' : currentMode === 'news' ? 'CampusPulse News' : 'CampusPulse'}
                  </h3>
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {currentMode === 'help' ? 'AI Support' : currentMode === 'news' ? 'AI News Assistant' : 'AI Assistant'} • Always Ready
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* ✅ Mode switch button (only if mode is selected) */}
                {currentMode && (
                  <button 
                    onClick={handleModeSwitch}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                    title={`التبديل إلى وضع ${currentMode === 'help' ? 'الأخبار' : 'المساعدة'}`}
                  >
                    {currentMode === 'help' ? <Newspaper className="h-4 w-4" /> : <LifeBuoy className="h-4 w-4" />}
                  </button>
                )}
                <button 
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ✅ MODE SELECTOR SCREEN - Shows when no mode selected */}
            {!currentMode && (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-2xl">
                    <Bot className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    أهلاً بك في CampusPulse 👋
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    اختار نوع المساعدة اللي محتاجها
                  </p>
                </div>

                <div className="space-y-3">
                  {(['help', 'news'] as ChatMode[]).map((mode) => {
                    const info = MODE_DESCRIPTIONS[mode]
                    return (
                      <button
                        key={mode}
                        onClick={() => handleModeSelect(mode)}
                        className={`w-full p-5 bg-gradient-to-r ${info.gradient} text-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-right`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-4xl">{info.icon}</div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">{info.title}</h3>
                            <p className="text-sm text-white/90">{info.description}</p>
                          </div>
                          <div className="text-2xl">←</div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-6">
                  💡 تقدر تغير المود في أي وقت من الـ Header
                </p>
              </div>
            )}

            {/* ✅ MESSAGES AREA - Shows when mode is selected */}
            {currentMode && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900">
                  {/* Back to mode selector button (small) */}
                  <button
                    onClick={handleFullReset}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    تغيير المود
                  </button>

                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  
                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                        currentMode === 'help' 
                          ? 'bg-gradient-to-br from-pink-500 to-indigo-500' 
                          : 'bg-gradient-to-br from-purple-500 to-orange-500'
                      }`}>
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                          <span className="text-sm">
                            {currentMode === 'help' ? 'جاري البحث في قاعدة المعرفة...' : 'جاري البحث في الأخبار...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* ✅ Quick Actions - Hardcoded by Mode + Role */}
                {messages.length <= 1 && !isLoading && quickActions.length > 0 && (
                  <div className="px-4 pb-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                      <Zap className="h-3 w-3 text-yellow-500" />
                      {currentMode === 'help' ? 'أسئلة شائعة' : 'أخبار مقترحة'} لك كـ {
                        userRole === 'student' ? 'طالب' : 
                        userRole === 'media_advisor' ? 'ميديا أدفايزر' : 
                        userRole === 'admin' ? 'أدمن' : 
                        userRole === 'manager' ? 'مدير' : 'جهة خارجية'
                      }:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quickActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInput(action.query)}
                          className={`px-3 py-1.5 border rounded-full text-xs transition-all active:scale-95 ${
                            currentMode === 'help'
                              ? 'bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md'
                              : 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:border-pink-400 hover:text-pink-600 hover:shadow-md'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <div className="flex gap-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={currentMode === 'help' ? 'اكتب سؤالك للمساعدة...' : 'اسأل عن أي خبر...'}
                      rows={1}
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className={`w-12 h-12 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                        currentMode === 'help'
                          ? 'bg-gradient-to-br from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 hover:shadow-pink-500/30'
                          : 'bg-gradient-to-br from-purple-500 to-orange-500 hover:from-purple-600 hover:to-orange-600 hover:shadow-purple-500/30'
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center mt-2">
                    Enter للإرسال • Shift+Enter لسطر جديد
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}