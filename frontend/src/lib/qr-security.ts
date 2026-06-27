// ✅ تشفير/فك تشفير بسيط (Obfuscation) لمنع القراءة المباشرة بالعين
// ⚠️ ده مش تشفير عسكري، لكنه كافي لمنع النسخ العادي أو الـ shoulder surfing

const SECRET = 'mti_qr_login_v2' // غيّريه لأي نص طويل

export const encodeCredentials = (email: string, password: string): string => {
  const payload = { e: email, p: password, t: Date.now() }
  const str = JSON.stringify(payload)
  let encoded = ''
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i)
    const keyChar = SECRET.charCodeAt(i % SECRET.length)
    encoded += String.fromCharCode(charCode ^ keyChar)
  }
  return btoa(encoded).replace(/\+/g, '-').replace(/\//g, '_')
}

export const decodeCredentials = (encoded: string): { email: string; password: string; issuedAt: number } | null => {
  try {
    const cleaned = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(cleaned)
    let original = ''
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i)
      const keyChar = SECRET.charCodeAt(i % SECRET.length)
      original += String.fromCharCode(charCode ^ keyChar)
    }
    const payload = JSON.parse(original)
    return { email: payload.e, password: payload.p, issuedAt: payload.t }
  } catch {
    return null
  }
}

export const isQRValid = (issuedAt: number, maxAgeMs = 120000): boolean => {
  return Date.now() - issuedAt <= maxAgeMs // صالح لمدة 2 دقيقة
}