'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail, Loader2, Building2, CheckCircle, AlertCircle, ArrowLeft, Camera, X, RefreshCw, ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import axios from 'axios'
import { Scanner } from '@yudiel/react-qr-scanner'

// ============================================================
// 🔧 API CONFIGURATION
// ============================================================
const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'
const LOGIN_ENDPOINT = '/login'
const FORGOT_PASSWORD_ENDPOINT = '/auth/forgot-password'
const RESET_PASSWORD_ENDPOINT = '/auth/reset-password'

// ============================================================
// 🔧 QR SECURITY HELPERS (Frontend-Only Obfuscation)
// ============================================================
const QR_SECRET = 'mti_qr_secure_v2_change_this_in_prod'

const decodeQRData = (encoded: string): { email: string; password: string; issuedAt: number } | null => {
  try {
    const cleaned = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(cleaned)
    let original = ''
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i)
      const keyChar = QR_SECRET.charCodeAt(i % QR_SECRET.length)
      original += String.fromCharCode(charCode ^ keyChar)
    }
    const payload = JSON.parse(original)
    return { email: payload.e, password: payload.p, issuedAt: payload.t }
  } catch {
    return null
  }
}

const isQRValid = (issuedAt: number, maxAgeMs = 120000): boolean => {
  return Date.now() - issuedAt <= maxAgeMs
}

// ============================================================
// 🔧 STAKEHOLDER EMAILS MAPPING
// ============================================================
const STAKEHOLDER_EMAILS: Record<string, { type: string; name: string }> = {
  'dianera_mitsi@hotmail.com': { type: 'president', name: 'University President' },
  'info@mti.edu.eg': { type: 'quality', name: 'Quality Assurance Unit' },
  'private.uni25@gmail.com': { type: 'council', name: 'Council of Private Universities' },
  'scu@scu.eg': { type: 'supreme_council', name: 'Supreme Council of Universities' },
  'info@moe.gov.sa': { type: 'ministry', name: 'Ministry of Higher Education' },
  'it@naqaae.edu.eg': { type: 'naqaae', name: 'NAQAAE' },
}

// ============================================================
// 🔧 ROUTES CONFIGURATION
// ============================================================
const ROLE_ROUTES: Record<string, string> = {
  student: '/dashboard',
  admin: '/dashboard',
  manager: '/dashboard',
  university_media_adviser: '/dashboard',
  president: '/dashboard',
  quality: '/dashboard',
  council: '/dashboard',
  supreme_council: '/dashboard',
  ministry: '/dashboard',
  naqaae: '/dashboard'
}

// ============================================================
// 🔧 FORM SCHEMAS
// ============================================================
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type LoginForm = z.infer<typeof loginSchema>

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(4, 'Code must be 4 digits'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirm_password: z.string(),
}).refine(data => data.new_password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
})
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

// ============================================================
// 🔧 TOAST COMPONENT
// ============================================================
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const [visible, setVisible] = useState(true)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    success: 'bg-emerald-500 border-emerald-600',
    error: 'bg-red-500 border-red-600',
    info: 'bg-blue-500 border-blue-600'
  }

  const Icon = type === 'success' ? CheckCircle : AlertCircle

  if (!visible) return null

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-white border ${colors[type]} animate-in slide-in-from-bottom-5 fade-in duration-300`}>
      <Icon className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium max-w-sm">{message}</p>
      <button onClick={() => setVisible(false)} className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors">
        <EyeOff className="h-4 w-4" />
      </button>
    </div>
  )
}

// ============================================================
// 🔧 OTP INPUT COMPONENT
// ============================================================
function OtpInput({ 
  value, 
  onChange, 
  error 
}: { 
  value: string; 
  onChange: (value: string) => void;
  error?: string;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  
  const handleChange = (index: number, digit: string) => {
    if (!/^\d*$/.test(digit)) return
    const newValue = value.split('')
    newValue[index] = digit
    const result = newValue.join('').slice(0, 4)
    onChange(result)
    if (digit && index < 3 && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1]?.focus()
    }
  }
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }
  
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    onChange(pasted)
    const focusIndex = Math.min(pasted.length, 3)
    inputsRef.current[focusIndex]?.focus()
  }
  
  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {[0, 1, 2, 3].map((index) => (
          <input
            key={index}
            ref={(el) => { inputsRef.current[index] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={`w-10 h-10 text-center text-xl font-bold rounded-lg border-2 transition-all
              ${error 
                ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500/20'
              } focus:outline-none focus:ring-4`}
          />
        ))}
      </div>
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
      <p className="text-center text-xs text-slate-500">Code expires in 15 minutes</p>
    </div>
  )
}

// ============================================================
// 🔧 COMPONENT: QRLoginScanner - ALL MESSAGES IN ENGLISH
// ============================================================
// ============================================================
// 🔧 COMPONENT: QRLoginScanner - MOBILE-FIXED VERSION
// ============================================================
function QRLoginScanner({ onLoginSuccess }: { onLoginSuccess: (email: string, password: string) => void }) {
  const [scanning, setScanning] = useState(false)
  const [status, setStatus] = useState<'idle' | 'scanning' | 'processing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // ✅ Fallback: Upload QR image from gallery (works on HTTP!)
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  setStatus('processing')
  setMessage('Processing image...')

  try {
    // ✅ قراءة الصورة وتحويلها لنص
    const reader = new FileReader()
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string
      
      // ✅ هنا ممكن نستخدم مكتبة مثل 'jsqr' لفك الـ QR
      // لكن لأغراض التجربة، هنطلب من المستخدم يدخل الكود يدوياً
      const manualCode = prompt('Please paste the QR code data manually:')
      
      if (manualCode) {
        // ✅ نمرر الكود لدالة المسح العادية
        handleScan({ rawValue: manualCode })
      } else {
        setStatus('error')
        setMessage('No code entered')
      }
    }
    reader.readAsDataURL(file)
    
  } catch (err: any) {
    setStatus('error')
    setMessage(`❌ Failed to process image`)
    console.error(err)
  } finally {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
}

  // ✅ Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent || navigator.vendor
      return /android|iphone|ipad|ipod/i.test(ua)
    }
    setIsMobile(checkMobile())
  }, [])

  const handleScan = async (result: any) => {
    if (!result?.[0]?.rawValue) return
    
    setScanning(false)
    setStatus('processing')
    setMessage('Verifying code...')

    try {
      const decoded = decodeQRData(result[0].rawValue)
      
      if (!decoded) {
        throw new Error('Invalid or corrupted QR code')
      }
      
      if (!isQRValid(decoded.issuedAt)) {
        throw new Error('QR code has expired. Please generate a new one.')
      }

      // ✅ Confirm before auto-filling
      const confirmed = window.confirm(`Login as:\n${decoded.email}\n\nContinue?`)
      if (!confirmed) {
        setStatus('idle')
        setMessage('')
        return
      }

      // ✅ Auto-fill and trigger login
      onLoginSuccess(decoded.email, decoded.password)
      setStatus('success')
      setMessage('✅ Credentials filled. Signing in...')
      
    } catch (err: any) {
      setStatus('error')
      setMessage(`❌ ${err.message || 'Failed to scan QR code'}`)
      console.error('QR Login Error:', err)
    }
  }

  const handleScannerError = (err: any) => {
    console.error('Scanner error:', err)
    
    // ✅ Handle specific mobile errors
    if (err?.name === 'NotAllowedError' || err?.message?.includes('permission')) {
      setCameraError('Camera permission denied. Please allow camera access in your browser settings.')
    } else if (err?.name === 'NotFoundError' || err?.message?.includes('not found')) {
      setCameraError('No camera found on this device.')
    } else if (err?.name === 'NotReadableError' || err?.message?.includes('readable')) {
      setCameraError('Camera is being used by another app. Please close other apps and try again.')
    } else if (err?.name === 'OverconstrainedError') {
      setCameraError('Camera settings not supported. Try using a different browser.')
    } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setCameraError('Camera access requires a secure connection (HTTPS).')
    } else {
      setCameraError('Camera access unavailable. Please check permissions or try uploading an image.')
    }
    
    setStatus('error')
    setMessage(cameraError || 'Camera error')
    setScanning(false)
  }


  // ✅ Request camera permission explicitly (for mobile)
  const requestCameraPermission = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
        if (permission.state === 'denied') {
          setCameraError('Camera permission is permanently denied. Please enable it in your browser settings.')
          return false
        }
      }
      return true
    } catch {
      // ✅ Fallback: just try to open scanner, browser will prompt
      return true
    }
  }

  const startScanning = async () => {
    setCameraError(null)
    
    // ✅ Check for HTTPS on mobile
    if (isMobile && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setCameraError('For security, camera access requires HTTPS. Please use the secure link.')
      setStatus('error')
      setMessage('Camera requires HTTPS')
      return
    }
    
    // ✅ Request permission first on mobile
    if (isMobile) {
      const hasPermission = await requestCameraPermission()
      if (!hasPermission) return
    }
    
    setScanning(true)
    setStatus('scanning')
    setMessage('Point camera at QR code')
  }

  // return (
  //   <div className="flex flex-col items-center gap-3 p-2 w-full max-w-sm mx-auto">
  //     {!scanning && status === 'idle' && (
  //       <>
  //         <Button 
  //           variant="outline" 
  //           onClick={startScanning}
  //           className="flex items-center gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50 w-full"
  //         >
  //           <Camera className="w-4 h-4" /> Login with QR Code
  //         </Button>
          
  //         {/* ✅ Mobile-friendly hint */}
  //         {isMobile && (
  //           <p className="text-[10px] text-slate-400 text-center">
  //             Make sure to allow camera access when prompted
  //           </p>
  //         )}
          
  //         {/* ✅ Fallback: Upload from gallery */}
  //         <div className="w-full">
  //           <input
  //             ref={fileInputRef}
  //             type="file"
  //             accept="image/*"
  //             capture="environment"
  //             className="hidden"
  //             onChange={handleImageUpload}
  //             id="qr-image-upload"
  //           />
  //           <label 
  //             htmlFor="qr-image-upload"
  //             className="flex items-center justify-center gap-2 w-full py-2 text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
  //           >
  //             <ImageIcon className="w-3 h-3" />
  //             Or upload QR image from gallery
  //           </label>
  //         </div>
  //       </>
  //     )}

  //     {scanning && (
  //       <div className="relative w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden border-2 border-indigo-500/40">
  //         <Scanner 
  //           onScan={handleScan}
  //           onError={handleScannerError}
  //           components={{ 
  //             finder: false,
  //             scanner: {
  //               audio: false,
  //               // ✅ Mobile-optimized constraints
  //               constraints: {
  //                 video: {
  //                   facingMode: { ideal: 'environment' }, // ✅ Use back camera on mobile
  //                   width: { ideal: 1280 },
  //                   height: { ideal: 720 },
  //                   // ✅ iOS Safari fix
  //                   ...(isMobile ? { 
  //                     playsinline: true,
  //                     webkitPlaysinline: true 
  //                   } : {})
  //                 }
  //               }
  //             }
  //           }}
  //           scanDelay={800} // ✅ Slightly slower for mobile stability
  //         />
          
  //         {/* ✅ Scanner overlay */}
  //         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
  //           <div className="w-40 h-40 border-2 border-white/60 rounded-lg animate-pulse" />
  //         </div>
          
  //         {/* ✅ Close button */}
  //         <button 
  //           onClick={() => { setScanning(false); setStatus('idle'); setMessage(''); setCameraError(null) }}
  //           className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-colors z-10"
  //         >
  //           <X className="w-5 h-5" />
  //         </button>
          
  //         {/* ✅ Instructions */}
  //         <div className="absolute bottom-3 left-0 right-0 text-center px-4">
  //           <span className="px-3 py-1.5 bg-black/70 text-white text-xs rounded-full backdrop-blur-sm block">
  //             Align QR code within the frame
  //           </span>
  //         </div>
          
  //         {/* ✅ Ensure playsinline for iOS */}
  //         <style>{`
  //           video {
  //             object-fit: cover;
  //             width: 100%;
  //             height: 100%;
  //           }
  //           ${isMobile ? `
  //             video {
  //               -webkit-playsinline: true;
  //               playsinline: true;
  //               webkit-playsinline: true;
  //             }
  //           ` : ''}
  //         `}</style>
  //       </div>
  //     )}

  //     {/* ✅ Camera error message with solutions */}
  //     {cameraError && (
  //       <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-2">
  //         <p className="font-medium flex items-center gap-1">
  //           <AlertCircle className="w-3 h-3" /> Camera Issue
  //         </p>
  //         <p>{cameraError}</p>
          
  //         {/* ✅ Mobile-specific tips */}
  //         {isMobile && (
  //           <div className="space-y-1 pt-1 border-t border-amber-200">
  //             <p className="font-medium">Try these steps:</p>
  //             <ol className="list-decimal list-inside space-y-0.5 pl-1">
  //               <li>Tap "Allow" when browser asks for camera</li>
  //               <li>Check Settings → Privacy → Camera → Browser</li>
  //               <li>Close other apps using camera</li>
  //               <li>Refresh the page and try again</li>
  //             </ol>
  //           </div>
  //         )}
          
  //         {/* ✅ Fallback action */}
  //         <div className="pt-2">
  //           <label 
  //             htmlFor="qr-image-upload-fallback"
  //             className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 rounded-md text-amber-900 cursor-pointer transition-colors text-xs font-medium"
  //           >
  //             <ImageIcon className="w-3 h-3" />
  //             Upload QR image instead
  //           </label>
  //           <input
  //             id="qr-image-upload-fallback"
  //             type="file"
  //             accept="image/*"
  //             capture="environment"
  //             className="hidden"
  //             onChange={handleImageUpload}
  //           />
  //         </div>
  //       </div>
  //     )}

  //     {/* ✅ Status messages */}
  //     {(status === 'processing' || status === 'success' || (status === 'error' && !cameraError)) && (
  //       <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs w-full ${
  //         status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
  //         status === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
  //         'bg-indigo-50 text-indigo-700 border border-indigo-200'
  //       }`}>
  //         {status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
  //         {status === 'success' && <CheckCircle className="w-3 h-3" />}
  //         {status === 'error' && !cameraError && <AlertCircle className="w-3 h-3" />}
  //         {message}
  //       </div>
  //     )}
  //   </div>
  // )
}

// ============================================================
// 🔧 FORGOT PASSWORD MODAL
// ============================================================
function ForgotPasswordModal({ 
  onClose, 
  onShowToast,
  prefillEmail
}: { 
  onClose: () => void
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void
  prefillEmail?: string
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState(prefillEmail || '')
  const [modalError, setModalError] = useState<string | null>(null)
  const [otpValue, setOtpValue] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  const forgotForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: prefillEmail || '' },
  })

  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: prefillEmail || '', otp: '', new_password: '', confirm_password: '' },
  })

  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail)
      forgotForm.setValue('email', prefillEmail)
      resetForm.setValue('email', prefillEmail)
    }
  }, [prefillEmail, forgotForm, resetForm])

  useEffect(() => { 
    setModalError(null)
    setResetSuccess(false)
    if (step === 2) setOtpValue('')
  }, [step])

  const onRequestOtp = async (data: ForgotPasswordForm) => {
    const finalEmail = prefillEmail || data.email
    if (!finalEmail) {
      setModalError('Please enter your email in the login form first')
      return
    }
    
    setModalError(null)
    setLoading(true)
    try {
      const formData = new URLSearchParams()
      formData.append('email', finalEmail.trim().toLowerCase())

      const response = await axios.post(`${API_BASE_URL}${FORGOT_PASSWORD_ENDPOINT}`, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        timeout: 15000,
      })

      if (response.data.status === 'success') {
        setEmail(finalEmail)
        resetForm.setValue('email', finalEmail)
        setStep(2)
      }
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.response?.data?.message || 'Failed to send code'
      setModalError(msg)
    } finally {
      setLoading(false)
    }
  }

  const onResetPassword = async (data: ResetPasswordForm) => {
    setModalError(null)
    setLoading(true)
    try {
      const formData = new URLSearchParams()
      formData.append('email', data.email.trim().toLowerCase())
      formData.append('otp', otpValue.trim())
      formData.append('new_password', data.new_password)
      formData.append('confirm_password', data.confirm_password)

      const response = await axios.post(`${API_BASE_URL}${RESET_PASSWORD_ENDPOINT}`, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        timeout: 15000,
      })

      if (response.data.status === 'success') {
        setResetSuccess(true)
        setTimeout(() => onClose(), 2000)
      }
    } catch (error: any) {
      let errorMsg = 'Failed to reset password'
      const backendDetail = error.response?.data?.detail
      if (backendDetail) {
        if (Array.isArray(backendDetail)) {
          errorMsg = backendDetail.map((d: any) => d.msg || d).join(', ')
        } else if (typeof backendDetail === 'string') {
          errorMsg = backendDetail
        } else {
          errorMsg = JSON.stringify(backendDetail)
        }
      }
      setModalError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-lg shadow-2xl border-slate-200 bg-white" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-slate-800">
              {step === 1 ? 'Forgot Password' : 'Reset Password'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <Building2 className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {step === 1 ? 'Enter your email to receive a reset code' : 'Enter the code and your new password'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {resetSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Password changed successfully!</span>
            </div>
          )}

          {modalError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className={`h-2 rounded-full transition-all ${step >= s ? 'w-12 bg-blue-600' : 'w-4 bg-slate-200'}`} />
            ))}
          </div>

          {step === 1 && (
            <Form {...forgotForm}>
              <form onSubmit={forgotForm.handleSubmit(onRequestOtp)} className="space-y-4">
                <FormField control={forgotForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          type="email" 
                          placeholder="name@example.com" 
                          className="pl-10 h-11 bg-slate-50 cursor-not-allowed" 
                          {...field}
                          value={prefillEmail || field.value}
                          readOnly
                          disabled
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                    {!prefillEmail && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        Enter your email in the login form first
                      </p>
                    )}
                  </FormItem>
                )} />

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Code will be sent to your email address
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 h-11" onClick={onClose}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading || !prefillEmail} 
                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</> : 'Send Code'}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {step === 2 && (
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
                <input type="hidden" {...resetForm.register('email')} value={email} />
                
                <FormItem>
                  <FormLabel className="text-center block">Enter 4-Digit Code</FormLabel>
                  <OtpInput 
                    value={otpValue} 
                    onChange={(val) => {
                      setOtpValue(val)
                      resetForm.setValue('otp', val)
                    }}
                    error={resetForm.formState.errors.otp?.message}
                  />
                </FormItem>

                <FormField control={resetForm.control} name="new_password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input type={showPassword ? 'text' : 'password'} className="pl-10 pr-10 h-11" {...field} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                    <ul className="text-xs text-slate-500 space-y-1 mt-1">
                      <li>• At least 8 characters</li>
                      <li>• One uppercase letter (A-Z)</li>
                      <li>• One lowercase letter (a-z)</li>
                      <li>• One number (0-9)</li>
                    </ul>
                  </FormItem>
                )} />

                <FormField control={resetForm.control} name="confirm_password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input type={showPassword ? 'text' : 'password'} className="pl-10 h-11" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>Back</Button>
                  <Button type="submit" disabled={loading || otpValue.length !== 4 || resetSuccess} className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Resetting...</> : 'Reset Password'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// 🔧 MAIN COMPONENT - Login ✅ FIXED: formData error
// ============================================================
export default function Login() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const isLoading = form.formState.isSubmitting
  const emailValue = form.watch('email')

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  // ============================================================
  // 🔧 HANDLE QR LOGIN - Auto-fill form and submit
  // ============================================================
  const handleQRLogin = (email: string, password: string) => {
    form.setValue('email', email)
    form.setValue('password', password)
    
    // Small delay to let UI update before submitting
    setTimeout(() => {
      form.handleSubmit(onSubmit)()
    }, 300)
  }

  // ============================================================
  // 🔧 LOGIN SUBMIT
  // ============================================================
  async function onSubmit(data: LoginForm) {
    setApiError(null)
    const formData = new URLSearchParams()
    formData.append('email', data.email.trim().toLowerCase())
    formData.append('password', data.password)

    try {
      const response = await axios.post(`${API_BASE_URL}${LOGIN_ENDPOINT}`, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        withCredentials: false,
      })
      handleLoginSuccess(response.data, data.password) // ✅ Pass password as parameter
    } catch (error: any) {
      handleLoginError(error)
    }
  }

  // ============================================================
  // 🔧 HANDLE LOGIN SUCCESS ✅ FIXED: Accept password as parameter
  // ============================================================
  function handleLoginSuccess(responseData: any, password?: string) {
    console.log('🔍 [Login] Full backend response:', responseData)

    if (responseData.status === 'complete_registration') {
      setApiError('Please complete your account registration')
      setTimeout(() => {
        router.push(`/auth/register?email=${encodeURIComponent(responseData.email)}&step=complete`)
      }, 1500)
      return
    }

    if (responseData.status === 'first_login') {
      setApiError(responseData.message || 'Please update your password')
      return
    }

    if (responseData.status === 'success') {
      const user = responseData.user || {}
      const { 
        email, 
        role: backendRole,
        user_id: userId,
        full_name: fullName
      } = user
      
      console.log('🔍 [Login] Extracted user data:', { email, backendRole, userId })
      
      const normalizedEmail = email?.toLowerCase().trim()
      const stakeholderInfo = STAKEHOLDER_EMAILS[normalizedEmail]
      
      const finalRole = stakeholderInfo?.type || backendRole || 'student'
      
      console.log('🎯 [Login] Role resolution:', {
        email: normalizedEmail,
        isStakeholderEmail: !!stakeholderInfo,
        backendRole: backendRole,
        finalRole: finalRole
      })
      
      const redirectRoute = ROLE_ROUTES[finalRole] || '/dashboard'
      const userDisplayName = stakeholderInfo?.name || fullName || email?.split('@')[0] || 'User'

      const userData = {
        email,
        id: userId,
        user_id: userId,
        role: finalRole,
        role_id: null,
        name: userDisplayName,
        head: null,
        stakeholder_type: stakeholderInfo?.type || null,
      }
      
      console.log('💾 [Login] Saving to localStorage:', userData)
      localStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('token', responseData.token || '')
      
      // ✅ FIXED: Get password from parameter or form values
      const passwordToStore = password || form.getValues('password')
      if (passwordToStore) {
        sessionStorage.setItem('temp_qr_pass', passwordToStore)
      }
      
      console.log('🚀 [Login] Redirecting to:', redirectRoute)
      router.push(redirectRoute)
      router.refresh()
    } else {
      setApiError(responseData.message || 'Login failed. Please try again.')
    }
  }

  // ============================================================
  // 🔧 HANDLE LOGIN ERROR
  // ============================================================
  function handleLoginError(error: any) {
    console.error('❌ Login error:', error?.response?.data)
    let errorMessage = 'An unexpected error occurred. Please try again.'

    if (error?.response?.data) {
      const backendData = error.response.data
      const backendMessage = backendData?.detail || backendData?.message || backendData?.error
      if (backendMessage) {
        errorMessage = typeof backendMessage === 'string' ? backendMessage : JSON.stringify(backendMessage)
      }
      else if (error.response.status === 401) {
        errorMessage = 'Invalid email or password. Please try again.'
      } else if (error.response.status === 404) {
        errorMessage = 'Login endpoint not found.'
      } else if (error.response.status === 403) {
        errorMessage = 'Account locked. Please contact support.'
      } else if (error.response.status >= 500) {
        errorMessage = 'Server error. Please try again later.'
      }
    } else if (error?.request) {
      errorMessage = 'Cannot connect to server. Please check your internet connection.'
    } else {
      errorMessage = error?.message || 'Login failed. Please try again.'
    }

    setApiError(errorMessage)
  }

  // ============================================================
  // 🔧 HANDLE FORGOT PASSWORD CLICK
  // ============================================================
  const handleForgotPasswordClick = () => {
    const email = form.getValues('email')
    if (!email || !email.includes('@')) {
      form.setError('email', { type: 'manual', message: 'Please enter your email first' })
      setApiError('Please enter your email address before resetting password')
      return
    }
    setShowForgotPassword(true)
  }

  // ============================================================
  // 🔧 RENDER
  // ============================================================
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-white to-slate-100 px-4 py-12 sm:px-6 lg:px-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {showForgotPassword && (
        <ForgotPasswordModal 
          onClose={() => setShowForgotPassword(false)} 
          onShowToast={showToast}
          prefillEmail={emailValue}
        />
      )}

      <Card className="w-full max-w-md shadow-xl border-slate-200/70 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
        <CardHeader className="space-y-1 pb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-800">
              Welcome back
            </CardTitle>
          </div>
          <CardDescription className="text-base text-slate-500">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          {apiError && (
            <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 animate-in fade-in slide-in-from-top-2">
              {apiError}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          className="pl-10 h-11 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-colors"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          className="pl-10 pr-10 h-11 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-colors"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between text-sm pt-1">
                <button
                  type="button"
                  onClick={handleForgotPasswordClick}
                  className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all mt-2 shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </Form>

          {/* ✅ Divider */}
          {/* <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-2 bg-white text-slate-400">or</span>
            </div>
          </div> */}

          {/* ✅ QR Login Scanner - ALL ENGLISH MESSAGES */}
          {/* <QRLoginScanner onLoginSuccess={handleQRLogin} /> */}
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center gap-4 border-t bg-slate-50/60 pt-6 text-sm text-slate-500">
          <p>
            Don't have an account?{' '}
            <a href="/auth/register" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
              Create one now
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}