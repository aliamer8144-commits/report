import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { removeCredential } from "@/lib/webauthn"

/**
 * POST /api/auth/webauthn/register/unregister
 * Remove WebAuthn credential — requires authenticated session
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is logged in
    const token = request.cookies.get("session")?.value
    if (!token) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: "انتهت صلاحية الجلسة" },
        { status: 401 }
      )
    }

    await removeCredential(payload.id)

    return NextResponse.json({
      success: true,
      message: "تم حذف البصمة بنجاح",
    })
  } catch (err) {
    console.error("WebAuthn unregister error:", err)
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء حذف البصمة"
    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
