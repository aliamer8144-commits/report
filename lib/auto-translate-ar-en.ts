import type { Dispatch, MutableRefObject, SetStateAction } from "react"

/** نطاقات أحرف عربية شائعة (بما فيها العربية الموسعة والعرضية) */
export const ARABIC_SCRIPT_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

/**
 * ترجمة من عربي لإنجليزي عبر MyMemory API مباشرة من الكلاينت
 * (لتجاوز مشكلة عدم وجود API routes على Vercel بسبب output: 'export')
 */
export async function fetchTranslateArToEn(text: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|en`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error("MyMemory translation failed")
  }
  const data = (await res.json()) as {
    responseStatus?: number
    responseData?: { translatedText?: string }
  }
  return data.responseData?.translatedText ?? ""
}

/**
 * تحويل أسماء عربية إلى أحرف إنجليزية (ترجمة حرفية / transliteration)
 * يستخدم Google Translate API المجاني مع dt=rm للنطق الصوتي
 * مثال: أميرة → Amira (وليس Princess)
 */
export async function fetchTransliterateArToEn(text: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=rm&q=${encodeURIComponent(text)}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error("Google transliteration failed")
  }
  const data = (await res.json()) as [Array<[unknown, unknown, unknown, string]>]
  const raw = data[0][0][3] ?? ""

  // تنظيف النتيجة
  return cleanTransliteration(raw)
}

/**
 * تنظيف نتيجة التحويل من Google
 * - إزالة علامات التنصيص والهمزات الزائدة من البداية
 * - تنسيق كل كلمة بأحرف كبيرة
 */
function cleanTransliteration(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return ""

      // إزالة الهمزة/عين من بداية الكلمة
      let cleaned = word.replace(/^[''\u0027\u2018\u2019]+/, "")

      // تنظيف بعض الحالات الخاصة
      cleaned = cleaned.replace(/^e([aeiou])/i, "$1") // eabdallah → abdallah

      if (!cleaned) return ""

      // كل الأحرف كبيرة (لأسماء المرضى والأطباء)
      cleaned = cleaned.toUpperCase()

      return cleaned
    })
    .filter(Boolean)
    .join(" ")
}

/**
 * عند تغيير حقل عربي: تُستدعى الترجمة أو التحويل الحرفي مباشرة.
 * mode:
 *   - "translate": ترجمة معنوية عبر MyMemory (للجنسية، المسمى الوظيفي، المستشفى)
 *   - "transliterate": تحويل حرفي عبر Google (للأسماء - اسم المريض والطبيب)
 */
export function scheduleArToEnSync<T extends object>(
  setFormData: Dispatch<SetStateAction<T>>,
  seqRef: MutableRefObject<Record<string, number>>,
  arKey: keyof T & string,
  enKey: keyof T & string,
  arValue: string,
  mode: "translate" | "transliterate" = "translate",
): void {
  const trimmed = arValue.trim()
  if (!trimmed) {
    seqRef.current[arKey] = (seqRef.current[arKey] ?? 0) + 1
    setFormData((p) => ({ ...p, [enKey]: "" } as T))
    return
  }
  if (!ARABIC_SCRIPT_RE.test(arValue)) {
    return
  }

  seqRef.current[arKey] = (seqRef.current[arKey] ?? 0) + 1
  const mySeq = seqRef.current[arKey]

  const fetchFn = mode === "transliterate"
    ? fetchTransliterateArToEn
    : fetchTranslateArToEn

  void fetchFn(arValue).then((en) => {
    if (seqRef.current[arKey] !== mySeq) return
    setFormData((p) => ({ ...p, [enKey]: en } as T))
  }).catch((e) => {
    console.error(`Auto-${mode} failed:`, e)
  })
}

/** عند إلغاء تركيب المكوّن: إبطال الطلبات الجارية حتى لا تُحدَّث الحالة بعد الخروج. */
export function invalidateArToEnSeq(seqRef: MutableRefObject<Record<string, number>>): void {
  for (const k of Object.keys(seqRef.current)) {
    seqRef.current[k] = (seqRef.current[k] ?? 0) + 1
  }
}
