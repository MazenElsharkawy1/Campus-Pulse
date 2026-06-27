import axios from 'axios'
 
// ============================================================
// 🔧 BACKEND INTEGRATION POINT
// Set NEXT_PUBLIC_API_URL in your .env.local file
// Example: NEXT_PUBLIC_API_URL=https://your-backend.com/api
// ============================================================
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
 
// ============================================================
// 🔧 BACKEND INTEGRATION POINT
// This interceptor automatically attaches the auth token to
// every request once the user is logged in.
// The backend team should confirm the header format:
//   Most common: Authorization: Bearer <token>
// ============================================================
axiosInstance.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
 
export default axiosInstance