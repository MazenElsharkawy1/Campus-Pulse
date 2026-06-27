'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  HelpCircle, ChevronDown, ChevronUp,
  Mail, Phone, MapPin, Send, CheckCircle, MessageSquare
} from 'lucide-react'
import axiosInstance from '@/lib/axiosInstance'

// ============================================================
// FAQ Data
// ============================================================
const faqs = [
  {
    question: "Why can't I open my profile page?",
    answer: "Some accounts have limited access. If you can't open the profile page, it may not be available for your account type.",
  },
  {
    question: "Why does my dashboard look different from someone else's?",
    answer: "Each user sees a different dashboard based on their preferences and role, so it's normal for the content to vary from one person to another.",
  },
  {
    question: "Why is the gallery empty?",
    answer: "The gallery shows videos when they are available. If it's empty, new videos may not have been added yet.",
  },
  {
    question: "Why isn't a video playing?",
    answer: "If a video doesn't play, try refreshing the page or checking your internet connection. If the problem continues, you can contact support.",
  },
  {
    question: "Why don't I see some sections in my profile?",
    answer: "Some profile sections are only shown to certain user roles, so what you see depends on your account.",
  },
  {
    question: "How often is the dashboard updated?",
    answer: "The dashboard is updated weekly to show the latest information and content available.",
  },
  {
    question: "What should I do if something is not working?",
    answer: "You can try refreshing the page first. If the issue continues, please use the contact form below to report the problem.",
  },
  {
    question: "Can I change my personal information?",
    answer: "Yes, you can update some of your personal details from your profile page if the option is available to you.",
  },
  {
    question: "Why did I get logged out?",
    answer: "For security reasons, you may be logged out after some time. You can simply log in again to continue.",
  },
]

// ============================================================
// Contact Info
// ============================================================
const contactInfo = [
  {
    icon: <Mail className="h-6 w-6 text-rose-600 dark:text-rose-400" />,
    label: "Email",
    value: "info@mti.edu.eg",
    href: "mailto:info@mti.edu.eg",
    color: "text-rose-600 dark:text-rose-400",
  },
  {
    icon: <Phone className="h-6 w-6 text-teal-600 dark:text-teal-400" />,
    label: "Phone",
    value: "19041",
    href: "tel:19041",
    color: "text-teal-600 dark:text-teal-400",
  },
  {
    icon: <MapPin className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
    label: "Location",
    value: "Al Mokkatam, Egypt",
    href: null,
    color: "text-amber-600 dark:text-amber-400",
  },
]

export default function HelpCenterPage() {
  const [expanded, setExpanded]     = useState<number | null>(null)
  const [submitted, setSubmitted]   = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError]     = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const toggle = (index: number) => {
    setExpanded(expanded === index ? null : index)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // ============================================================
  // 🔧 BACKEND INTEGRATION POINT
  // Submit contact form.
  // Confirm endpoint with your backend team: POST /contact
  // Payload: { name, email, subject, message }
  // ============================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setApiError(null)

    try {
      // --- MOCK START (delete this block when backend is ready) ---
      await new Promise((r) => setTimeout(r, 1200))
      console.log("📦 Contact form payload (ready for backend):", formData)
      // --- MOCK END ---

      // --- REAL AXIOS CALL (uncomment when backend is ready) ---
      // await axiosInstance.post('/contact', formData)

      setSubmitted(true)
    } catch (err: any) {
      setApiError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to send message. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-serif text-stone-900 dark:text-stone-100">
      <div className="max-w-5xl mx-auto px-6 py-16 mt-10">

        {/* ── Page Header ── */}
        <div className="border-b-2 border-stone-800 dark:border-stone-200 pb-10 mb-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
              <HelpCircle className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="uppercase tracking-[4px] text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            CampusPulse — MTI University
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight uppercase text-stone-900 dark:text-white">
            Help Center
          </h1>
          <p className="mt-5 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Find answers to common questions or reach out to us directly — we're here to help.
          </p>
        </div>

        {/* ── FAQ Section ── */}
        <div className="mb-24">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-1.5 h-10 bg-indigo-600 rounded-full" />
            <h2 className="text-3xl font-black uppercase tracking-tight text-stone-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isExpanded = expanded === idx
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <button
                    onClick={() => toggle(idx)}
                    className="w-full px-8 py-6 text-left flex items-center justify-between group hover:bg-zinc-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white pr-8 leading-snug">
                      {faq.question}
                    </h3>
                    <div className="text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                      {isExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                    </div>
                  </button>
                  <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-8 pb-7 border-t border-zinc-100 dark:border-zinc-800 pt-5">
                      <p className="text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

   

        {/* Footer Note */}
        <div className="mt-20 pt-10 border-t-2 border-stone-800 dark:border-stone-200 text-center space-y-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Still Have Questions?{' '}
            <Link href="/contact" className="text-indigo-600 hover:underline">Contact Us</Link>
            
          </p>
          
        </div>

      </div>
    </div>
  )
}