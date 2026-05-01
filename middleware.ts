import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { generateCsrfToken, validateCsrfTokens, CSRF_COOKIE_OPTIONS, CSRF_HEADER_NAME, CSRF_COOKIE_NAME } from "@/lib/csrf"

// المسارات العامة لا تحتاج مصادقة
const publicPaths = ["/", "/api/auth/login", "/api/auth/register"]

// المسارات التي تحتاج دور أدمن
const adminPaths = ["/admin"]

// الطلبات التي تتطلب تحقق CSRF (POST, PUT, DELETE, PATCH)
const mutatingMethods = ["POST", "PUT", "DELETE", "PATCH"]

// المسارات المستثناة من CSRF (نقاط الدخول العامة)
const csrfExemptPaths = ["/api/auth/login", "/api/auth/register", "/api/auth/csrf", "/api/auth/webauthn/authenticate"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // السماح بالملفات الثابتة
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.includes(".") // ملفات مثل .svg, .png, etc.
  ) {
    return NextResponse.next()
  }

  // ─── CSRF Protection ───
  // التحقق من CSRF للطلبات المتغيرة فقط
  if (mutatingMethods.includes(request.method)) {
    const isCsrfExempt = csrfExemptPaths.some((path) => pathname === path || pathname.startsWith(path))

    if (!isCsrfExempt) {
      const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
      const headerToken = request.headers.get(CSRF_HEADER_NAME)

      if (!validateCsrfTokens(cookieToken, headerToken)) {
        return NextResponse.json(
          { error: "خطأ في التحقق من أمان الطلب - يرجى تحديث الصفحة والمحاولة مرة أخرى" },
          { status: 403 }
        )
      }
    }
  }

  // ─── CSRF Token Auto-Generation ───
  // توليد CSRF token إذا لم يكن موجوداً
  let response = NextResponse.next()
  const existingCsrfToken = request.cookies.get(CSRF_COOKIE_NAME)?.value

  if (!existingCsrfToken) {
    const newCsrfToken = generateCsrfToken()
    response.cookies.set(CSRF_COOKIE_NAME, newCsrfToken, CSRF_COOKIE_OPTIONS)
  }

  // السماح بالمسارات العامة
  if (publicPaths.some((path) => pathname === path || pathname.startsWith("/api/auth/"))) {
    return response
  }

  // التحقق من وجود cookie الجلسة
  const token = request.cookies.get("session")?.value

  if (!token) {
    // إذا كان طلب API بدون جلسة → 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "غير مصرح - يرجى تسجيل الدخول" },
        { status: 401 }
      )
    }
    // إذا كان طلب صفحة بدون جلسة → تحويل لصفحة الدخول
    return NextResponse.redirect(new URL("/", request.url))
  }

  // التحقق من صحة الـ token
  const payload = await verifyToken(token)

  if (!payload) {
    // Token غير صالح أو منتهي
    const errorResponse = pathname.startsWith("/api/")
      ? NextResponse.json(
          { error: "انتهت صلاحية الجلسة - يرجى تسجيل الدخول مجدداً" },
          { status: 401 }
        )
      : NextResponse.redirect(new URL("/", request.url))

    // مسح cookie الجلسة المنتهية
    errorResponse.cookies.delete("session")
    return errorResponse
  }

  // التحقق من صلاحيات الأدمن
  if (adminPaths.some((path) => pathname.startsWith(path))) {
    if (payload.role !== "admin") {
      return NextResponse.redirect(new URL("/home", request.url))
    }
  }

  // إضافة معلومات المستخدم في الـ headers للـ API routes
  response = NextResponse.next()
  response.headers.set("x-user-id", payload.id)
  response.headers.set("x-user-role", payload.role || "user")
  response.headers.set("x-user-username", payload.username)

  // إعادة تعيين CSRF token في الـ response (للتأكد من وجوده)
  if (!existingCsrfToken) {
    const newCsrfToken = generateCsrfToken()
    response.cookies.set(CSRF_COOKIE_NAME, newCsrfToken, CSRF_COOKIE_OPTIONS)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
