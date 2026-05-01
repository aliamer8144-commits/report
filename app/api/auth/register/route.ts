import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { username, password, role } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: "اسم المستخدم وكلمة المرور مطلوبان" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // التحقق من أن اسم المستخدم غير موجود
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: "اسم المستخدم موجود بالفعل" },
        { status: 409 }
      )
    }

    // تشفير كلمة المرور قبل الحفظ
    const hashedPassword = await bcrypt.hash(password, 10)

    const { error: insertError } = await supabase.from("users").insert({
      username,
      password: hashedPassword,
      role: role || "user",
    })

    if (insertError) {
      return NextResponse.json(
        { error: "حدث خطأ أثناء إضافة المستخدم" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "تمت إضافة المستخدم بنجاح" },
      { status: 201 }
    )
  } catch (err) {
    console.error("Register error:", err)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إضافة المستخدم" },
      { status: 500 }
    )
  }
}
