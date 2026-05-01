import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value

    if (!token) {
      return NextResponse.json(
        { error: "لم يتم تسجيل الدخول" },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)

    if (!payload) {
      const response = NextResponse.json(
        { error: "انتهت صلاحية الجلسة" },
        { status: 401 }
      )
      response.cookies.delete("session")
      return response
    }

    return NextResponse.json({
      user: {
        id: payload.id,
        username: payload.username,
        full_name: payload.full_name,
        role: payload.role,
      },
    })
  } catch (err) {
    console.error("Session error:", err)
    return NextResponse.json(
      { error: "حدث خطأ أثناء التحقق من الجلسة" },
      { status: 500 }
    )
  }
}
