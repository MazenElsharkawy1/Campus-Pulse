'use client'
 
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Sparkles, Check, User, Phone, GraduationCap, Mail, Lock, Loader2, Hash, XCircle, AlertCircle, CheckCircle, KeyRound, RefreshCw, ArrowLeft, Camera, Image as ImageIcon, Eye, EyeOff } from "lucide-react"
import axios from 'axios'
 
// ============================================================
// 🔧 API CONFIGURATION - ✅ FIXED: Added /user prefix & timeouts
// ============================================================
const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'
const VALIDATE_EMAIL_ENDPOINT = '/user/validate/email'
const VALIDATE_PASSWORD_ENDPOINT = '/user/validate/password'
const VALIDATE_CONFIRM_PASSWORD_ENDPOINT = '/user/confirm-password'
const VALIDATE_PHONE_ENDPOINT = '/user/validate/phone'
const VALIDATE_STUDENT_ID_ENDPOINT = '/user/validate/student-id'
const REGISTER_REQUEST_ENDPOINT = '/user/register/request'
const REGISTER_VERIFY_ENDPOINT = '/user/register/verify'
const RESEND_OTP_ENDPOINT = '/user/register/resend-otp'
const USER_PREFERENCE_ENDPOINT = '/user/preferences'

// ============================================================
// 🔧 ALLOWED DOMAINS
// ============================================================
const ALLOWED_DOMAINS = [
  "cs.mti.edu.eg", "eng.mti.edu.eg", "med.mti.edu.eg",
  "mng.mti.edu.eg", "com.mti.edu.eg", "nur.mti.edu.eg",
  "phy.mti.edu.eg", "den.mti.edu.eg", "pha.mti.edu.eg",
  "mgr.mti.edu.eg", "media.mti.edu.eg", "admin.mti.edu.eg"
]

// ============================================================
// 🔧 FACULTY LIST
// ============================================================
const FACULTIES = [
  { id: "Computers And Artificial Intelligence", label: "Computers And Artificial Intelligence" },
  { id: "Engineering", label: "Engineering" },
  { id: "Medicine", label: "Medicine" },
  { id: "Management And Business Intelligence", label: "Management And Business Intelligence" },
  { id: "Nursing", label: "Nursing" },
  { id: "Physical Therapy", label: "Physical Therapy" },
  { id: "Oral and Dental Medicine", label: "Oral and Dental Medicine" },
  { id: "Pharmacy", label: "Pharmacy" },
  { id: "Mass Communication", label: "Mass Communication" },
]

// ============================================================
// 🔧 CATEGORY MAPPING
// ============================================================
const CATEGORY_ID_TO_NAME: Record<string, string> = {
  "Medical": "Medical", "Sports": "Sports", "Technology": "Technology",
  "Digital Media": "Digital Media", "Announcements": "Announcements",
  "Commerce": "Commerce", "Engineering": "Engineering",
}

const getCategoryName = (id: string): string => CATEGORY_ID_TO_NAME[id] || id
 
const categories = [
  { id: "Medical", label: "Medical" }, { id: "Sports", label: "Sports" },
  { id: "Technology", label: "Technology" }, { id: "Digital Media", label: "Digital Media" },
  { id: "Announcements", label: "Announcements" }, { id: "Commerce", label: "Commerce" },
  { id: "Engineering", label: "Engineering" },
]
 
const getCategoryEmoji = (label: string) => {
  const map: Record<string, string> = {
    "Medical": "👨‍️", "Sports": "⚽", "Technology": "👨‍💻",
    "Digital Media": "🎬", "Announcements": "📢", "Commerce": "💵", "Engineering": "👷‍♂️",
  }
  return map[label] || "✨"
}

// ============================================================
// 🔧 TYPE DEFINITIONS
// ============================================================
type RegisterFormData = {
  name: string
  phone: string
  email: string
  password: string
  repassword: string
  faculty?: string
  student_id?: number
  interests: string[]
  otp?: string
  profilePicture?: FileList
}

interface ValidationResponse {
  valid: boolean
  error: string | null
  field: string
  requirements?: Record<string, boolean>
  allowed_domains?: string[]
  exists?: boolean
  example?: string
}

// ============================================================
// 🔧 TOAST COMPONENT
// ============================================================
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    success: 'bg-emerald-500 border-emerald-600',
    error: 'bg-red-500 border-red-600',
    info: 'bg-blue-500 border-blue-600'
  }

  const Icon = type === 'success' ? CheckCircle : AlertCircle

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-white border ${colors[type]} animate-in slide-in-from-bottom-5 fade-in duration-300`}>
      <Icon className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium max-w-sm">{message}</p>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  )
}

// ============================================================
// 🔧 ROBUST REAL-TIME VALIDATION HOOKS (Network Error Proof)
// ============================================================

function useEmailValidation(email: string, enabled: boolean) {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()

  const validate = useCallback(async (emailToValidate: string) => {
    if (!emailToValidate || !enabled) {
      setValidationResult(null)
      setIsOffline(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    debounceRef.current = setTimeout(async () => {
      setIsValidating(true)
      try {
        const response = await axios.get<ValidationResponse>(
          `${API_BASE_URL}${VALIDATE_EMAIL_ENDPOINT}`,
          { 
            params: { email: emailToValidate, check_exists: true },
            timeout: 10000,
            headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }
          }
        )
        setValidationResult(response.data)
        setIsOffline(false)
      } catch (error: any) {
        console.warn('⚠️ Email validation offline (fallback active):', error?.message)
        setIsOffline(true)
        
        // ✅ Fallback: Client-side validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToValidate)) {
          setValidationResult({ valid: false, error: "Please enter a valid email address", field: 'email' })
        } else {
          const domain = emailToValidate.split('@')[1]
          if (!ALLOWED_DOMAINS.includes(domain)) {
            setValidationResult({ 
              valid: false, 
              error: `Email must be from MTI domain. Allowed: ${ALLOWED_DOMAINS.slice(0, 3).join(', ')}...`, 
              field: 'email',
              allowed_domains: ALLOWED_DOMAINS
            })
          } else {
            setValidationResult({ valid: true, error: null, field: 'email' })
          }
        }
      } finally {
        setIsValidating(false)
      }
    }, 500)
  }, [enabled])

  useEffect(() => { validate(email); return () => { if (debounceRef.current) clearTimeout(debounceRef.current) } }, [email, validate])
  return { isValidating, validationResult, isOffline }
}

// ✅ في بداية الـ component، ضيفي الـ helper ده:
const getClientSidePasswordRequirements = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }
}

// ✅ وفي الـ usePasswordValidation، خلي الـ fallback هو الأساس:
function usePasswordValidation(password: string, enabled: boolean) {
  const [isValidating, setIsValidating] = useState(false)
  const [requirements, setRequirements] = useState<Record<string, boolean> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  const validate = useCallback(async (passwordToValidate: string) => {
    if (!passwordToValidate || !enabled) {
      setRequirements(null)
      setError(null)
      return
    }

    // ✅ ALWAYS use client-side validation (more reliable)
    const reqs = getClientSidePasswordRequirements(passwordToValidate)
    setRequirements(reqs)
    setError(Object.values(reqs).every(Boolean) ? null : "Password does not meet requirements")
    
  }, [enabled])

  useEffect(() => { 
    validate(password)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) } 
  }, [password, validate])
  
  return { isValidating, requirements, error, isOffline: false }
}
function useConfirmPasswordValidation(password: string, confirmPassword: string, enabled: boolean) {
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()

  const validate = useCallback(async (pwd: string, confirm: string) => {
    if (!confirm || !enabled) { setError(null); setIsOffline(false); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    debounceRef.current = setTimeout(async () => {
      setIsValidating(true)
      try {
        const formData = new URLSearchParams()
        formData.append('password', pwd)
        formData.append('confirm_password', confirm)
        
        const response = await axios.post<ValidationResponse>(
          `${API_BASE_URL}${VALIDATE_CONFIRM_PASSWORD_ENDPOINT}`,
          formData.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'ngrok-skip-browser-warning': 'true' }, timeout: 10000 }
        )
        setError(response.data.error)
        setIsOffline(false)
      } catch (error: any) {
        console.warn('⚠️ Confirm password validation offline (fallback active):', error?.message)
        setIsOffline(true)
        setError(pwd !== confirm ? "Passwords do not match" : null)
      } finally {
        setIsValidating(false)
      }
    }, 300)
  }, [enabled])

  useEffect(() => { validate(password, confirmPassword); return () => { if (debounceRef.current) clearTimeout(debounceRef.current) } }, [password, confirmPassword, validate])
  return { isValidating, error, isOffline }
}

function usePhoneValidation(phone: string, enabled: boolean) {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()

  const validate = useCallback(async (phoneToValidate: string) => {
    if (!phoneToValidate || !enabled) { setValidationResult(null); setIsOffline(false); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    debounceRef.current = setTimeout(async () => {
      setIsValidating(true)
      try {
        const response = await axios.get<ValidationResponse>(
          `${API_BASE_URL}${VALIDATE_PHONE_ENDPOINT}`,
          { 
            params: { phone: phoneToValidate, check_exists: true },
            timeout: 10000,
            headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }
          }
        )
        setValidationResult(response.data)
        setIsOffline(false)
      } catch (error: any) {
        console.warn('⚠️ Phone validation offline (fallback active):', error?.message)
        setIsOffline(true)
        
        // ✅ Fallback: Client-side Egyptian number check
        const phoneClean = phoneToValidate.replace(/[\s\-\(\)]/g, '')
        if (!/^01[0125]\d{8}$/.test(phoneClean)) {
          setValidationResult({ 
            valid: false, 
            error: "Invalid Egyptian phone number. Must start with 010, 011, 012, or 015", 
            field: 'phone',
            example: "01012345678"
          })
        } else {
          setValidationResult({ valid: true, error: null, field: 'phone' })
        }
      } finally {
        setIsValidating(false)
      }
    }, 500)
  }, [enabled])

  useEffect(() => { validate(phone); return () => { if (debounceRef.current) clearTimeout(debounceRef.current) } }, [phone, validate])
  return { isValidating, validationResult, isOffline }
}

function useStudentIdValidation(studentId: number | undefined, enabled: boolean) {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()

  const validate = useCallback(async (id: number | undefined) => {
    if (!id || !enabled) { setValidationResult(null); setIsOffline(false); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    debounceRef.current = setTimeout(async () => {
      setIsValidating(true)
      try {
        const response = await axios.get<ValidationResponse>(
          `${API_BASE_URL}${VALIDATE_STUDENT_ID_ENDPOINT}`,
          { 
            params: { student_id: id, check_exists: true },
            timeout: 10000,
            headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }
          }
        )
        setValidationResult(response.data)
        setIsOffline(false)
      } catch (error: any) {
        console.warn('⚠️ Student ID validation offline (fallback active):', error?.message)
        setIsOffline(true)
        setValidationResult({ valid: true, error: null, field: 'student_id' }) // Assume valid if offline
      } finally {
        setIsValidating(false)
      }
    }, 500)
  }, [enabled])

  useEffect(() => { validate(studentId); return () => { if (debounceRef.current) clearTimeout(debounceRef.current) } }, [studentId, validate])
  return { isValidating, validationResult, isOffline }
}
 
export default function Register() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 1.5 | 2>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isStudent, setIsStudent] = useState<boolean | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [otpResendTimer, setOtpResendTimer] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null)
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [enableRealTimeValidation, setEnableRealTimeValidation] = useState(false)
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const form = useForm<RegisterFormData>({
    defaultValues: {
      name: "", phone: "", email: "", password: "", repassword: "",
      faculty: "", student_id: undefined, interests: [], otp: "",
    },
    mode: "onChange",
  })

  // Watch form values for real-time validation
  const emailValue = useWatch({ control: form.control, name: 'email' })
  const passwordValue = useWatch({ control: form.control, name: 'password' })
  const repasswordValue = useWatch({ control: form.control, name: 'repassword' })
  const phoneValue = useWatch({ control: form.control, name: 'phone' })
  const studentIdValue = useWatch({ control: form.control, name: 'student_id' })

  // Real-time validation hooks
  const emailValidation = useEmailValidation(emailValue, enableRealTimeValidation)
  const passwordValidation = usePasswordValidation(passwordValue, enableRealTimeValidation)
  const confirmPasswordValidation = useConfirmPasswordValidation(passwordValue, repasswordValue, enableRealTimeValidation)
  const phoneValidation = usePhoneValidation(phoneValue, enableRealTimeValidation)
  const studentIdValidation = useStudentIdValidation(studentIdValue, enableRealTimeValidation)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  // Enable real-time validation after component mounts (to avoid initial flicker)
  useEffect(() => {
    const timer = setTimeout(() => setEnableRealTimeValidation(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  // OTP Resend Timer Effect
  useEffect(() => {
    if (otpResendTimer > 0) {
      const timer = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [otpResendTimer])

  // Handle profile picture preview
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        form.setError('profilePicture', { type: 'manual', message: 'File size must be less than 5MB' })
        showToast('File size must be less than 5MB', 'error')
        return
      }
      
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        form.setError('profilePicture', { type: 'manual', message: 'Only JPEG, PNG, and WEBP files are allowed' })
        showToast('Only JPEG, PNG, and WEBP files are allowed', 'error')
        return
      }
      
      setProfilePictureFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      form.clearErrors('profilePicture')
    }
  }

  // ============================================================
  // 🔧 CLIENT-SIDE VALIDATION (Fallback if backend validation fails)
  // ============================================================
  const getValidationErrors = (): Record<string, string> => {
    const data = form.getValues()
    const errors: Record<string, string> = {}

    if (!data.name?.trim()) errors.name = "Full name is required"

    if (!data.email?.trim()) {
      errors.email = "Email address is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = "Please enter a valid email address"
    } else {
      const domain = data.email.split('@')[1]
      if (!ALLOWED_DOMAINS.includes(domain)) {
        errors.email = `Email must be from MTI domain. Allowed: ${ALLOWED_DOMAINS.slice(0, 3).join(', ')}...`
      }
    }

    if (!data.password) {
      errors.password = "Password is required"
    } else if (passwordValidation.error) {
      errors.password = passwordValidation.error
    }

    if (!data.repassword) {
      errors.repassword = "Please confirm your password"
    } else if (data.password !== data.repassword) {
      errors.repassword = "Passwords do not match"
    } else if (confirmPasswordValidation.error) {
      errors.repassword = confirmPasswordValidation.error
    }

    if (!data.phone?.trim()) {
      errors.phone = "Phone number is required"
    } else if (phoneValidation.validationResult?.error) {
      errors.phone = phoneValidation.validationResult.error
    }

    if (!data.faculty) errors.faculty = "Please select your faculty"
    if (!profilePictureFile) errors.profilePicture = "Profile picture is required"

    return errors
  }

  // ============================================================
  // 🔧 STEP 1: Submit Registration Request + Send OTP - ✅ FIXED
  // ============================================================
  const handleRegisterRequest = async () => {
    // First, run client-side validation
    const errors = getValidationErrors()
    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([field, message]) => {
        form.setError(field as any, { type: 'manual', message })
      })
      showToast(Object.values(errors)[0] as string, 'error')
      return
    }

    setIsLoading(true)
    
    const data = form.getValues()
    const formData = new FormData()
    
    // ✅ Match backend field names exactly
    formData.append('email', data.email.toLowerCase().trim())
    formData.append('password', data.password)
    formData.append('confirm_password', data.repassword)
    formData.append('full_name', data.name.trim())
    formData.append('phone', data.phone.trim())
    formData.append('faculty', data.faculty || '')
    
    // ✅ Handle optional student_id - Convert to string for FormData
    if (data.student_id) {
      formData.append('student_id', String(data.student_id))
    }
    
    // ✅ Handle REQUIRED file upload - Backend expects 'file' field
    if (profilePictureFile) {
      // ✅ Append with filename to help backend process it
      formData.append('file', profilePictureFile, profilePictureFile.name)
    } else {
      // Backend requires file, so block submission if missing
      form.setError('profilePicture', { type: 'manual', message: 'Profile picture is required' })
      showToast('Profile picture is required', 'error')
      setIsLoading(false)
      return
    }
    
    try {
      const fullUrl = `${API_BASE_URL}${REGISTER_REQUEST_ENDPOINT}`
      console.log('📤 Sending to:', fullUrl)
      
      // ✅ IMPORTANT: DON'T set 'Content-Type' for FormData!
      // Browser will set it automatically with the correct boundary
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData,
      })
      
      console.log('📥 Status:', res.status)
      
      let responseData: any
      try {
        const text = await res.text()
        console.log('📄 Response:', text)
        responseData = text ? JSON.parse(text) : {}
      } catch (e) {
        console.error('Failed to parse response')
        responseData = {}
      }
      
      if (!res.ok) {
        // ✅ Backend returns errors in 'detail' field (FastAPI standard)
        const errorMsg = responseData?.detail || responseData?.message || responseData?.error || `Error ${res.status}`
        console.error('❌ Backend error:', errorMsg)
        
        // Map error to form field for inline display
        const lower = errorMsg.toLowerCase()
        let field: keyof RegisterFormData | null = null
        if (lower.includes('email') || lower.includes('already registered') || lower.includes('domain')) field = 'email'
        else if (lower.includes('phone') || lower.includes('mobile')) field = 'phone'
        else if (lower.includes('student id')) field = 'student_id'
        else if (lower.includes('password')) field = 'password'
        else if (lower.includes('file') || lower.includes('picture') || lower.includes('image')) field = 'profilePicture'
        
        if (field) form.setError(field, { type: 'backend', message: errorMsg })
        showToast(errorMsg, 'error')
        setIsLoading(false)
        return
      }
      
      if (responseData?.status === 'success') {
        setPendingEmail(data.email)
        setOtpResendTimer(30)
        setStep(1.5)
        showToast('✅ Verification code sent to your email!', 'success')
      } else {
        showToast(responseData?.detail || 'Registration failed', 'error')
      }

    } catch (error: any) {
      console.error('❌ Network error:', error)
      showToast('Cannot connect to server. Please check your connection.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================
  // 🔧 STEP 1.5: Verify OTP + Create Account
  // ============================================================
  const handleVerifyOtp = async () => {
    if (!pendingEmail) {
      showToast('Session expired. Please start over.', 'error')
      setStep(1)
      return
    }

    const otp = form.getValues('otp')?.trim()
    if (!otp || otp.length !== 4) {
      form.setError('otp', { type: 'manual', message: 'Please enter the 4-digit code' })
      showToast('OTP must be 4 digits', 'error')
      return
    }

    setIsLoading(true)
    
    try {
      const formData = new URLSearchParams()
      formData.append('email', pendingEmail)
      formData.append('otp', otp)
      
      const fullUrl = `${API_BASE_URL}${REGISTER_VERIFY_ENDPOINT}`
      console.log('📤 Verifying OTP at:', fullUrl)
      
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData.toString(),
      })
      
      const responseText = await res.text()
      console.log('📥 OTP Response:', responseText)
      
      let responseData: any
      try {
        responseData = JSON.parse(responseText)
      } catch {
        showToast('Server error. Please try again.', 'error')
        setIsLoading(false)
        return
      }
      
      if (!res.ok) {
        const errorMsg = responseData?.detail || responseData?.message || responseData?.error || `Error ${res.status}`
        showToast(errorMsg, 'error')
        setIsLoading(false)
        return
      }
      
      if (responseData?.status === 'success' && responseData?.user) {
        const user = responseData.user
        
        localStorage.setItem('user', JSON.stringify({
          email: user.email,
          name: user.full_name,
          role: user.role,
          role_id: user.role_id,
          user_id: user.user_id,
          is_student: user.role === 'student',
        }))

        const isStudentUser = user.role === 'student'
        setIsStudent(isStudentUser)
        
        if (!isStudentUser) {
          showToast('Account created successfully! Redirecting...', 'success')
          setTimeout(() => {
            router.push('/auth/login')
            router.refresh()
          }, 1500)
          return
        }
        
        showToast('Account verified! Please select your interests.', 'success')
        setStep(2)
        setPendingEmail(null)
        
      } else {
        showToast(responseData?.detail || 'Verification failed', 'error')
      }

    } catch (error: any) {
      console.error('❌ OTP Verify Error:', error)
      showToast('Cannot connect to server.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================
  // 🔧 Resend OTP
  // ============================================================
  const handleResendOtp = async () => {
    if (!pendingEmail || otpResendTimer > 0) return
    
    setIsLoading(true)
    try {
      const formData = new URLSearchParams()
      formData.append('email', pendingEmail)
      
      const res = await fetch(`${API_BASE_URL}${RESEND_OTP_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData.toString(),
      })
      
      const responseData = await res.json()
      
      if (res.ok && responseData?.status === 'success') {
        setOtpResendTimer(30)
        showToast('✅ New code sent to your email!', 'success')
        form.setValue('otp', '')
      } else {
        showToast(responseData?.detail || 'Failed to resend code', 'error')
      }
    } catch {
      showToast('Failed to resend code. Please try again.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================
  // 🔧 SAVE PREFERENCES (Step 2) - ✅ FIXED
  // ============================================================
  const saveUserPreferences = async (interests: string[]) => {
    setIsLoading(true)
    const email = pendingEmail || form.getValues('email')
    
    if (!email) {
      showToast('Email is required', 'error')
      setIsLoading(false)
      return false
    }
    
    const categoryNames = interests.map(getCategoryName)
    const formData = new URLSearchParams()
    formData.append('email', email)
    // ✅ Backend expects comma-separated string for category_names
    formData.append('category_names', categoryNames.join(','))
    
    try {
      const res = await fetch(`${API_BASE_URL}${USER_PREFERENCE_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',  // ✅ Required for URLSearchParams
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData.toString(),
      })
      
      let responseData: any
      try {
        responseData = await res.json()
      } catch {
        showToast('Server error. Please try again.', 'error')
        setIsLoading(false)
        return false
      }
      
      if (!res.ok) {
        const errorMsg = responseData?.detail || responseData?.message || `Error ${res.status}`
        showToast(errorMsg, 'error')
        setIsLoading(false)
        return false
      }
      
      if (responseData?.status === 'success') {
        showToast('Preferences saved successfully! Redirecting...', 'success')
        setTimeout(() => {
          router.push('/auth/login')
          router.refresh()
        }, 1500)
        return true
      } else {
        showToast(responseData?.message || 'Failed to save preferences', 'error')
        return false
      }
      
    } catch (error: any) {
      console.error('❌ Preference save error:', error)
      showToast('Connection error. Please try again.', 'error')
      return false
    } finally {
      setIsLoading(false)
    }
  }
 
  // ============================================================
  // 🔧 FINAL SUBMIT (Step 2)
  // ============================================================
  const handleFinalSubmit = async (data: RegisterFormData) => {
    if (isStudent === false) {
      router.push('/auth/login')
      return
    }
    
    if (!data.interests?.length) {
      form.setError('interests', { type: 'manual', message: 'Select at least one interest' })
      showToast('Select at least one interest', 'error')
      return
    }
    
    await saveUserPreferences(data.interests)
  }

  // Go back from OTP step to form
  const handleBackToForm = () => {
    setStep(1)
    setPendingEmail(null)
    form.setValue('otp', '')
  }

  // Helper to get requirement text
 // ✅ Helper to get requirement text - تأكدى إنها موجودة في الـ component
const getPasswordRequirementText = (key: string) => {
  const texts: Record<string, string> = {
    minLength: "At least 8 characters",
    hasUppercase: "At least one uppercase letter (A-Z)",
    hasLowercase: "At least one lowercase letter (a-z)",
    hasNumber: "At least one number (0-9)",
    hasSpecial: "At least one special character (!@#$%^&*)",
  }
  return texts[key] || key // ✅ Fallback to key if not found
}
 
  return (
    <div className="min-h-screen bg-[#f8f5f0] dark:bg-slate-950 font-serif relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-white dark:bg-slate-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <span className="text-2xl font-bold tracking-tight">CampusPulse</span>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {step === 1 ? 'Step 1 of 3' : step === 1.5 ? 'Step 2 of 3' : 'Step 3 of 3'}
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-6 pb-6">
          <div className="h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-500"
              style={{ width: step === 1 ? '33%' : step === 1.5 ? '66%' : '100%' }} />
          </div>
        </div>
      </div>
 
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-20">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFinalSubmit)}>
 
            {/* ✅ STEP 1: Registration Form */}
            {step === 1 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-10 md:p-14">
                <button type="button" onClick={() => router.push('/auth/login')}
                  className="flex items-center gap-2 text-zinc-500 hover:text-indigo-600 mb-6 transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back to Login
                </button>

                <div className="text-center mb-12">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mb-6">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-4xl font-bold tracking-tight text-black dark:text-white">Create your account</h2>
                </div>
 
                <div className="space-y-6">
                  {/* Profile Picture Upload */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-zinc-200 dark:border-zinc-700">
                        {profilePicturePreview ? (
                          <img src={profilePicturePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (<Camera className="h-8 w-8 text-zinc-400" />)}
                      </div>
                      <label htmlFor="profile-picture-input"
                        className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-colors border-2 border-white">
                        <ImageIcon className="h-4 w-4 text-white" />
                      </label>
                    </div>
                    <input id="profile-picture-input" type="file" accept="image/jpeg,image/png,image/webp"
                      className="hidden" onChange={handleProfilePictureChange} />
                    <p className="text-xs text-zinc-500">JPEG, PNG, or WEBP (max 5MB)</p>
                    {form.formState.errors.profilePicture && (
                      <p className="text-xs text-red-500">{form.formState.errors.profilePicture.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <FormField name="name" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex font-extrabold items-center gap-3 text-base">
                          <User className="h-4 w-4 text-zinc-500" /> Full Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ahmed Mohamed" className="h-14 text-base" {...field}
                            value={field.value ?? ""}
                            onChange={(e) => { field.onChange(e); if (form.getFieldState('name').error) form.clearErrors('name') }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    {/* Phone with Real-Time Validation */}
                    <FormField name="phone" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex font-extrabold items-center gap-3 text-base">
                          <Phone className="h-4 w-4 text-zinc-500" /> Phone Number
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="tel" placeholder="01012345678" className="h-14 text-base pr-10" {...field}
                              value={field.value ?? ""}
                              onChange={(e) => { field.onChange(e); if (form.getFieldState('phone').error) form.clearErrors('phone') }} />
                            {phoneValidation.isValidating && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />
                            )}
                            {!phoneValidation.isValidating && phoneValidation.validationResult?.valid && (
                              <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                            )}
                            {!phoneValidation.isValidating && phoneValidation.isOffline && (
                              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" title="Offline validation" />
                            )}
                          </div>
                        </FormControl>
                        {(phoneValidation.validationResult?.error || phoneValidation.isOffline) && !form.formState.errors.phone && (
                          <p className={`text-xs ${phoneValidation.isOffline ? 'text-yellow-600' : 'text-red-500'}`}>
                            {phoneValidation.validationResult?.error}{phoneValidation.isOffline && " (offline)"}
                          </p>
                        )}
                        <FormMessage />
                        {phoneValidation.validationResult?.example && (
                          <p className="text-xs text-zinc-500 mt-1">Example: {phoneValidation.validationResult.example}</p>
                        )}
                      </FormItem>
                    )} />
                  </div>
                  
                  {/* Email with Real-Time Validation */}
                  <FormField name="email" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex font-extrabold items-center gap-3 text-base">
                        <Mail className="h-4 w-4 text-zinc-500" /> Email Address
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="email" placeholder="loay.101060@cs.mti.edu.eg" className="h-14 text-base pr-10" {...field}
                            value={field.value ?? ""}
                            onChange={(e) => { field.onChange(e); if (form.getFieldState('email').error) form.clearErrors('email') }} />
                          {emailValidation.isValidating && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />
                          )}
                          {!emailValidation.isValidating && emailValidation.validationResult?.valid && (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                          )}
                          {!emailValidation.isValidating && emailValidation.isOffline && (
                            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" title="Offline validation" />
                          )}
                        </div>
                      </FormControl>
                      {(emailValidation.validationResult?.error || emailValidation.isOffline) && !form.formState.errors.email && (
                        <p className={`text-xs ${emailValidation.isOffline ? 'text-yellow-600' : 'text-red-500'}`}>
                          {emailValidation.validationResult?.error}{emailValidation.isOffline && " (offline)"}
                        </p>
                      )}
                      <FormMessage />
                      <p className="text-xs text-zinc-500 mt-1">
                        Must be from MTI domain: {ALLOWED_DOMAINS.slice(0, 3).join(', ')}...
                      </p>
                      {emailValidation.validationResult?.allowed_domains && (
                        <p className="text-[10px] text-zinc-400 mt-1">
                          Allowed: {emailValidation.validationResult.allowed_domains.join(', ')}
                        </p>
                      )}
                    </FormItem>
                  )} />
                  
                  {/* Faculty */}
                  <FormField name="faculty" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex font-extrabold items-center gap-3 text-base">
                        <GraduationCap className="h-4 w-4 text-zinc-500" /> Faculty
                      </FormLabel>
                      <FormControl>
                        <select {...field}
                          className="flex h-14 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-slate-900 px-4 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                          value={field.value ?? ""}
                          onChange={(e) => { field.onChange(e.target.value || undefined); if (form.getFieldState('faculty').error) form.clearErrors('faculty') }}>
                          <option value="">Select your faculty...</option>
                          {FACULTIES.map((faculty) => (
                            <option key={faculty.id} value={faculty.id}>{faculty.label}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  {/* Student ID with Real-Time Validation */}
                  <FormField name="student_id" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex font-extrabold items-center gap-3 text-base">
                        <Hash className="h-4 w-4 text-zinc-500" /> Student ID (Optional)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" placeholder="e.g., 202400123" className="h-14 text-base pr-10" {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value ? parseInt(value) : undefined)
                              if (form.getFieldState('student_id').error) form.clearErrors('student_id')
                            }} />
                          {studentIdValidation.isValidating && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />
                          )}
                          {!studentIdValidation.isValidating && studentIdValidation.validationResult?.valid && (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                          )}
                          {!studentIdValidation.isValidating && studentIdValidation.isOffline && (
                            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" title="Offline validation" />
                          )}
                        </div>
                      </FormControl>
                      {studentIdValidation.validationResult?.error && !form.formState.errors.student_id && (
                        <p className="text-xs text-red-500">{studentIdValidation.validationResult.error}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  {/* Password & Confirm Password with Real-Time Validation */}
                  <div className="space-y-6">
                    <FormField name="password" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex font-extrabold items-center gap-3 text-base">
                          <Lock className="h-4 w-4 text-zinc-500" /> Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="Create a strong password"
                              className="h-14 text-base pr-12" {...field} value={field.value ?? ""}
                              onChange={(e) => { field.onChange(e); if (form.getFieldState('password').error) form.clearErrors('password') }} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </FormControl>
                        {/* Real-time password requirements from backend */}
                       {/* ✅ FIXED: Password requirements display */}
                      {/* ✅ ULTRA-SAFE Password Requirements */}
                                    {/* ✅ FIXED: Password requirements with proper state updates */}
{passwordValidation.requirements && (
  <div className="mt-3 space-y-1.5">
    {[
      { key: 'minLength', text: 'At least 8 characters' },
      { key: 'hasUppercase', text: 'At least one uppercase letter (A-Z)' },
      { key: 'hasLowercase', text: 'At least one lowercase letter (a-z)' },
      { key: 'hasNumber', text: 'At least one number (0-9)' },
      { key: 'hasSpecial', text: 'At least one special character (!@#$%^&*)' },
    ].map(({ key, text }) => {
      // ✅ Safe check for requirement status
      const isMet = passwordValidation.requirements?.[key] === true
      const isPending = passwordValidation.requirements?.[key] === undefined
      
      return (
        <div key={key} className="flex items-center gap-2 text-xs">
          {isPending ? (
            <Loader2 className="h-4 w-4 text-zinc-400 flex-shrink-0 animate-spin" />
          ) : isMet ? (
            <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          )}
          <span className={isMet ? 'text-emerald-600' : isPending ? 'text-zinc-400' : 'text-red-500'}>
            {text}
          </span>
        </div>
      )
    })}
  </div>
)}
                        {(passwordValidation.error || passwordValidation.isOffline) && !form.formState.errors.password && (
                          <p className={`text-xs ${passwordValidation.isOffline ? 'text-yellow-600' : 'text-red-500'} mt-1`}>
                            {passwordValidation.error}{passwordValidation.isOffline && " (offline)"}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <FormField name="repassword" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex font-extrabold items-center gap-3 text-base">
                          <Lock className="h-4 w-4 text-zinc-500" /> Confirm Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="password" placeholder="Confirm password" className="h-14 text-base pr-10" {...field}
                              value={field.value ?? ""}
                              onChange={(e) => { field.onChange(e); if (form.getFieldState('repassword').error) form.clearErrors('repassword') }} />
                            {confirmPasswordValidation.isValidating && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />
                            )}
                            {!confirmPasswordValidation.isValidating && !confirmPasswordValidation.error && repasswordValue && passwordValue === repasswordValue && (
                              <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                            )}
                            {!confirmPasswordValidation.isValidating && confirmPasswordValidation.isOffline && (
                              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" title="Offline validation" />
                            )}
                          </div>
                        </FormControl>
                        {(confirmPasswordValidation.error || confirmPasswordValidation.isOffline) && !form.formState.errors.repassword && (
                          <p className={`text-xs ${confirmPasswordValidation.isOffline ? 'text-yellow-600' : 'text-red-500'}`}>
                            {confirmPasswordValidation.error}{confirmPasswordValidation.isOffline && " (offline)"}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                    
                  <Button type="button" onClick={handleRegisterRequest} disabled={isLoading}
                    className="w-full cursor-pointer h-16 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 transition-all rounded-2xl shadow-xl shadow-indigo-500/30 mt-6 disabled:opacity-70">
                    {isLoading ? (<><Loader2 className="h-5 w-5 animate-spin mr-2" /> Sending...</>) : ("Continue →")}
                  </Button>
                </div>
              </div>
            )}

            {/* ✅ STEP 1.5: OTP Verification */}
            {step === 1.5 && (
              <div className="min-h-[60vh] flex items-center justify-center px-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-8 md:p-12 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <button type="button" onClick={handleBackToForm}
                    className="flex items-center gap-2 text-zinc-500 hover:text-indigo-600 mb-6 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>

                  <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
                      <KeyRound className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">Verify Your Email</h2>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base">
                      We sent a 4-digit code to:<br />
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 break-all">{pendingEmail}</span>
                    </p>
                  </div>

                  <FormField name="otp" control={form.control} render={({ field }) => (
                    <FormItem className="mb-6">
                      <FormLabel className="flex font-bold items-center justify-center gap-2 text-zinc-700 dark:text-zinc-300 mb-3">
                        <KeyRound className="h-4 w-4" /> Enter the 4-digit code
                      </FormLabel>
                      <FormControl>
                        <Input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="0000" autoFocus
                          className="h-16 text-center text-3xl tracking-[0.5em] font-mono font-bold border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-slate-800 text-zinc-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 transition-all duration-200"
                          {...field} value={field.value ?? ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '')
                            field.onChange(value)
                            if (form.getFieldState('otp').error) form.clearErrors('otp')
                          }} />
                      </FormControl>
                      <FormMessage className="text-center" />
                    </FormItem>
                  )} />

                  {(() => {
                    const otpValue = form.watch('otp') || ''
                    return (
                      <div className="space-y-4">
                        <Button type="button" onClick={handleVerifyOtp} disabled={isLoading || otpValue.length !== 4}
                          className={`w-full h-14 text-base md:text-lg font-semibold rounded-2xl shadow-xl transition-all duration-300
                            ${otpValue.length === 4 ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 shadow-indigo-500/30 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed shadow-none'}`}>
                          {isLoading ? (<span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Verifying...</span>) : ("Verify & Continue →")}
                        </Button>

                        <div className="flex flex-col items-center gap-3 pt-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-zinc-500 dark:text-zinc-400">Didn't receive the code?</span>
                            {otpResendTimer > 0 ? (
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Resend in {otpResendTimer}s</span>
                            ) : (
                              <button type="button" onClick={handleResendOtp} disabled={isLoading}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium hover:underline flex items-center gap-1 disabled:opacity-50 transition-colors">
                                <RefreshCw className="h-3.5 w-3.5" /> Resend Code
                              </button>
                            )}
                          </div>
                          <button type="button" onClick={handleBackToForm}
                            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 text-sm font-medium hover:underline transition-colors flex items-center gap-1">
                            <ArrowLeft className="h-3.5 w-3.5" /> Use a different email
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
 
            {/* ✅ STEP 2: Interests Selection */}
            {step === 2 && isStudent !== false && (
              <div className="max-w-3xl mx-auto space-y-12">
                <button type="button" onClick={() => setStep(1.5)}
                  className="flex items-center gap-2 text-zinc-500 hover:text-indigo-600 transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <div className="text-center space-y-6">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl">
                    <Sparkles className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-5xl font-bold tracking-tight text-black dark:text-white">What sparks your interest?</h3>
                    <p className="mt-4 text-xl text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
                      Choose the topics you want to see in your personalized campus feed.<br />
                      <span className="text-indigo-600 font-medium">You can change this anytime later.</span>
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 dark:bg-indigo-950 px-6 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    {form.watch("interests")?.length || 0} selected
                  </div>
                </div>
 
                <FormField control={form.control} name="interests" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {categories.map((category) => {
                          const isSelected = field.value?.includes(category.id) ?? false
                          return (
                            <div key={category.id}
                              onClick={() => {
                                if (isSelected) {
                                  field.onChange(field.value?.filter((id: string) => id !== category.id) || [])
                                } else {
                                  field.onChange([...(field.value || []), category.id])
                                }
                                if (form.getFieldState('interests').error) form.clearErrors('interests')
                              }}
                              className={`group relative cursor-pointer overflow-hidden rounded-3xl border-2 p-8 text-center transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl active:scale-[0.985]
                                ${isSelected ? "border-transparent bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30 text-white" : "border-zinc-200 dark:border-zinc-700 hover:border-indigo-400 bg-white dark:bg-slate-900"}`}>
                              {isSelected && (
                                <div className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-lg">
                                  <Check className="h-5 w-5 text-indigo-600" strokeWidth={4} />
                                </div>
                              )}
                              <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-6xl transition-all duration-300 ${isSelected ? "bg-white/20 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-5xl group-hover:scale-110"}`}>
                                {getCategoryEmoji(category.label)}
                              </div>
                              <p className={`font-semibold text-2xl tracking-tight transition-colors ${isSelected ? "text-white" : "text-black dark:text-white group-hover:text-indigo-600"}`}>{category.label}</p>
                            </div>
                          )
                        })}
                      </div>
                    </FormControl>
                    <FormMessage className="text-center pt-3 text-base" />
                  </FormItem>
                )} />
 
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button type="button" variant="outline" size="lg" disabled={isLoading}
                    className="flex-1 h-16 rounded-2xl border-2 text-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => setStep(1.5)}>← Back</Button>
                  <Button type="submit" size="lg" disabled={isLoading}
                    className="flex-1 h-16 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-lg font-semibold shadow-xl shadow-indigo-500/30 hover:brightness-110 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed">
                    {isLoading ? (<><Loader2 className="h-5 w-5 animate-spin" /> Saving Preferences...</>) : ("Create Account")}
                  </Button>
                </div>
              </div>
            )}
 
            {/* ✅ STEP 2 (Non-student): Success Screen */}
            {step === 2 && isStudent === false && (
              <div className="max-w-2xl mx-auto text-center space-y-8">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl">
                  <Check className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h3 className="text-4xl font-bold tracking-tight text-black dark:text-white">Account Created Successfully!</h3>
                  <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                    Your account has been created with manager/media/admin privileges.<br />
                    You can now log in and start using CampusPulse.
                  </p>
                </div>
                <Button type="button" size="lg" className="h-14 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110"
                  onClick={() => router.push('/auth/login')}>Go to Login →</Button>
              </div>
            )}
 
          </form>
        </Form>
      </div>
    </div>
  )    
}