import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createToken } from "@/lib/auth"
import {
  getStoredCredential,
  verifyAuth,
  updateCounter,
} from "@/lib/webauthn"
import type { AuthenticationResponseJSON } from "@simplewebauthn/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/auth/webauthn/authenticate/verify
 * Finish WebAuthn authentication — creates JWT cookie on success
 * Body: { challengeId, response, username }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { challengeId, response, username } = body as {
      challengeId: string
      response: AuthenticationResponseJSON
      username: string
    }

    if (!challengeId || !response || !username) {
      return NextResponse.json(
        { error: "بيانات التحقق غير مكتملة" },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Look up the user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username, full_name, role, is_suspended")
      .eq("username", username)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: "اسم المستخدم غير موجود" },
        { status: 401 }
      )
    }

    if (user.is_suspended) {
      return NextResponse.json(
        { error: "تم تعليق هذا الحساب. يرجى التواصل مع المشرف لتفعيل الحساب." },
        { status: 403 }
      )
    }

    // Get stored credential
    const storedCredential = await getStoredCredential(user.id)
    if (!storedCredential) {
      return NextResponse.json(
        { error: "لم يتم العثور على بيانات البصمة. يرجى إعادة تسجيل الدخول" },
        { status: 401 }
      )
    }

    // Verify the authentication response
    const { newCounter } = await verifyAuth(
      challengeId,
      response,
      storedCredential
    )

    // Update counter to prevent replay attacks
    await updateCounter(user.id, newCounter)

    // Create JWT token (same as normal login)
    const token = await createToken({
      id: user.id,
      username: user.username,
      full_name: user.full_name || user.username,
      role: user.role || "user",
    })

    // Return user data + set session cookie
    const responseObj = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    })

    responseObj.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return responseObj
  } catch (err) {
    console.error("WebAuthn auth verify error:", err)
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء التحقق من البصمة"
    return NextResponse.json(
      { error: message },
      { status: 401 }
    )
  }
}
