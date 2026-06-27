'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import StudentDashboard from './components/StudentDashboard'
import ManagerDashboard from './components/ManagerDashboard'
import MediaAdviserDashboard from './components/MediaAdviser'
import SupremeCouncilDashboard from './components/SupremeCouncil'
import NAQAAE from './components/NAQAAE'
import Admin from './components/Admin'
import Council from './components/Council'
import QualityAssuranceDashboard from './components/QualityAssurance'
import StakeholderDashboard from './components/Ministry'
import UniPresidentDashboard from './components/UniPresident'

// ============================================================
// 🔧 ALLOWED ROLES (كل الرولات المسموح لها)
// ============================================================
const ALLOWED_ROLES = [
  'student',
  'admin',
  'manager',
  'university_media_adviser',
  'president',
  'quality',
  'council',
  'supreme_council',
  'ministry',
  'naqaae'
]

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUserRole = (): string | null => {
  if (typeof window === 'undefined') return null
  
  // ✅ جرب كل المفاتيح المحتملة
  const keysToTry = ['user', 'User', 'USER', 'currentUser']
  
  for (const key of keysToTry) {
    try {
      const userStr = localStorage.getItem(key)
      if (userStr) {
        const user = JSON.parse(userStr)
        const rawRole = user?.role || user?.Role || user?.ROLE
        if (rawRole && typeof rawRole === 'string') {
          console.log(`✅ Found role under key '${key}':`, rawRole)
          return rawRole.trim().toLowerCase()  // ✅ lowercase للمقارنة الآمنة
        }
      }
    } catch {}
  }
  
  return null
}

    const userRole = getUserRole()

    // ✅ التحقق: لو مفيش رول أو مش في القائمة المسموحة
    if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
      console.warn('⚠️ [Dashboard] Unauthorized access attempt:', { 
        role: userRole, 
        allowed: ALLOWED_ROLES 
      })
      
      // ✅ نستخدم setTimeout عشان نتجنب خطأ الـ "setState during render"
      const timer = setTimeout(() => {
        router.push('/auth/login')
      }, 100)  // ✅ نخليه 100ms عشان ندي فرصة للـ render يخلص
      
      return () => clearTimeout(timer)
    }

    // ✅ لو كل حاجة تمام، نعرض الداشبورد
    console.log('✅ [Dashboard] Access granted for role:', userRole)
    setRole(userRole)
    setLoading(false)
    
  }, [router])

  // ✅ شاشة اللودينج
  if (loading || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // ✅ توجيه كل رول للداشبورد بتاعه
  switch (role) {
    case 'student':
      return <StudentDashboard />
    
    case 'manager':
      return <ManagerDashboard />
    
    case 'admin':
      return <Admin />
    
    case 'council':
      return <Council />
    
    case 'supreme_council':
      return <SupremeCouncilDashboard />
    
    case 'naqaae':
      return <NAQAAE />
    
    case 'university_media_adviser':
      return <MediaAdviserDashboard />
    
    case 'ministry':
      return <StakeholderDashboard />
    
    case 'quality':
      return <QualityAssuranceDashboard />
    
    case 'president':
      return <UniPresidentDashboard />
    
    default:
      // ✅ لو ظهر رول غريب (مستحيل يحصل لو الكود فوق شغال)
      console.error('❌ [Dashboard] Unknown role:', role)
      setTimeout(() => router.push('/auth/login'), 100)
      return null
  }
}