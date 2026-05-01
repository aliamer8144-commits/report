import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getStoredCredentialId } from "@/lib/webauthn"

/**
 * GET /api/auth/webauthn/status
 * Check if the current user has a registered WebAuthn credential
 * Requires authenticated session
 */
export async function GET(request: NextRequest) {
  try {
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

    const credentialId = await getStoredCredentialId(payload.id)
    const registered = !!credentialId

    return NextResponse.json({
      registered,
    })
  } catch (err) {
    console.error("WebAuthn status error:", err)
    return NextResponse.json(
      { error: "حدث خطأ" },
      { status: 500 }
    )
  }
}
