const CSRF_COOKIE_NAME = "csrf_token"
const CSRF_HEADER_NAME = "x-csrf-token"

/**
 * قراءة CSRF token من الـ Cookies
 */
function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`)
  )
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * طلبات GET لا تحتاج CSRF token
 * طلبات POST/PUT/DELETE/PATCH تحتاج CSRF token في الـ header
 */
const METHODS_NEEDING_CSRF = ["POST", "PUT", "DELETE", "PATCH"]

/**
 * fetch مع CSRF token تلقائي
 * يقرأ الـ CSRF token من الـ Cookie ويضيفه كـ header للطلبات المتغيرة
 *
 * @example
 * ```ts
 * // بدل fetch العادي:
 * const res = await fetchWithCsrf("/api/auth/logout", { method: "POST" })
 *
 * // مع body:
 * const res = await fetchWithCsrf("/api/admin/users", {
 *   method: "POST",
 *   body: JSON.stringify({ name: "test" }),
 * })
 * ```
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase()

  const headers = new Headers(options.headers || {})

  // إضافة CSRF token للطلبات المتغيرة
  if (METHODS_NEEDING_CSRF.includes(method)) {
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, csrfToken)
    }
    // إضافة Content-Type إذا لم يكن موجوداً و يوجد body
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json")
    }
  }

  return fetch(url, { ...options, headers })
}
