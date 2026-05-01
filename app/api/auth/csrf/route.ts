import { NextResponse } from "next/server"
import { generateCsrfToken, CSRF_COOKIE_OPTIONS, CSRF_COOKIE_NAME } from "@/lib/csrf"

/**
 * GET /api/auth/csrf
 * يُرجع CSRF token جديد ويحدّث الـ Cookie
 * يُستخدم لتحديث الـ token عند الحاجة (مثلاً بعد انتهاء صلاحيته)
 */
export async function GET() {
  try {
    const newToken = generateCsrfToken()
    const response = NextResponse.json({ csrfToken: newToken })

    response.cookies.set(CSRF_COOKIE_NAME, newToken, CSRF_COOKIE_OPTIONS)

    return response
  } catch (err) {
    console.error("CSRF token generation error:", err)
    return NextResponse.json(
      { error: "فشل في توليد رمز الأمان" },
      { status: 500 }
    )
  }
}
