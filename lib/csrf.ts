/**
 * توليد CSRF token عشوائي
 * يستخدم Web Crypto API (متوفر في Edge Runtime أيضاً)
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * التحقق من تطابق CSRF token
 * يقارن الـ token من الـ Cookie مع الـ token من الـ Header
 * يستخدم مقارنة ثابتة الزمن لمنع هجمات timing
 */
export function validateCsrfTokens(
  cookieToken: string | undefined,
  headerToken: string | null
): boolean {
  if (!cookieToken || !headerToken) {
    return false
  }

  // أطوال مختلفة = لا تتطابق أبداً
  if (cookieToken.length !== headerToken.length) {
    return false
  }

  // مقارنة ثابتة الزمن (timing-safe)
  let result = 0
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }

  return result === 0
}

/**
 * إعدادات CSRF Cookie
 */
export const CSRF_COOKIE_OPTIONS = {
  httpOnly: false, // يجب أن يكون قابل للقراءة من JavaScript
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24, // 24 ساعة
  path: "/",
}

/**
 * اسم الـ Header الذي يحمل CSRF token
 */
export const CSRF_HEADER_NAME = "x-csrf-token"

/**
 * اسم الـ Cookie الذي يحفظ CSRF token
 */
export const CSRF_COOKIE_NAME = "csrf_token"
