// 'use client'

// import { useState, useEffect, useRef } from 'react'
// import { useRouter } from 'next/navigation'
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { QRCodeSVG } from 'qrcode.react'
// import {
//   Pencil, Save, X, Mail, Lock, Phone, GraduationCap, Newspaper,
//   LogOut, Camera, Loader2, Check, Sparkles, Trash2, User, RefreshCw, AlertTriangle
// } from "lucide-react"
// import Link from 'next/link'
// import axios from 'axios'

// // ============================================================
// // 🔧 API CONFIGURATION
// // ============================================================
// const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'
// const PROFILE_ENDPOINT = '/api/v1/profile'
// const USER_IMAGES_ENDPOINT = '/api/v1/users/images'

// // ============================================================
// // 🔧 QR SECURITY HELPERS (Frontend-Only Obfuscation)
// // ============================================================
// const QR_SECRET = 'mti_qr_secure_v2_change_this_in_prod'

// const encodeQRData = (email: string, password: string): string => {
//   const payload = { e: email, p: password, t: Date.now() }
//   const str = JSON.stringify(payload)
//   let encoded = ''
//   for (let i = 0; i < str.length; i++) {
//     const charCode = str.charCodeAt(i)
//     const keyChar = QR_SECRET.charCodeAt(i % QR_SECRET.length)
//     encoded += String.fromCharCode(charCode ^ keyChar)
//   }
//   return btoa(encoded).replace(/\+/g, '-').replace(/\//g, '_')
// }

// const decodeQRData = (encoded: string): { email: string; password: string; issuedAt: number } | null => {
//   try {
//     const cleaned = encoded.replace(/-/g, '+').replace(/_/g, '/')
//     const decoded = atob(cleaned)
//     let original = ''
//     for (let i = 0; i < decoded.length; i++) {
//       const charCode = decoded.charCodeAt(i)
//       const keyChar = QR_SECRET.charCodeAt(i % QR_SECRET.length)
//       original += String.fromCharCode(charCode ^ keyChar)
//     }
//     const payload = JSON.parse(original)
//     return { email: payload.e, password: payload.p, issuedAt: payload.t }
//   } catch {
//     return null
//   }
// }

// const isQRValid = (issuedAt: number, maxAgeMs = 120000): boolean => {
//   return Date.now() - issuedAt <= maxAgeMs
// }

// // ============================================================
// // 🔧 CATEGORIES DEFINITION
// // ============================================================
// const CATEGORIES: Array<{ id: string; name: string; label: string; emoji: string; color: string }> = [
//   { id: "Medical",        name: "Medical",        label: "Medical",        emoji: "👨🏼‍⚕️", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800" },
//   { id: "sports",         name: "Sports",         label: "Sports",         emoji: "⚽",      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
//   { id: "tech",           name: "Technology",     label: "Technology",     emoji: "👨🏼‍💻",  color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
//   { id: "DigitalMedia",   name: "Digital Media",  label: "Digital Media",  emoji: "🎬",     color: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border-pink-200 dark:border-pink-800" },
//   { id: "announcements",  name: "Announcements",  label: "Announcements",  emoji: "📢",     color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
//   { id: "commerce",       name: "Commerce",       label: "Commerce",       emoji: "💵",     color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800" },
//   { id: "engineering",    name: "Engineering",    label: "Engineering",    emoji: "👷🏼‍♂️",  color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" },
// ]

// // ============================================================
// // 🔧 TYPE DEFINITIONS
// // ============================================================
// interface BackendProfile {
//   email: string
//   full_name: string
//   phone: string
//   password: string
//   faculty: string
//   role: string
//   preferences: string[]
//   student_profile_picture: string
// }

// interface FrontendProfile {
//   name: string
//   email: string
//   phone: string
//   major: string
//   interests: string[]
//   profileImage?: string
//   role: string
// }

// // ============================================================
// // 🔧 COMPONENT: SecureQRCodeDisplay - ALL MESSAGES IN ENGLISH
// // ============================================================
// function SecureQRCodeDisplay({ userEmail, password }: { userEmail: string; password: string }) {
//   const [qrString, setQrString] = useState('')
//   const [countdown, setCountdown] = useState(0)
//   const [isGenerating, setIsGenerating] = useState(false)
//   const [showWarning, setShowWarning] = useState(true)

//   const generateQR = () => {
//     if (!userEmail || !password) return
//     setIsGenerating(true)
//     setTimeout(() => {
//       const encoded = encodeQRData(userEmail, password)
//       setQrString(encoded)
//       setCountdown(120)
//       setIsGenerating(false)
//       setShowWarning(false)
//     }, 50)
//   }

//   useEffect(() => {
//     if (!qrString) return
//     const timer = setInterval(() => {
//       setCountdown(prev => {
//         if (prev <= 1) { clearInterval(timer); setQrString(''); setShowWarning(true); return 0 }
//         return prev - 1
//       })
//     }, 1000)
//     return () => clearInterval(timer)
//   }, [qrString])

//   const formatTime = (s: number) => `0:${s.toString().padStart(2, '0')}`

//   return (
//     <Card className="border-slate-200 shadow-sm mt-6">
//       <CardHeader className="pb-3">
//         <CardTitle className="text-lg flex items-center gap-2">
//           <Camera className="w-5 h-5 text-indigo-600" />
//           Quick Login with QR
//         </CardTitle>
//         <p className="text-xs text-slate-500">Secure • Temporary • Auto-fills login</p>
//       </CardHeader>
//       <CardContent className="space-y-4">
//         {showWarning && !qrString && (
//           <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex gap-2">
//             <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
//             <div>
//               <strong>Security Notice:</strong><br/>
//               • This code contains your login credentials (obfuscated)<br/>
//               • Valid for 2 minutes only and auto-refreshes<br/>
//               • Do not share your screen or leave this code visible to others
//             </div>
//           </div>
//         )}
        
//         {qrString ? (
//           <div className="flex flex-col items-center gap-3">
//             <div className={`p-2 bg-white rounded-xl border-2 transition-all ${isGenerating ? 'border-slate-300 opacity-50' : 'border-indigo-100'}`}>
//               <QRCodeSVG value={qrString} size={180} level="H" bgColor="#fff" fgColor="#1e293b" />
//             </div>
//             <div className="text-center">
//               <p className="text-sm font-medium text-slate-700">
//                 ⏱️ Valid for: <span className="text-indigo-600 font-bold">{formatTime(countdown)}</span>
//               </p>
//               <p className="text-[10px] text-slate-400 mt-1">Auto-refreshes when expired</p>
//             </div>
//             <Button variant="outline" size="sm" onClick={generateQR} disabled={isGenerating}>
//               <RefreshCw className={`w-3 h-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
//               Refresh Code
//             </Button>
//           </div>
//         ) : (
//           <div className="text-center py-4">
//             <p className="text-sm text-slate-500 mb-3">Generate a temporary login code for another device</p>
//             <Button onClick={generateQR} disabled={isGenerating || !userEmail || !password} className="bg-indigo-600 hover:bg-indigo-700">
//               {isGenerating ? (
//                 <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</>
//               ) : (
//                 '🔑 Generate Login Code'
//               )}
//             </Button>
//           </div>
//         )}
//         <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700">
//           🔐 Code is obfuscated and temporary. Do not share or leave visible on screen.
//         </div>
//       </CardContent>
//     </Card>
//   )
// }

// // ============================================================
// // 🔧 MAIN COMPONENT: ProfilePage
// // ============================================================
// export default function ProfilePage() {
//   const router = useRouter()
//   const fileInputRef = useRef<HTMLInputElement>(null)

//   const [profile, setProfile] = useState<FrontendProfile | null>(null)
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState<string | null>(null)

//   // Phone editing
//   const [isEditingPhone, setIsEditingPhone] = useState(false)
//   const [tempPhone, setTempPhone] = useState("")
//   const [isSavingPhone, setIsSavingPhone] = useState(false)
//   const [phoneError, setPhoneError] = useState<string | null>(null)

//   // Name editing
//   const [isEditingName, setIsEditingName] = useState(false)
//   const [tempName, setTempName] = useState("")
//   const [isSavingName, setIsSavingName] = useState(false)
//   const [nameError, setNameError] = useState<string | null>(null)

//   // Password editing
//   const [isEditingPassword, setIsEditingPassword] = useState(false)
//   const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
//   const [isSavingPassword, setIsSavingPassword] = useState(false)
//   const [passwordError, setPasswordError] = useState<string | null>(null)

//   // Preferences editing
//   const [isEditingPreferences, setIsEditingPreferences] = useState(false)
//   const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({})
//   const [initialCategorySelections, setInitialCategorySelections] = useState<Record<string, boolean>>({})
//   const [isSavingPreferences, setIsSavingPreferences] = useState(false)
//   const [preferencesError, setPreferencesError] = useState<string | null>(null)
//   const [preferencesSuccess, setPreferencesSuccess] = useState<string | null>(null)

//   // Image upload state
//   const [isUploadingImage, setIsUploadingImage] = useState(false)
//   const [imageStatus, setImageStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

//   // ============================================================
//   // 🔧 GET USER EMAIL FROM LOCALSTORAGE
//   // ============================================================
//   const getUserEmail = (): string => {
//     if (typeof window === 'undefined') return ''
//     const userStr = localStorage.getItem('user')
//     if (userStr) {
//       try {
//         const user = JSON.parse(userStr)
//         return user?.email || ''
//       } catch { return '' }
//     }
//     return ''
//   }

//   // Get password from sessionStorage (set during login for QR feature)
//   const getUserPassword = (): string => {
//     if (typeof window === 'undefined') return ''
//     return sessionStorage.getItem('temp_qr_pass') || ''
//   }

//   // ============================================================
//   // 🔧 HELPER: Build full profile image URL with ngrok + encode @
//   // ============================================================
//   const buildProfileImageUrl = (rawUrl: string | undefined): string | undefined => {
//     if (!rawUrl || rawUrl === 'null' || rawUrl === 'undefined' || rawUrl === 'None') return undefined
    
//     let fullUrl: string
    
//     if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
//       fullUrl = rawUrl
//     } else if (rawUrl.startsWith('/')) {
//       fullUrl = `${API_BASE_URL}${rawUrl}`
//     } else {
//       fullUrl = `${API_BASE_URL}/static/profiles/${rawUrl}`
//     }
    
//     return fullUrl.replace(/@/g, '%40')
//   }

//   // ============================================================
//   // 🔧 HELPER: Check if user is student
//   // ============================================================
//   const isStudent = (role: string): boolean => {
//     return role.toLowerCase() === 'student'
//   }

//   // ============================================================
//   // 🔧 HELPER: Upload Profile Image
//   // ============================================================
//   const uploadProfileImage = async (file: File, email: string): Promise<string | null> => {
//     try {
//       const formData = new FormData()
//       formData.append('file', file)

//       const response = await axios.post(
//         `${API_BASE_URL}${USER_IMAGES_ENDPOINT}/upload?email=${encodeURIComponent(email)}`,
//         formData,
//         {
//           headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
//           timeout: 30000,
//         }
//       )

//       if (response.data?.image_url) {
//         return buildProfileImageUrl(response.data.image_url) || null
//       }
//       return null

//     } catch (err: any) {
//       console.error('❌ Image upload error:', err?.message)
//       throw new Error(err?.response?.data?.detail || err?.message || "Failed to upload image")
//     }
//   }

//   // ============================================================
//   // 🔧 HELPER: Remove Profile Image
//   // ============================================================
//   const removeProfileImage = async (email: string): Promise<boolean> => {
//     try {
//       await axios.delete(
//         `${API_BASE_URL}${USER_IMAGES_ENDPOINT}/remove?email=${encodeURIComponent(email)}`,
//         {
//           headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
//           timeout: 15000,
//         }
//       )
//       return true
//     } catch (err: any) {
//       console.error('❌ Image remove error:', err?.message)
//       return false
//     }
//   }

//   // ============================================================
//   // 🔧 LOAD PROFILE FROM BACKEND
//   // ============================================================
//   useEffect(() => {
//     const loadProfile = async () => {
//       setLoading(true)
//       setError(null)

//       const email = getUserEmail()
//       if (!email) {
//         setError('Please login first')
//         setLoading(false)
//         router.push('/auth/login')
//         return
//       }

//       try {
//         const profileRes = await axios.get<BackendProfile>(
//           `${API_BASE_URL}${PROFILE_ENDPOINT}`,
//           {
//             params: { email },
//             headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
//           }
//         )

//         const backendData = profileRes.data
//         const profileImageUrl = buildProfileImageUrl(backendData.student_profile_picture)

//         const frontendProfile: FrontendProfile = {
//           name: backendData.full_name || backendData.email?.split('@')[0] || 'User',
//           email: backendData.email,
//           phone: backendData.phone || 'Not set',
//           major: backendData.faculty || 'Not set',
//           interests: (backendData.preferences || []).map((prefName: string) => {
//             const found = CATEGORIES.find(c => c.name === prefName)
//             return found?.id || prefName.toLowerCase().replace(/\s+/g, '')
//           }),
//           profileImage: profileImageUrl,
//           role: backendData.role,
//         }

//         setProfile(frontendProfile)
//         setTempPhone(frontendProfile.phone)
//         setTempName(frontendProfile.name)

//         const initialPrefs: Record<string, boolean> = {}
//         CATEGORIES.forEach(cat => {
//           initialPrefs[cat.id] = frontendProfile.interests.includes(cat.id)
//         })
//         setSelectedCategories(initialPrefs)
//         setInitialCategorySelections({ ...initialPrefs })

//       } catch (err: any) {
//         console.error('❌ Profile Load Error:', err?.response?.data)
//         const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || "Unable to load your profile"
//         setError(errorMessage)
//       } finally {
//         setLoading(false)
//       }
//     }

//     loadProfile()
//   }, [router])

//   // ============================================================
//   // 🔧 UPDATE PROFILE
//   // ============================================================
//   const updateProfile = async (updates: {
//     full_name?: string
//     phone?: string
//     add_categories?: string[]
//     delete_categories?: string[]
//   }) => {
//     const email = getUserEmail()
//     if (!email) throw new Error('User not authenticated')

//     const formData = new URLSearchParams()
//     formData.append('email', email)
    
//     if (updates.full_name !== undefined) formData.append('full_name', updates.full_name)
//     if (updates.phone !== undefined) formData.append('phone', updates.phone)
    
//     if (updates.add_categories?.length) {
//       updates.add_categories.forEach(name => formData.append('category_names', name))
//     }
//     if (updates.delete_categories?.length) {
//       updates.delete_categories.forEach(name => formData.append('deleted_category_names', name))
//     }

//     const response = await axios.put(
//       `${API_BASE_URL}${PROFILE_ENDPOINT}`,
//       formData.toString(),
//       {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//           'Accept': 'application/json',
//           'ngrok-skip-browser-warning': 'true',
//         },
//       }
//     )

//     return response.data
//   }

//   // ============================================================
//   // 🔧 HANDLE SAVE PHONE
//   // ============================================================
//   const handleSavePhone = async () => {
//     setIsSavingPhone(true)
//     setPhoneError(null)
//     try {
//       await updateProfile({ phone: tempPhone })
//       setProfile((prev) => prev ? { ...prev, phone: tempPhone } : prev)
//       setIsEditingPhone(false)
//     } catch (err: any) {
//       setPhoneError(err?.response?.data?.detail || "Failed to update phone")
//     } finally {
//       setIsSavingPhone(false)
//     }
//   }

//   const handleCancelPhone = () => {
//     setTempPhone(profile?.phone || "")
//     setIsEditingPhone(false)
//     setPhoneError(null)
//   }

//   // ============================================================
//   // 🔧 HANDLE SAVE NAME
//   // ============================================================
//   const handleSaveName = async () => {
//     setIsSavingName(true)
//     setNameError(null)
//     try {
//       await updateProfile({ full_name: tempName })
//       setProfile((prev) => prev ? { ...prev, name: tempName } : prev)
//       setIsEditingName(false)
//     } catch (err: any) {
//       setNameError(err?.response?.data?.detail || "Failed to update name")
//     } finally {
//       setIsSavingName(false)
//     }
//   }

//   const handleCancelName = () => {
//     setTempName(profile?.name || "")
//     setIsEditingName(false)
//     setNameError(null)
//   }

//   // ============================================================
//   // 🔧 HANDLE CHANGE PASSWORD
//   // ============================================================
//   const handleChangePassword = async () => {
//     setIsSavingPassword(true)
//     setPasswordError(null)

//     const email = getUserEmail()
//     if (!email) {
//       setPasswordError('Please login first')
//       setIsSavingPassword(false)
//       return
//     }

//     if (passwordData.new !== passwordData.confirm) {
//       setPasswordError('New passwords do not match')
//       setIsSavingPassword(false)
//       return
//     }

//     const formData = new URLSearchParams()
//     formData.append('email', email)
//     formData.append('current_password', passwordData.current)
//     formData.append('new_password', passwordData.new)
//     formData.append('confirm_password', passwordData.confirm)

//     try {
//       await axios.post(
//         `${API_BASE_URL}/api/v1/change-password`,
//         formData.toString(),
//         {
//           headers: {
//             'Content-Type': 'application/x-www-form-urlencoded',
//             'Accept': 'application/json',
//             'ngrok-skip-browser-warning': 'true',
//           },
//         }
//       )
//       setPasswordError(null)
//       setIsEditingPassword(false)
//       setPasswordData({ current: '', new: '', confirm: '' })
//       setTimeout(() => setPasswordError(null), 3000)
//     } catch (err: any) {
//       setPasswordError(err?.response?.data?.detail || "Failed to change password")
//     } finally {
//       setIsSavingPassword(false)
//     }
//   }

//   // ============================================================
//   // 🔧 HANDLE PREFERENCES
//   // ============================================================
//   const toggleCategory = (categoryId: string) => {
//     setSelectedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }))
//     setPreferencesError(null)
//     setPreferencesSuccess(null)
//   }

//   const calculatePreferenceChanges = () => {
//     const toAdd: string[] = []
//     const toDelete: string[] = []
//     CATEGORIES.forEach(cat => {
//       const wasSelected = initialCategorySelections[cat.id]
//       const nowSelected = selectedCategories[cat.id]
//       if (!wasSelected && nowSelected) toAdd.push(cat.name)
//       else if (wasSelected && !nowSelected) toDelete.push(cat.name)
//     })
//     return { toAdd, toDelete }
//   }

//   const handleSavePreferences = async () => {
//     const { toAdd, toDelete } = calculatePreferenceChanges()
//     if (toAdd.length === 0 && toDelete.length === 0) {
//       setPreferencesSuccess('✅ No changes to save')
//       return
//     }

//     setIsSavingPreferences(true)
//     setPreferencesError(null)
//     setPreferencesSuccess(null)

//     try {
//       await updateProfile({ add_categories: toAdd, delete_categories: toDelete })
//       const newInterests = Object.keys(selectedCategories).filter(key => selectedCategories[key])
//       setProfile(prev => prev ? { ...prev, interests: newInterests } : prev)
//       setInitialCategorySelections({ ...selectedCategories })
//       setPreferencesSuccess('✅ Preferences updated successfully!')
//       setIsEditingPreferences(false)
//     } catch (err: any) {
//       setPreferencesError(err?.response?.data?.detail || "Failed to save preferences")
//     } finally {
//       setIsSavingPreferences(false)
//     }
//   }

//   const handleCancelPreferences = () => {
//     setSelectedCategories({ ...initialCategorySelections })
//     setPreferencesError(null)
//     setPreferencesSuccess(null)
//     setIsEditingPreferences(false)
//   }

//   // ============================================================
//   // 🔧 HANDLE IMAGE UPLOAD
//   // ============================================================
//   const handleImageClick = () => {
//     fileInputRef.current?.click()
//   }

//   const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (!file) return

//     setImageStatus(null)

//     const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
//     if (!allowedTypes.includes(file.type)) {
//       setImageStatus({ type: 'error', message: "Please choose a JPG, PNG, or WEBP image." })
//       return
//     }
//     if (file.size > 5 * 1024 * 1024) {
//       setImageStatus({ type: 'error', message: "Image must be 5MB or less." })
//       return
//     }

//     setIsUploadingImage(true)

//     try {
//       const email = getUserEmail()
//       if (!email) throw new Error('Not authenticated')

//       const imageUrl = await uploadProfileImage(file, email)
      
//       if (imageUrl) {
//         setProfile(prev => prev ? { ...prev, profileImage: imageUrl } : prev)
//         setImageStatus({ type: 'success', message: '✅ Photo updated successfully!' })
//       } else {
//         throw new Error('No image URL returned from server')
//       }
//     } catch (err: any) {
//       setImageStatus({ type: 'error', message: err?.message || "Failed to upload image" })
//     } finally {
//       setIsUploadingImage(false)
//       if (fileInputRef.current) fileInputRef.current.value = ''
//       setTimeout(() => setImageStatus(null), 4000)
//     }
//   }

//   // ============================================================
//   // 🔧 HANDLE REMOVE IMAGE
//   // ============================================================
//   const handleRemoveImage = async () => {
//     setImageStatus({ type: 'success', message: '🔄 Removing photo...' })
    
//     try {
//       const email = getUserEmail()
//       if (!email) throw new Error('Not authenticated')
//       const success = await removeProfileImage(email)
      
//       if (success) {
//         setProfile(prev => prev ? { ...prev, profileImage: undefined } : prev)
//         setImageStatus({ type: 'success', message: '✅ Photo removed successfully!' })
//       } else {
//         throw new Error('Failed to remove image')
//       }
//     } catch (err: any) {
//       setImageStatus({ type: 'error', message: "Failed to remove photo" })
//     } finally {
//       setTimeout(() => setImageStatus(null), 4000)
//     }
//   }

//   // ============================================================
//   // 🔧 HANDLE LOGOUT
//   // ============================================================
//   const handleLogout = async () => {
//     localStorage.removeItem('token')
//     localStorage.removeItem('user')
//     sessionStorage.removeItem('temp_qr_pass') // Clear QR password on logout
//     router.push('/auth/login')
//   }

//   // ============================================================
//   // 🔧 RENDER STATES
//   // ============================================================
//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-white">
//         <div className="text-center space-y-4">
//           <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
//           <p className="text-lg font-medium text-slate-600">Loading your profile...</p>
//         </div>
//       </div>
//     )
//   }

//   if (error || !profile) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-white">
//         <div className="text-center space-y-4">
//           <p className="text-red-500 text-lg">{error || "Profile not found."}</p>
//           <div className="flex gap-3 justify-center">
//             <Button onClick={() => router.refresh()}>Retry</Button>
//             <Button variant="outline" onClick={() => router.push('/auth/login')}>Login</Button>
//           </div>
//         </div>
//       </div>
//     )
//   }

//   const hideStudentSections = !isStudent(profile.role)
//   const userPassword = getUserPassword()

//   // ============================================================
//   // 🔧 MAIN UI
//   // ============================================================
//   return (
//     <div className="min-h-screen bg-white pb-20">
//       <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12">

//         {/* ✅ Profile Header */}
//         <Card className="border border-slate-200 shadow-sm mb-8">
//           <CardContent className="px-6 py-8">
//             <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              
//               {/* ✅ Avatar with Image Upload */}
//               <div className="relative">
//                 <div className="h-32 w-32 sm:h-36 sm:w-36 rounded-full border-4 border-white shadow-lg bg-slate-100 overflow-hidden">
//                   {profile.profileImage ? (
//                     <img 
//                       src={profile.profileImage}
//                       alt={profile.name} 
//                       className="w-full h-full object-cover"
//                       onError={(e) => {
//                         e.currentTarget.style.display = 'none'
//                         const parent = e.currentTarget.parentElement
//                         if (parent) {
//                           parent.innerText = profile.name.slice(0, 2).toUpperCase()
//                           parent.classList.add('text-4xl', 'bg-gradient-to-br', 'from-indigo-400', 'to-purple-500', 'text-white', 'flex', 'items-center', 'justify-center')
//                         }
//                       }}
//                     />
//                   ) : (
//                     <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-indigo-400 to-purple-500 text-white">
//                       {profile.name.slice(0, 2).toUpperCase()}
//                     </div>
//                   )}
//                 </div>
                
//                 <input
//                   ref={fileInputRef}
//                   type="file"
//                   accept="image/jpeg,image/jpg,image/png,image/webp"
//                   className="hidden"
//                   onChange={handleImageChange}
//                 />
                
//                 <Button
//                   size="icon"
//                   variant="secondary"
//                   className="absolute bottom-1 right-1 rounded-full shadow-md h-9 w-9 border-2 border-white"
//                   onClick={handleImageClick}
//                   disabled={isUploadingImage}
//                   title={isUploadingImage ? "Uploading..." : "Change photo"}
//                 >
//                   {isUploadingImage ? (
//                     <Loader2 className="h-4 w-4 animate-spin" />
//                   ) : (
//                     <Camera className="h-4 w-4" />
//                   )}
//                 </Button>

//                 {imageStatus && (
//                   <div className={`absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium shadow border ${
//                     imageStatus.type === 'success' 
//                       ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
//                       : 'bg-red-50 border-red-200 text-red-700'
//                   }`}>
//                     {imageStatus.message}
//                   </div>
//                 )}
//               </div>

//               {/* ✅ Name & Info */}
//               <div className="text-center sm:text-left space-y-1 flex-1">
//                 {isEditingName ? (
//                   <div className="flex flex-col sm:flex-row items-center gap-2">
//                     <Input
//                       value={tempName}
//                       onChange={(e) => setTempName(e.target.value)}
//                       className="text-xl font-bold text-center sm:text-left h-10"
//                       autoFocus
//                     />
//                     <div className="flex gap-1">
//                       <Button size="sm" onClick={handleSaveName} disabled={isSavingName}>
//                         {isSavingName ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
//                       </Button>
//                       <Button size="sm" variant="outline" onClick={handleCancelName} disabled={isSavingName}>
//                         <X className="h-3 w-3" />
//                       </Button>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="flex items-center justify-center sm:justify-start gap-1">
//                     <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">{profile.name}</h1>
//                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
//                       setTempName(profile.name)
//                       setIsEditingName(true)
//                     }}>
//                       <Pencil className="h-4 w-4" />
//                     </Button>
//                   </div>
//                 )}
//                 {nameError && <p className="text-red-500 text-sm">{nameError}</p>}
                
//                 <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500">
//                   <GraduationCap className="h-4 w-4" />
//                   <span className="text-sm">{profile.major !== "Not set" ? profile.major : "Set your faculty"}</span>
//                 </div>
//               </div>

//               {/* ✅ Actions */}
//               <div className="flex gap-2 mt-2 sm:mt-0">
//                 <Button variant="destructive" onClick={handleLogout} className="px-5 py-2 text-sm font-medium">
//                   <LogOut className="mr-2 h-4 w-4" />
//                   Log Out
//                 </Button>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* ✅ Main Content Grid */}
//         <div className={`grid gap-6 ${hideStudentSections ? 'grid-cols-1 lg:grid-cols-2 max-w-4xl mx-auto' : 'grid-cols-1 lg:grid-cols-3'}`}>

//           {/* Left - Main Info */}
//           <div className={`${hideStudentSections ? 'space-y-5' : 'lg:col-span-2 space-y-5'}`}>

//             {/* Email */}
//             <Card className="border-slate-200 shadow-sm">
//               <CardHeader className="flex flex-row items-center gap-3 pb-3">
//                 <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
//                   <Mail className="h-5 w-5 text-indigo-600" />
//                 </div>
//                 <CardTitle className="text-lg">Email Address</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p className="text-lg font-medium text-slate-900">{profile.email}</p>
//                 <p className="text-sm text-slate-500 mt-1">Email cannot be changed</p>
//               </CardContent>
//             </Card>

//             {/* Phone */}
//             <Card className="border-slate-200 shadow-sm">
//               <CardHeader className="flex flex-row items-center gap-3 pb-3">
//                 <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
//                   <Phone className="h-5 w-5 text-emerald-600" />
//                 </div>
//                 <CardTitle className="text-lg">Phone Number</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 {isEditingPhone ? (
//                   <div className="flex flex-col sm:flex-row gap-2">
//                     <Input
//                       value={tempPhone}
//                       onChange={(e) => setTempPhone(e.target.value)}
//                       className="text-lg"
//                       autoFocus
//                       placeholder="Enter phone number"
//                     />
//                     <div className="flex gap-2">
//                       <Button size="sm" onClick={handleSavePhone} disabled={isSavingPhone}>
//                         {isSavingPhone ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
//                         Save
//                       </Button>
//                       <Button size="sm" variant="outline" onClick={handleCancelPhone} disabled={isSavingPhone}>
//                         <X className="h-3 w-3" />
//                       </Button>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="flex items-center justify-between">
//                     <p className="text-xl font-medium text-slate-900">{profile.phone}</p>
//                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
//                       setTempPhone(profile.phone)
//                       setIsEditingPhone(true)
//                     }}>
//                       <Pencil className="h-4 w-4" />
//                     </Button>
//                   </div>
//                 )}
//                 {phoneError && <p className="text-red-500 text-sm mt-2">{phoneError}</p>}
//               </CardContent>
//             </Card>

//             {/* Password */}
//             <Card className="border-slate-200 shadow-sm">
//               <CardHeader className="flex flex-row items-center gap-3 pb-3">
//                 <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
//                   <Lock className="h-5 w-5 text-rose-600" />
//                 </div>
//                 <CardTitle className="text-lg">Password</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 {isEditingPassword ? (
//                   <div className="space-y-3">
//                     <div>
//                       <label className="text-sm font-medium mb-1 block text-slate-700">Current Password</label>
//                       <Input type="password" value={passwordData.current} onChange={(e) => setPasswordData(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" />
//                     </div>
//                     <div>
//                       <label className="text-sm font-medium mb-1 block text-slate-700">New Password</label>
//                       <Input type="password" value={passwordData.new} onChange={(e) => setPasswordData(p => ({ ...p, new: e.target.value }))} placeholder="Enter new password" />
//                     </div>
//                     <div>
//                       <label className="text-sm font-medium mb-1 block text-slate-700">Confirm New Password</label>
//                       <Input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirm new password" />
//                     </div>
//                     {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
//                     <div className="flex gap-2">
//                       <Button size="sm" onClick={handleChangePassword} disabled={isSavingPassword}>
//                         {isSavingPassword ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
//                         Update
//                       </Button>
//                       <Button size="sm" variant="outline" onClick={() => {
//                         setIsEditingPassword(false)
//                         setPasswordData({ current: '', new: '', confirm: '' })
//                         setPasswordError(null)
//                       }}>Cancel</Button>
//                     </div>
//                   </div>
//                 ) : (
//                   <>
//                     <p className="text-xl tracking-widest text-slate-400 mb-3">••••••••••••</p>
//                     <Button variant="outline" size="sm" onClick={() => setIsEditingPassword(true)}>
//                       Change Password
//                     </Button>
//                   </>
//                 )}
//               </CardContent>
//             </Card>

//           </div>

//           {/* Right - Sidebar */}
//           <div className="space-y-5">

//             {/* Major - ONLY FOR STUDENTS */}
//             {!hideStudentSections && (
//               <Card className="border-slate-200 shadow-sm">
//                 <CardHeader className="flex flex-row items-center gap-3 pb-3">
//                   <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
//                     <GraduationCap className="h-5 w-5 text-amber-600" />
//                   </div>
//                   <CardTitle className="text-lg">Faculty</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <p className="text-xl font-medium text-slate-900">{profile.major}</p>
//                   {profile.major === "Not set" && (
//                     <p className="text-sm text-slate-500 mt-2">Contact admin to update your faculty</p>
//                   )}
//                 </CardContent>
//               </Card>
//             )}

//             {/* Preferences - ONLY FOR STUDENTS */}
//             {!hideStudentSections && (
//               <Card className="border-slate-200 shadow-sm">
//                 <CardHeader className="flex flex-row items-center justify-between pb-3">
//                   <div className="flex items-center gap-3">
//                     <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
//                       <Newspaper className="h-5 w-5 text-purple-600" />
//                     </div>
//                     <CardTitle className="text-lg">News Preferences</CardTitle>
//                   </div>
//                   {!isEditingPreferences && (
//                     <Button variant="outline" size="sm" className="h-8" onClick={() => {
//                       setIsEditingPreferences(true)
//                       setPreferencesError(null)
//                       setPreferencesSuccess(null)
//                     }}>
//                       <Pencil className="h-3 w-3 mr-1" /> Edit
//                     </Button>
//                   )}
//                 </CardHeader>
                
//                 <CardContent>
//                   {isEditingPreferences ? (
//                     <div className="space-y-3">
//                       {preferencesSuccess && (
//                         <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{preferencesSuccess}</div>
//                       )}
//                       {preferencesError && (
//                         <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{preferencesError}</div>
//                       )}

//                       <div className="grid grid-cols-2 gap-2">
//                         {CATEGORIES.map((category) => {
//                           const isSelected = selectedCategories[category.id] ?? false
//                           return (
//                             <div
//                               key={category.id}
//                               onClick={() => toggleCategory(category.id)}
//                               className={`group relative cursor-pointer overflow-hidden rounded-lg border-2 p-2 text-center transition-all
//                                 ${isSelected
//                                   ? `border-transparent bg-gradient-to-br from-indigo-500 to-violet-600 text-white`
//                                   : `border-slate-200 hover:border-indigo-400 bg-white`
//                                 }`}
//                             >
//                               {isSelected && (
//                                 <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded bg-white shadow">
//                                   <Check className="h-2.5 w-2.5 text-indigo-600" strokeWidth={3} />
//                                 </div>
//                               )}
//                               <div className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded text-base transition-all
//                                 ${isSelected ? "bg-white/20" : "bg-slate-100"}`}>
//                                 {category.emoji}
//                               </div>
//                               <p className={`text-xs font-medium ${isSelected ? "text-white" : "text-slate-700"}`}>{category.label}</p>
//                             </div>
//                           )
//                         })}
//                       </div>

//                       <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
//                         <Sparkles className="h-3 w-3 text-indigo-500" />
//                         <span>{Object.values(selectedCategories).filter(Boolean).length} topics selected</span>
//                       </div>

//                       <div className="flex gap-2 pt-1">
//                         <Button variant="outline" size="sm" className="flex-1 h-8" onClick={handleCancelPreferences} disabled={isSavingPreferences}>
//                           <X className="h-3 w-3 mr-1" /> Cancel
//                         </Button>
//                         <Button size="sm" className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700" onClick={handleSavePreferences} disabled={isSavingPreferences}>
//                           {isSavingPreferences ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
//                           Save
//                         </Button>
//                       </div>
//                     </div>
//                   ) : (
//                     <>
//                       {profile.interests.length === 0 ? (
//                         <p className="text-slate-500 italic py-3 text-sm">No interests selected yet — tap Edit to personalize!</p>
//                       ) : (
//                         <div className="flex flex-wrap gap-1.5 pt-1">
//                           {profile.interests.map((slug) => {
//                             const cat = CATEGORIES.find(c => c.id === slug)
//                             const label = cat?.label || slug
//                             const emoji = cat?.emoji || '✨'
//                             return (
//                               <Badge key={slug} variant="secondary" className="px-2.5 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 border-slate-200">
//                                 <span className="mr-1">{emoji}</span>{label}
//                               </Badge>
//                             )
//                           })}
//                         </div>
//                       )}
//                     </>
//                   )}
//                 </CardContent>
//               </Card>
//             )}

//             {/* Account Info - FOR MANAGERS / MEDIA ADVISERS */}
//             {hideStudentSections && (
//               <Card className="border-slate-200 shadow-sm">
//                 <CardHeader className="flex flex-row items-center gap-3 pb-3">
//                   <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
//                     <User className="h-5 w-5 text-sky-600" />
//                   </div>
//                   <CardTitle className="text-lg">Account Info</CardTitle>
//                 </CardHeader>
//                 <CardContent className="space-y-3">
//                   <div>
//                     <p className="text-sm text-slate-500 mb-1">Role</p>
//                     <p className="text-lg font-semibold text-slate-900 capitalize">{profile.role.replace('_', ' ')}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm text-slate-500 mb-1">Access Type</p>
//                     <p className="text-sm font-medium text-slate-700">Authorized Platform User</p>
//                   </div>
//                 </CardContent>
//               </Card>
//             )}

//             {/* ✅ Quick Login QR Code - ENGLISH MESSAGES */}
//             <SecureQRCodeDisplay userEmail={profile.email} password={userPassword} />

//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Pencil, Save, X, Mail, Lock, Phone, GraduationCap, Newspaper,
  LogOut, Camera, Loader2, Check, Sparkles, Trash2, User
} from "lucide-react"
import Link from 'next/link'
import axios from 'axios'

// ============================================================
// 🔧 API CONFIGURATION
// ============================================================
const API_BASE_URL = 'https://rookier-ruffly-maxie.ngrok-free.dev'
const PROFILE_ENDPOINT = '/api/v1/profile'
const USER_IMAGES_ENDPOINT = '/api/v1/users/images'

// ============================================================
// 🔧 CATEGORIES DEFINITION
// ============================================================
const CATEGORIES: Array<{ id: string; name: string; label: string; emoji: string; color: string }> = [
  { id: "Medical",        name: "Medical",        label: "Medical",        emoji: "👨🏼‍⚕️", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800" },
  { id: "sports",         name: "Sports",         label: "Sports",         emoji: "⚽",      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  { id: "tech",           name: "Technology",     label: "Technology",     emoji: "👨🏼‍💻",  color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  { id: "DigitalMedia",   name: "Digital Media",  label: "Digital Media",  emoji: "🎬",     color: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border-pink-200 dark:border-pink-800" },
  { id: "announcements",  name: "Announcements",  label: "Announcements",  emoji: "📢",     color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  { id: "commerce",       name: "Commerce",       label: "Commerce",       emoji: "💵",     color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800" },
  { id: "engineering",    name: "Engineering",    label: "Engineering",    emoji: "👷🏼‍♂️",  color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" },
]

// ============================================================
// 🔧 TYPE DEFINITIONS
// ============================================================
interface BackendProfile {
  email: string
  full_name: string
  phone: string
  password: string
  faculty: string
  role: string
  preferences: string[]
  student_profile_picture: string
}

interface FrontendProfile {
  name: string
  email: string
  phone: string
  major: string
  interests: string[]
  profileImage?: string
  role: string
}

// ============================================================
// 🔧 MAIN COMPONENT: ProfilePage - FIXED IMAGE URL FOR NGROK
// ============================================================
export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<FrontendProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Phone editing
  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [tempPhone, setTempPhone] = useState("")
  const [isSavingPhone, setIsSavingPhone] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // Name editing
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState("")
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  // Password editing
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Preferences editing
  const [isEditingPreferences, setIsEditingPreferences] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({})
  const [initialCategorySelections, setInitialCategorySelections] = useState<Record<string, boolean>>({})
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [preferencesError, setPreferencesError] = useState<string | null>(null)
  const [preferencesSuccess, setPreferencesSuccess] = useState<string | null>(null)

  // Image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageStatus, setImageStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ============================================================
  // 🔧 GET USER EMAIL FROM LOCALSTORAGE
  // ============================================================
  const getUserEmail = (): string => {
    if (typeof window === 'undefined') return ''
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        return user?.email || ''
      } catch { return '' }
    }
    return ''
  }
  

  // ============================================================
  // 🔧 HELPER: Build full profile image URL - ✅ FIXED FOR NGROK
  // ============================================================
  const buildProfileImageUrl = (rawUrl: string | undefined): string | undefined => {
    // ✅ Handle empty/null/undefined values
    if (!rawUrl || rawUrl === 'null' || rawUrl === 'undefined' || rawUrl === 'None' || rawUrl.trim() === '') {
      return undefined
    }
    
    let fullUrl: string
    
    // ✅ Case 1: Already a full URL (http or https)
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      fullUrl = rawUrl
    } 
    // ✅ Case 2: Relative path starting with /
    else if (rawUrl.startsWith('/')) {
      fullUrl = `${API_BASE_URL}${rawUrl}`
    } 
    // ✅ Case 3: Just a filename (assume it's in /static/profiles/)
    else {
      fullUrl = `${API_BASE_URL}/static/profiles/${rawUrl}`
    }
    
    // ✅ CRITICAL: Encode @ symbol to %40 for ngrok compatibility (ERR_NGROK_6024)
    // This fixes: user@example.com → user%40example.com
    fullUrl = fullUrl.replace(/@/g, '%40')
    
    // ✅ Force HTTPS for ngrok URLs (camera and images require secure context)
    if (fullUrl.startsWith('http://') && fullUrl.includes('ngrok')) {
      fullUrl = fullUrl.replace('http://', 'https://')
    }
    
    // ✅ Add cache-busting parameter to force browser to reload new images
    // Format: ?t=1781442033867 (dynamic timestamp)
    const separator = fullUrl.includes('?') ? '&' : '?'
    fullUrl = `${fullUrl}${separator}t=${Date.now()}`
    
    // ✅ Debug log (remove in production if needed)
    console.log('🖼️ Built Profile Image URL:', fullUrl)
    
    return fullUrl
  }

  // ============================================================
  // 🔧 HELPER: Check if user is student
  // ============================================================
  const isStudent = (role: string): boolean => {
    return role.toLowerCase() === 'student'
  }

  // ============================================================
  // 🔧 HELPER: Upload Profile Image
  // ============================================================
  const uploadProfileImage = async (file: File, email: string): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(
        `${API_BASE_URL}${USER_IMAGES_ENDPOINT}/upload?email=${encodeURIComponent(email)}`,
        formData,
        {
          headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          timeout: 30000,
        }
      )

      console.log('📤 Upload Response:', response.data)
      
      // ✅ Check different possible response formats from backend
      const imageUrl = response.data?.image_url || response.data?.url || response.data?.file_url || response.data?.path
      
      if (imageUrl) {
        // ✅ Build the full ngrok-compatible URL
        const fullUrl = buildProfileImageUrl(imageUrl)
        console.log('✅ Final Image URL:', fullUrl)
        return fullUrl || null
      }
      
      console.warn('⚠️ No image_url found in backend response')
      return null

    } catch (err: any) {
      console.error('❌ Image upload error:', err?.response?.data || err?.message)
      throw new Error(err?.response?.data?.detail || err?.message || "Failed to upload image")
    }
  }

  // ============================================================
  // 🔧 HELPER: Remove Profile Image
  // ============================================================
  const removeProfileImage = async (email: string): Promise<boolean> => {
    try {
      await axios.delete(
        `${API_BASE_URL}${USER_IMAGES_ENDPOINT}/remove?email=${encodeURIComponent(email)}`,
        {
          headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          timeout: 15000,
        }
      )
      return true
    } catch (err: any) {
      console.error('❌ Image remove error:', err?.message)
      return false
    }
  }

  // ============================================================
  // 🔧 LOAD PROFILE FROM BACKEND
  // ============================================================
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      setError(null)

      const email = getUserEmail()
      if (!email) {
        setError('Please login first')
        setLoading(false)
        router.push('/auth/login')
        return
      }

      try {
        const profileRes = await axios.get<BackendProfile>(
          `${API_BASE_URL}${PROFILE_ENDPOINT}`,
          {
            params: { email },
            headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          }
        )

        const backendData = profileRes.data
        
        // ✅ Build the ngrok-compatible image URL using our fixed helper
        const profileImageUrl = buildProfileImageUrl(backendData.student_profile_picture)

        const frontendProfile: FrontendProfile = {
          name: backendData.full_name || backendData.email?.split('@')[0] || 'User',
          email: backendData.email,
          phone: backendData.phone || 'Not set',
          major: backendData.faculty || 'Not set',
          interests: (backendData.preferences || []).map((prefName: string) => {
            const found = CATEGORIES.find(c => c.name === prefName)
            return found?.id || prefName.toLowerCase().replace(/\s+/g, '')
          }),
          profileImage: profileImageUrl,
          role: backendData.role,
        }

        setProfile(frontendProfile)
        setTempPhone(frontendProfile.phone)
        setTempName(frontendProfile.name)

        const initialPrefs: Record<string, boolean> = {}
        CATEGORIES.forEach(cat => {
          initialPrefs[cat.id] = frontendProfile.interests.includes(cat.id)
        })
        setSelectedCategories(initialPrefs)
        setInitialCategorySelections({ ...initialPrefs })

      } catch (err: any) {
        console.error('❌ Profile Load Error:', err?.response?.data)
        const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || "Unable to load your profile"
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  // ============================================================
  // 🔧 UPDATE PROFILE
  // ============================================================
  const updateProfile = async (updates: {
    full_name?: string
    phone?: string
    add_categories?: string[]
    delete_categories?: string[]
  }) => {
    const email = getUserEmail()
    if (!email) throw new Error('User not authenticated')

    const formData = new URLSearchParams()
    formData.append('email', email)
    
    if (updates.full_name !== undefined) formData.append('full_name', updates.full_name)
    if (updates.phone !== undefined) formData.append('phone', updates.phone)
    
    if (updates.add_categories?.length) {
      updates.add_categories.forEach(name => formData.append('category_names', name))
    }
    if (updates.delete_categories?.length) {
      updates.delete_categories.forEach(name => formData.append('deleted_category_names', name))
    }

    const response = await axios.put(
      `${API_BASE_URL}${PROFILE_ENDPOINT}`,
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      }
    )

    return response.data
  }

  // ============================================================
  // 🔧 HANDLE SAVE PHONE
  // ============================================================
  const handleSavePhone = async () => {
    setIsSavingPhone(true)
    setPhoneError(null)
    try {
      await updateProfile({ phone: tempPhone })
      setProfile((prev) => prev ? { ...prev, phone: tempPhone } : prev)
      setIsEditingPhone(false)
    } catch (err: any) {
      setPhoneError(err?.response?.data?.detail || "Failed to update phone")
    } finally {
      setIsSavingPhone(false)
    }
  }

  const handleCancelPhone = () => {
    setTempPhone(profile?.phone || "")
    setIsEditingPhone(false)
    setPhoneError(null)
  }

  // ============================================================
  // 🔧 HANDLE SAVE NAME
  // ============================================================
  const handleSaveName = async () => {
    setIsSavingName(true)
    setNameError(null)
    try {
      await updateProfile({ full_name: tempName })
      setProfile((prev) => prev ? { ...prev, name: tempName } : prev)
      setIsEditingName(false)
    } catch (err: any) {
      setNameError(err?.response?.data?.detail || "Failed to update name")
    } finally {
      setIsSavingName(false)
    }
  }

  const handleCancelName = () => {
    setTempName(profile?.name || "")
    setIsEditingName(false)
    setNameError(null)
  }

  // ============================================================
  // 🔧 HANDLE CHANGE PASSWORD
  // ============================================================
  const handleChangePassword = async () => {
    setIsSavingPassword(true)
    setPasswordError(null)

    const email = getUserEmail()
    if (!email) {
      setPasswordError('Please login first')
      setIsSavingPassword(false)
      return
    }

    if (passwordData.new !== passwordData.confirm) {
      setPasswordError('New passwords do not match')
      setIsSavingPassword(false)
      return
    }

    const formData = new URLSearchParams()
    formData.append('email', email)
    formData.append('current_password', passwordData.current)
    formData.append('new_password', passwordData.new)
    formData.append('confirm_password', passwordData.confirm)

    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/change-password`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        }
      )
      setPasswordError(null)
      setIsEditingPassword(false)
      setPasswordData({ current: '', new: '', confirm: '' })
      setTimeout(() => setPasswordError(null), 3000)
    } catch (err: any) {
      setPasswordError(err?.response?.data?.detail || "Failed to change password")
    } finally {
      setIsSavingPassword(false)
    }
  }

  // ============================================================
  // 🔧 HANDLE PREFERENCES
  // ============================================================
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }))
    setPreferencesError(null)
    setPreferencesSuccess(null)
  }

  const calculatePreferenceChanges = () => {
    const toAdd: string[] = []
    const toDelete: string[] = []
    CATEGORIES.forEach(cat => {
      const wasSelected = initialCategorySelections[cat.id]
      const nowSelected = selectedCategories[cat.id]
      if (!wasSelected && nowSelected) toAdd.push(cat.name)
      else if (wasSelected && !nowSelected) toDelete.push(cat.name)
    })
    return { toAdd, toDelete }
  }

  const handleSavePreferences = async () => {
    const { toAdd, toDelete } = calculatePreferenceChanges()
    if (toAdd.length === 0 && toDelete.length === 0) {
      setPreferencesSuccess('✅ No changes to save')
      return
    }

    setIsSavingPreferences(true)
    setPreferencesError(null)
    setPreferencesSuccess(null)

    try {
      await updateProfile({ add_categories: toAdd, delete_categories: toDelete })
      const newInterests = Object.keys(selectedCategories).filter(key => selectedCategories[key])
      setProfile(prev => prev ? { ...prev, interests: newInterests } : prev)
      setInitialCategorySelections({ ...selectedCategories })
      setPreferencesSuccess('✅ Preferences updated successfully!')
      setIsEditingPreferences(false)
    } catch (err: any) {
      setPreferencesError(err?.response?.data?.detail || "Failed to save preferences")
    } finally {
      setIsSavingPreferences(false)
    }
  }

  const handleCancelPreferences = () => {
    setSelectedCategories({ ...initialCategorySelections })
    setPreferencesError(null)
    setPreferencesSuccess(null)
    setIsEditingPreferences(false)
  }

  // ============================================================
  // 🔧 HANDLE IMAGE UPLOAD
  // ============================================================
  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageStatus(null)

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setImageStatus({ type: 'error', message: "Please choose a JPG, PNG, or WEBP image." })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageStatus({ type: 'error', message: "Image must be 5MB or less." })
      return
    }

    setIsUploadingImage(true)

    try {
      const email = getUserEmail()
      if (!email) throw new Error('Not authenticated')

      const imageUrl = await uploadProfileImage(file, email)
      
      if (imageUrl) {
        setProfile(prev => prev ? { ...prev, profileImage: imageUrl } : prev)
        setImageStatus({ type: 'success', message: '✅ Photo updated successfully!' })
      } else {
        throw new Error('No image URL returned from server')
      }
    } catch (err: any) {
      setImageStatus({ type: 'error', message: err?.message || "Failed to upload image" })
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => setImageStatus(null), 4000)
    }
  }

  // ============================================================
  // 🔧 HANDLE REMOVE IMAGE
  // ============================================================
  const handleRemoveImage = async () => {
    setImageStatus({ type: 'success', message: '🔄 Removing photo...' })
    
    try {
      const email = getUserEmail()
      if (!email) throw new Error('Not authenticated')
      const success = await removeProfileImage(email)
      
      if (success) {
        setProfile(prev => prev ? { ...prev, profileImage: undefined } : prev)
        setImageStatus({ type: 'success', message: '✅ Photo removed successfully!' })
      } else {
        throw new Error('Failed to remove image')
      }
    } catch (err: any) {
      setImageStatus({ type: 'error', message: "Failed to remove photo" })
    } finally {
      setTimeout(() => setImageStatus(null), 4000)
    }
  }

  // ============================================================
  // 🔧 HANDLE LOGOUT
  // ============================================================
const handleLogout = async () => {
  const email = getUserEmail();
  
  try {
    // 1. بلغ الباك إن الطالب خارج
    if (email) {
      await axios.post(
        `${API_BASE_URL}/monitor/logout`,
        { email: email.trim().toLowerCase() },
        { headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, timeout: 2000 }
      ).catch(() => {}); // Silent fail OK
    }
  } finally {
    // 2. تنظيف محلي
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    // 3. إعادة توجيه قوية
    window.location.replace('/auth/login');
  }
};

  // ============================================================
  // 🔧 RENDER STATES
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
          <p className="text-lg font-medium text-slate-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <p className="text-red-500 text-lg">{error || "Profile not found."}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.refresh()}>Retry</Button>
            <Button variant="outline" onClick={() => router.push('/auth/login')}>Login</Button>
          </div>
        </div>
      </div>
    )
  }

  const hideStudentSections = !isStudent(profile.role)

  // ============================================================
  // 🔧 MAIN UI - CLEAN VERSION WITH FIXED IMAGE URL
  // ============================================================
  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12">

        {/* ✅ Profile Header */}
        <Card className="border border-slate-200 shadow-sm mb-8">
          <CardContent className="px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              
              {/* ✅ Avatar with Image Upload - FIXED URL HANDLING */}
              <div className="relative">
                <div className="h-32 w-32 sm:h-36 sm:w-36 rounded-full border-4 border-white shadow-lg bg-slate-100 overflow-hidden">
                  {profile.profileImage ? (
                    <img 
                      src={profile.profileImage}
                      alt={profile.name} 
                      className="w-full h-full object-cover"
                      // ✅ Fallback if image fails to load
                      onError={(e) => {
                        console.error('❌ Failed to load profile image:', profile.profileImage)
                        e.currentTarget.style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          parent.innerText = profile.name.slice(0, 2).toUpperCase()
                          parent.classList.add('text-4xl', 'bg-gradient-to-br', 'from-indigo-400', 'to-purple-500', 'text-white', 'flex', 'items-center', 'justify-center', 'font-bold')
                        }
                      }}
                      onLoad={() => console.log('✅ Profile image loaded successfully')}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold">
                      {profile.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
                
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-1 right-1 rounded-full shadow-md h-9 w-9 border-2 border-white"
                  onClick={handleImageClick}
                  disabled={isUploadingImage}
                  title={isUploadingImage ? "Uploading..." : "Change photo"}
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>

                {imageStatus && (
                  <div className={`absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium shadow border ${
                    imageStatus.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {imageStatus.message}
                  </div>
                )}
              </div>

              {/* ✅ Name & Info */}
              <div className="text-center sm:text-left space-y-1 flex-1">
                {isEditingName ? (
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Input
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="text-xl font-bold text-center sm:text-left h-10"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={handleSaveName} disabled={isSavingName}>
                        {isSavingName ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelName} disabled={isSavingName}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center sm:justify-start gap-1">
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">{profile.name}</h1>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setTempName(profile.name)
                      setIsEditingName(true)
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {nameError && <p className="text-red-500 text-sm">{nameError}</p>}
                
                <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500">
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-sm">{profile.major !== "Not set" ? profile.major : "Set your faculty"}</span>
                </div>
              </div>

              {/* ✅ Actions */}
              <div className="flex gap-2 mt-2 sm:mt-0">
                <Button variant="destructive" onClick={handleLogout} className="px-5 py-2 text-sm font-medium">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ Main Content Grid */}
        <div className={`grid gap-6 ${hideStudentSections ? 'grid-cols-1 lg:grid-cols-2 max-w-4xl mx-auto' : 'grid-cols-1 lg:grid-cols-3'}`}>

          {/* Left - Main Info */}
          <div className={`${hideStudentSections ? 'space-y-5' : 'lg:col-span-2 space-y-5'}`}>

            {/* Email */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-indigo-600" />
                </div>
                <CardTitle className="text-lg">Email Address</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-slate-900">{profile.email}</p>
                <p className="text-sm text-slate-500 mt-1">Email cannot be changed</p>
              </CardContent>
            </Card>

            {/* Phone */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-emerald-600" />
                </div>
                <CardTitle className="text-lg">Phone Number</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditingPhone ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={tempPhone}
                      onChange={(e) => setTempPhone(e.target.value)}
                      className="text-lg"
                      autoFocus
                      placeholder="Enter phone number"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSavePhone} disabled={isSavingPhone}>
                        {isSavingPhone ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelPhone} disabled={isSavingPhone}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-medium text-slate-900">{profile.phone}</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setTempPhone(profile.phone)
                      setIsEditingPhone(true)
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {phoneError && <p className="text-red-500 text-sm mt-2">{phoneError}</p>}
              </CardContent>
            </Card>

            {/* Password */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-rose-600" />
                </div>
                <CardTitle className="text-lg">Password</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditingPassword ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block text-slate-700">Current Password</label>
                      <Input type="password" value={passwordData.current} onChange={(e) => setPasswordData(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block text-slate-700">New Password</label>
                      <Input type="password" value={passwordData.new} onChange={(e) => setPasswordData(p => ({ ...p, new: e.target.value }))} placeholder="Enter new password" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block text-slate-700">Confirm New Password</label>
                      <Input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirm new password" />
                    </div>
                    {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleChangePassword} disabled={isSavingPassword}>
                        {isSavingPassword ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Update
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setIsEditingPassword(false)
                        setPasswordData({ current: '', new: '', confirm: '' })
                        setPasswordError(null)
                      }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xl tracking-widest text-slate-400 mb-3">••••••••••••</p>
                    <Button variant="outline" size="sm" onClick={() => setIsEditingPassword(true)}>
                      Change Password
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Right - Sidebar */}
          <div className="space-y-5">

            {/* Major - ONLY FOR STUDENTS */}
            {!hideStudentSections && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 pb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-amber-600" />
                  </div>
                  <CardTitle className="text-lg">Faculty</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-medium text-slate-900">{profile.major}</p>
                  {profile.major === "Not set" && (
                    <p className="text-sm text-slate-500 mt-2">Contact admin to update your faculty</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Preferences - ONLY FOR STUDENTS */}
            {!hideStudentSections && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Newspaper className="h-5 w-5 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">News Preferences</CardTitle>
                  </div>
                  {!isEditingPreferences && (
                    <Button variant="outline" size="sm" className="h-8" onClick={() => {
                      setIsEditingPreferences(true)
                      setPreferencesError(null)
                      setPreferencesSuccess(null)
                    }}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  )}
                </CardHeader>
                
                <CardContent>
                  {isEditingPreferences ? (
                    <div className="space-y-3">
                      {preferencesSuccess && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{preferencesSuccess}</div>
                      )}
                      {preferencesError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{preferencesError}</div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map((category) => {
                          const isSelected = selectedCategories[category.id] ?? false
                          return (
                            <div
                              key={category.id}
                              onClick={() => toggleCategory(category.id)}
                              className={`group relative cursor-pointer overflow-hidden rounded-lg border-2 p-2 text-center transition-all
                                ${isSelected
                                  ? `border-transparent bg-gradient-to-br from-indigo-500 to-violet-600 text-white`
                                  : `border-slate-200 hover:border-indigo-400 bg-white`
                                }`}
                            >
                              {isSelected && (
                                <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded bg-white shadow">
                                  <Check className="h-2.5 w-2.5 text-indigo-600" strokeWidth={3} />
                                </div>
                              )}
                              <div className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded text-base transition-all
                                ${isSelected ? "bg-white/20" : "bg-slate-100"}`}>
                                {category.emoji}
                              </div>
                              <p className={`text-xs font-medium ${isSelected ? "text-white" : "text-slate-700"}`}>{category.label}</p>
                            </div>
                          )
                        })}
                      </div>

                      <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                        <Sparkles className="h-3 w-3 text-indigo-500" />
                        <span>{Object.values(selectedCategories).filter(Boolean).length} topics selected</span>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" className="flex-1 h-8" onClick={handleCancelPreferences} disabled={isSavingPreferences}>
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700" onClick={handleSavePreferences} disabled={isSavingPreferences}>
                          {isSavingPreferences ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {profile.interests.length === 0 ? (
                        <p className="text-slate-500 italic py-3 text-sm">No interests selected yet — tap Edit to personalize!</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {profile.interests.map((slug) => {
                            const cat = CATEGORIES.find(c => c.id === slug)
                            const label = cat?.label || slug
                            const emoji = cat?.emoji || '✨'
                            return (
                              <Badge key={slug} variant="secondary" className="px-2.5 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 border-slate-200">
                                <span className="mr-1">{emoji}</span>{label}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Account Info - FOR MANAGERS / MEDIA ADVISERS */}
            {hideStudentSections && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 pb-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-sky-600" />
                  </div>
                  <CardTitle className="text-lg">Account Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Role</p>
                    <p className="text-lg font-semibold text-slate-900 capitalize">{profile.role.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Access Type</p>
                    <p className="text-sm font-medium text-slate-700">Authorized Platform User</p>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}