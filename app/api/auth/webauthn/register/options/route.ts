import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { generateRegOptions } from "@/lib/webauthn"

/**
 * POST /api/auth/webauthn/register/options
 * Start WebAuthn registration — requires authenticated session
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is logged in
    const token = request.cookies.get("session")?.value
    if (!token) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً لتسجيل البصمة" },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً" },
        { status: 401 }
      )
    }

    const { options, challengeId } = await generateRegOptions(
      payload.id,
      payload.username
    )

    return NextResponse.json({
      options,
      challengeId,
    })
  } catch (err) {
    console.error("WebAuthn register options error:", err)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تجهيز تسجيل البصمة" },
      { status: 500 }
    )
  }
}
