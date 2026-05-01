import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"

// المسارات العامة لا تحتاج مصادقة
const publicPaths = ["/", "/api/auth/login", "/api/auth/register"]

// المسارات التي تحتاج دور أدمن
const adminPaths = ["/admin"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // السماح بالمسارات العامة
  if (publicPaths.some((path) => pathname === path || pathname.startsWith("/api/auth/"))) {
    return NextResponse.next()
  }

  // السماح بالملفات الثابتة
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.includes(".") // ملفات مثل .svg, .png, etc.
  ) {
    return NextResponse.next()
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
    const response = pathname.startsWith("/api/")
      ? NextResponse.json(
          { error: "انتهت صلاحية الجلسة - يرجى تسجيل الدخول مجدداً" },
          { status: 401 }
        )
      : NextResponse.redirect(new URL("/", request.url))

    // مسح cookie الجلسة المنتهية
    response.cookies.delete("session")
    return response
  }

  // التحقق من صلاحيات الأدمن
  if (adminPaths.some((path) => pathname.startsWith(path))) {
    if (payload.role !== "admin") {
      return NextResponse.redirect(new URL("/home", request.url))
    }
  }

  // إضافة معلومات المستخدم في الـ headers للـ API routes
  const response = NextResponse.next()
  response.headers.set("x-user-id", payload.id)
  response.headers.set("x-user-role", payload.role || "user")
  response.headers.set("x-user-username", payload.username)
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
