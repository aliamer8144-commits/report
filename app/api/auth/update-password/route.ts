import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { userId, username, password, role } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: "معرف المستخدم مطلوب" },
        { status: 400 }
      )
    }

    if (!username) {
      return NextResponse.json(
        { error: "اسم المستخدم مطلوب" },
        { status: 400 }
      )
    }

    if (password && password.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // بناء كائن التحديث
    const updates: Record<string, any> = {
      username,
      role,
      is_admin: role === "admin",
    }

    // تشفير كلمة المرور الجديدة فقط إذا تم إدخالها
    if (password && password.trim() !== "") {
      updates.password = await bcrypt.hash(password, 10)
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)

    if (updateError) {
      return NextResponse.json(
        { error: "حدث خطأ أثناء تحديث بيانات المستخدم" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "تم تحديث بيانات المستخدم بنجاح" },
      { status: 200 }
    )
  } catch (err) {
    console.error("Update password error:", err)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث بيانات المستخدم" },
      { status: 500 }
    )
  }
}
