{/*
  'use client'

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Sparkles, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'

export default function Welcome() {
  const router = useRouter()

  const handleGuest = () => {
    // Mark as guest (we'll use this flag to allow browsing but block private pages)
    if (typeof window !== 'undefined') {
      localStorage.setItem('isGuest', 'true')
      localStorage.removeItem('userProfile') // ensure no old login data
      localStorage.removeItem('userNewsPreferences')
    }
    // Go to home page
    router.push('/')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      /* Background decoration 
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12 sm:px-8 md:px-12">
        <div className="w-full max-w-4xl mx-auto text-center space-y-10 md:space-y-12 animate-fade-in-up">


          {/* Badge / tag 
          <div className="mt-15 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/30 dark:border-slate-700/50 shadow-sm">
            <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Welcome to the new era of campus life
            </span>
          </div>

          {/* MTI University Logo – Modern 3D Revolving *
          <div className="flex justify-center pt-8 pb-10">
            <div className="perspective-distant group">   {/* ← Tailwind handles this automatically *
              <div className="logo-3d relative w-90 h-33.75">
                <Image
                  src="/mti-logo.png"
                  alt="MTI University Logo"
                  fill
                  className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.3)]"
                  priority
                />
              </div>
            </div>
          </div>



          {/* Main headline *
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-tight">
            <span className="bg-linear-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              CampusPulse
            </span>
          </h1>

          {/* Subtitle *
          <p className="text-xl sm:text-2xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
            Your university's central hub for real-time news, events, announcements, and everything happening on campus.
          </p>

          {/* CTA buttons *
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-6 sm:pt-10">
            {/* Primary: Register *
            <Link href="/auth/register">
              <Button
                size="lg"
                className="h-14 px-10 text-lg font-medium bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/20 transition-all duration-300 group"
              >
                Create Account
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>

            {/* Secondary: Login *
            <Link href="/auth/login">
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-10 text-lg font-medium border-2 border-slate-300 dark:border-slate-600 hover:bg-white/80 dark:hover:bg-slate-800/80 backdrop-blur-sm transition-all duration-300"
              >
                Already have an account? Login
              </Button>
            </Link>
          </div>

          {/* Guest option *
          <Button
            variant="ghost"
            size="lg"
            className="h-14 px-10 text-lg text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30"
            onClick={handleGuest}
          >
            Continue as Guest →
          </Button>

          {/* Small trust signals *
          <div className="pt-8 md:pt-12 text-sm text-slate-500 dark:text-slate-400 flex flex-wrap justify-center gap-x-8 gap-y-3">
            <span>Real-time updates</span>
            <span className="hidden sm:inline">•</span>
            <span>Personalized feed (after signup)</span>
            <span className="hidden sm:inline">•</span>
            <span>Free for all students</span>
            <span className="hidden sm:inline">•</span>
            <span>Secure & private</span>
          </div>
        </div>
      </div>
    </div>
  )
}
*/}
import React from 'react'

export default function page() {
  return (
    <div>page</div>
  )
}

