import { NextRequest, NextResponse } from "next/server"

async function translateWithGoogle(text: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "ar", target: "en", format: "text" }),
    },
  )
  if (!res.ok) {
    const err = await res.text()
    console.error("Google Translate error:", err)
    throw new Error("Google translation failed")
  }
  const data = (await res.json()) as {
    data?: { translations?: { translatedText?: string }[] }
  }
  return data.data?.translations?.[0]?.translatedText ?? ""
}

async function translateWithMyMemory(text: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|en`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) {
    throw new Error("MyMemory translation failed")
  }
  const data = (await res.json()) as {
    responseStatus?: number
    responseData?: { translatedText?: string; error?: string }
  }
  if (data.responseStatus !== 200 && data.responseStatus !== undefined) {
    const msg = data.responseData?.error ?? "Translation service error"
    throw new Error(msg)
  }
  return data.responseData?.translatedText ?? ""
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const text = typeof body?.text === "string" ? body.text : ""
    const trimmed = text.trim()
    if (!trimmed) {
      return NextResponse.json({ translatedText: "" })
    }

    const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY
    let translatedText: string
    if (googleKey) {
      translatedText = await translateWithGoogle(trimmed, googleKey)
    } else {
      translatedText = await translateWithMyMemory(trimmed)
    }

    return NextResponse.json({ translatedText })
  } catch (e) {
    console.error("POST /api/translate:", e)
    return NextResponse.json({ error: "فشلت الترجمة" }, { status: 502 })
  }
}
