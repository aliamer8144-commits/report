import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { verifyReg, saveCredential } from "@/lib/webauthn"
import type { RegistrationResponseJSON } from "@simplewebauthn/server"

/**
 * POST /api/auth/webauthn/register/verify
 * Finish WebAuthn registration — requires authenticated session
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

    const body = await request.json()
    const { challengeId, response, transports } = body as {
      challengeId: string
      response: RegistrationResponseJSON
      transports?: string[]
    }

    if (!challengeId || !response) {
      return NextResponse.json(
        { error: "بيانات التسجيل غير مكتملة" },
        { status: 400 }
      )
    }

    // Verify the registration response
    const credential = await verifyReg(challengeId, response, transports)

    // Save to database
    await saveCredential(payload.id, credential)

    return NextResponse.json({
      success: true,
      message: "تم تسجيل البصمة بنجاح",
    })
  } catch (err) {
    console.error("WebAuthn register verify error:", err)
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء التحقق من البصمة"
    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
