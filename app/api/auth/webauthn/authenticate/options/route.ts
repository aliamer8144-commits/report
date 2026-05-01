import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateAuthOptions } from "@/lib/webauthn"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/auth/webauthn/authenticate/options
 * Start WebAuthn authentication — NO auth required (user is logging in)
 * Body: { username: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json(
        { error: "اسم المستخدم مطلوب" },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Look up user and their WebAuthn credential
    const { data: user, error } = await supabase
      .from("users")
      .select(
        "id, username, full_name, role, is_suspended, webauthn_credential_id, webauthn_transports"
      )
      .eq("username", username)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: "اسم المستخدم غير موجود" },
        { status: 404 }
      )
    }

    if (user.is_suspended) {
      return NextResponse.json(
        { error: "تم تعليق هذا الحساب" },
        { status: 403 }
      )
    }

    if (!user.webauthn_credential_id) {
      return NextResponse.json(
        { error: "البصمة غير مسجلة" },
        { status: 404 }
      )
    }

    let transports: string[] | undefined
    if (user.webauthn_transports) {
      try {
        transports = JSON.parse(user.webauthn_transports) as string[]
      } catch {
        transports = undefined
      }
    }

    const { options, challengeId } = await generateAuthOptions(
      user.webauthn_credential_id as `string`,
      transports
    )

    return NextResponse.json({
      options,
      challengeId,
    })
  } catch (err) {
    console.error("WebAuthn auth options error:", err)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تجهيز التحقق بالبصمة" },
      { status: 500 }
    )
  }
}
