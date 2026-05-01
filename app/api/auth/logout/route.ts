import { NextResponse } from "next/server"

export async function POST() {
  try {
    const response = NextResponse.json(
      { message: "تم تسجيل الخروج بنجاح" },
      { status: 200 }
    )

    // مسح cookie الجلسة
    response.cookies.delete("session")

    return response
  } catch (err) {
    console.error("Logout error:", err)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الخروج" },
      { status: 500 }
    )
  }
}
