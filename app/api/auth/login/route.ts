import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"
import { createToken } from "@/lib/auth"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: "اسم المستخدم وكلمة المرور مطلوبان" },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // جلب المستخدم
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username, full_name, password, role, is_suspended")
      .eq("username", username)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      )
    }

    // التحقق من حالة التعليق
    if (user.is_suspended) {
      return NextResponse.json(
        { error: "تم تعليق هذا الحساب. يرجى التواصل مع المشرف لتفعيل الحساب." },
        { status: 403 }
      )
    }

    // التحقق من كلمة المرور
    let passwordMatch = false
    const storedPassword = user.password

    // محاولة المقارنة مع bcrypt أولاً (كلمات مرور مشفرة)
    if (storedPassword.startsWith("$2")) {
      passwordMatch = await bcrypt.compare(password, storedPassword)
    } else {
      // التوافق مع كلمات المرور القديمة (نص عادي)
      passwordMatch = password === storedPassword

      // إذا كانت كلمة المرور متطابقة (نص عادي)، نقوم بتشفيرها تلقائياً
      if (passwordMatch) {
        const hashedPassword = await bcrypt.hash(password, 10)
        await supabase
          .from("users")
          .update({ password: hashedPassword })
          .eq("id", user.id)
      }
    }

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      )
    }

    // إنشاء JWT token
    const token = await createToken({
      id: user.id,
      username: user.username,
      full_name: user.full_name || user.username,
      role: user.role || "user",
    })

    // إرجاع بيانات المستخدم + تعيين cookie الجلسة
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    })

    // تعيين cookie الجلسة (httpOnly = لا يمكن الوصول من JavaScript)
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 أيام
      path: "/",
    })

    return response
  } catch (err) {
    console.error("Login error:", err)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الدخول" },
      { status: 500 }
    )
  }
}
