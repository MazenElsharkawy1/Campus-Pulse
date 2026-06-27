'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, Search, User, LogOut, LogIn } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from 'next/navigation'

// Your mock news data
const mockNews = [
  { slug: "ai-conference", title: "AI Conference at MTI" },
  { slug: "sports-day", title: "Annual Sports Day" },
  { slug: "fun-day", title: "Annual Fun Day" },
]

// ✅ الأدوار التي لن ترى النافبار نهائياً
const HIDDEN_NAVBAR_ROLES = [
  'university_media_adviser'
]

// ✅ الأدوار التي ستظهر لها زر Logout بدلاً من Profile
const STAKEHOLDER_ROLES = [
  'president',
  'quality', 
  'council',
  'supreme_council',
  'ministry',
  'naqaae'
]

// 🔍 دالة مساعدة للتحقق من إخفاء النافبار بناءً على الدور
const shouldHideNavbar = () => {
  if (typeof window === 'undefined') return false
  const storedUser = localStorage.getItem('user')
  if (!storedUser) return false
  try {
    const user = JSON.parse(storedUser)
    return HIDDEN_NAVBAR_ROLES.includes(user?.role?.toLowerCase())
  } catch {
    return false
  }
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isStakeholder, setIsStakeholder] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // ========================
  // AUTH & ROLE CHECK
  // ========================
  useEffect(() => {
    setMounted(true)

    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user')
        
        // تخطي الإعداد إذا كان المستخدم في قائمة الإخفاء
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser)
            const userRole = user?.role?.toLowerCase()
            if (HIDDEN_NAVBAR_ROLES.includes(userRole)) {
              setIsLoggedIn(false)
              setIsStakeholder(false)
              return
            }
          } catch {}
        }
        
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser)
            setIsLoggedIn(true)
            const userRole = user?.role?.toLowerCase()
            setIsStakeholder(STAKEHOLDER_ROLES.includes(userRole))
          } catch {
            setIsLoggedIn(false)
            setIsStakeholder(false)
          }
        } else {
          setIsLoggedIn(false)
          setIsStakeholder(false)
        }
      }
    }

    checkAuth()
    window.addEventListener('storage', checkAuth)
    const interval = setInterval(checkAuth, 1000)

    return () => {
      window.removeEventListener('storage', checkAuth)
      clearInterval(interval)
    }
  }, [])

  // ========================
  // LOGOUT HANDLER
  // ========================
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsLoggedIn(false)
    setIsStakeholder(false)
    router.push('/auth/login')
    router.refresh()
  }

  const links = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/categories', label: 'Categories' },
    { path: '/gallery', label: 'Gallery' },
    { path: '/faq', label: 'FAQ' },
  ]

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname === path || pathname?.startsWith(`${path}/`)
  }

  if (!mounted) return null
  if (shouldHideNavbar()) return null
  if (pathname?.startsWith('/auth/register')) return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo Section - 3 Images */}
          <Link href="/" className="flex items-center gap-2 md:gap-3 group">
           
            <div className="relative w-10 h-10 md:w-11 md:h-11 flex-shrink-0">
              <Image
                src="/logoC.jpeg"
                alt="CampusPulse Logo"
                fill
                className="object-contain rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300"
                priority
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {/* ✅ Logo 2 - Center (Main Logo) */}
            <div className="relative w-10 h-10 md:w-11 md:h-11 flex-shrink-0">
              <Image
                src="/logoL.jpeg"
                alt="CampusPulse Logo"
                fill
                className="object-contain rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300"
                priority
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
           
          <div className="relative w-10 h-10 md:w-11 md:h-11 flex-shrink-0">
              <Image
                src="/logoR.jpeg"
                alt="CampusPulse Logo"
                fill
                className="object-contain rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300"
                priority
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {/* Brand Name - Hidden on small screens */}
            <span className="hidden md:block text-xl lg:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent ml-1">
              CampusPulse
            </span>
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-1">
              {links.map((link) => {
                const active = isActive(link.path)
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-blue-400 text-white dark:bg-indigo-950 dark:text-indigo-400 font-semibold shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>

            {/* ✅ Profile Icon OR Logout OR Login/Register */}
            <div className="flex items-center">
              {isLoggedIn ? (
                isStakeholder ? (
                  <Button 
                    onClick={handleLogout}
                    variant="ghost" 
                    size="sm"
                    className="h-9 px-4 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                ) : (
                  <Link
                    href="/profile"
                    className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-indigo-50 transition-all duration-200 hover:scale-110"
                    title="Go to Profile"
                  >
                    <User className="h-5 w-5 text-slate-700 dark:text-slate-300 group-hover:text-indigo-600" />
                  </Link>
                )
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm" className="h-9 px-5 text-sm font-medium border-slate-300 hover:bg-slate-50">
                      Login
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button size="sm" className="h-9 px-5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white">
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
        <div className="px-6 pt-4 pb-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/50">

          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`px-5 py-3 text-base font-medium rounded-lg ${isActive(link.path) ? 'bg-blue-400 text-white' : 'text-slate-800 dark:text-slate-200'}`}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-200 mt-6">
            {isLoggedIn ? (
              isStakeholder ? (
                <button 
                  onClick={() => { handleLogout(); setIsOpen(false); }}
                  className="flex items-center gap-3 px-5 py-3 text-base font-medium text-red-600 hover:text-red-700 w-full text-left"
                >
                  <LogOut className="h-5 w-5" /> Logout
                </button>
              ) : (
                <Link href="/profile" className="flex items-center gap-3 px-5 py-3 text-base font-medium" onClick={() => setIsOpen(false)}>
                  <User className="h-5 w-5" /> Profile
                </Link>
              )
            ) : (
              <div className="flex flex-col gap-3">
                <Link href="/auth/login" className="flex items-center justify-center gap-2 px-5 py-3" onClick={() => setIsOpen(false)}>
                  <LogIn className="h-5 w-5" /> Login
                </Link>
                <Link href="/auth/register" className="flex items-center justify-center bg-indigo-600 text-white px-5 py-3 rounded-lg" onClick={() => setIsOpen(false)}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </nav>

    
  )
}