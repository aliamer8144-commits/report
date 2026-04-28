export interface ReportDataForPptx {
  SERVICE_CODE: string
  ID_NUMBER: string
  NAME_AR: string
  NAME_EN: string
  DAYS_COUNT: number
  ENTRY_DATE_GREGORIAN: string
  EXIT_DATE_GREGORIAN: string
  ENTRY_DATE_HIJRI?: string
  EXIT_DATE_HIJRI?: string
  REPORT_ISSUE_DATE: string
  NATIONALITY_AR: string
  NATIONALITY_EN: string
  DOCTOR_NAME_AR: string
  DOCTOR_NAME_EN: string
  JOB_TITLE_AR: string
  JOB_TITLE_EN: string
  HOSPITAL_NAME_AR: string
  HOSPITAL_NAME_EN: string
  PRINT_DATE: string
  PRINT_TIME: string
}

export type PptxProgressUpdate = {
  percent: number
  stageLabel: string
  detail: string
  etaSeconds: number | null
}

export type PptxProgressCallback = (update: PptxProgressUpdate) => void

function linearEtaSeconds(elapsedSec: number, percent: number): number | null {
  if (percent < 4 || percent >= 99 || elapsedSec <= 0) return null
  return (elapsedSec / percent) * (100 - percent)
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

type GenerateKind = "pptx" | "pdf"

function copyForKind(kind: GenerateKind) {
  if (kind === "pdf") {
    return {
      prepDetail:
        "تجهيز بيانات التقرير — سيتم إنشاء نفس ملف العرض (PPTX) ثم تحويله إلى PDF على الخادم...",
      connectDetail: "إرسال الطلب — جاري انتظار استجابة الخادم (إنشاء العرض ثم التحويل إلى PDF)...",
      serverDetail:
        "جاري تعبئة القالب ثم تحويله إلى PDF عبر Slidize Cloud — قد يستغرق ذلك بضع ثوانٍ.",
      downloadUnknown: "جاري استلام ملف PDF المحوَّل من الخادم...",
      doneDetail: "اكتمل تنزيل ملف PDF (نفس محتوى العرض بعد التحويل).",
      doneShort: "اكتمل تنزيل ملف PDF.",
      blobMime: "application/pdf",
    }
  }
  return {
    prepDetail: "تجهيز بيانات التقرير للإرسال إلى خادم إنشاء العرض...",
    connectDetail: "إرسال الطلب — جاري انتظار استجابة الخادم (إنشاء الشرائح)...",
    serverDetail: "الخادم يبني ملف العرض التقديمي — قد يستغرق ذلك بضع ثوانٍ حسب الاتصال.",
    downloadUnknown: "جاري استلام بيانات العرض التقديمي من الخادم...",
    doneDetail: "اكتمل تنزيل ملف PPTX بنجاح.",
    doneShort: "اكتمل تنزيل ملف PPTX.",
    blobMime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  }
}

async function downloadGenerateEndpointWithProgress(
  data: ReportDataForPptx,
  kind: GenerateKind,
  onProgress?: PptxProgressCallback,
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_PPTX_API_URL
  if (!baseUrl) throw new Error("PPTX API URL is not configured")

  const path = kind === "pptx" ? "/generate-pptx" : "/generate-pdf"
  const endpoint = `${baseUrl.replace(/\/$/, "")}${path}`
  const ext = kind === "pptx" ? ".pptx" : ".pdf"
  const filename = `sickLeaves${ext}`
  const t0 = Date.now()
  const copy = copyForKind(kind)

  const push = (partial: PptxProgressUpdate) => {
    onProgress?.({
      percent: Math.min(100, Math.max(0, partial.percent)),
      stageLabel: partial.stageLabel,
      detail: partial.detail,
      etaSeconds: partial.etaSeconds,
    })
  }

  push({
    percent: 4,
    stageLabel: "بدء العملية",
    detail: copy.prepDetail,
    etaSeconds: null,
  })
  await new Promise((r) => setTimeout(r, 120))

  push({
    percent: 11,
    stageLabel: "الاتصال بالخادم",
    detail: copy.connectDetail,
    etaSeconds: null,
  })

  let waitPct = 11
  const waitTimer = setInterval(() => {
    waitPct = Math.min(waitPct + 0.45, 27)
    const elapsed = (Date.now() - t0) / 1000
    push({
      percent: waitPct,
      stageLabel: "معالجة على الخادم",
      detail: copy.serverDetail,
      etaSeconds: linearEtaSeconds(elapsed, waitPct),
    })
  }, 380)

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  } finally {
    clearInterval(waitTimer)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Failed to generate ${kind.toUpperCase()}`)
  }

  const cl = res.headers.get("content-length")
  const totalBytes = cl ? Number.parseInt(cl, 10) : NaN
  const stream = res.body

  if (!stream) {
    push({
      percent: 88,
      stageLabel: "استلام الملف",
      detail: "جاري قراءة الملف من الخادم...",
      etaSeconds: 1,
    })
    const blob = await res.blob()
    push({
      percent: 96,
      stageLabel: "إنهاء التنزيل",
      detail: "جاري حفظ الملف على جهازك...",
      etaSeconds: 0,
    })
    triggerBlobDownload(blob, filename)
    push({
      percent: 100,
      stageLabel: "تم بنجاح",
      detail: copy.doneShort,
      etaSeconds: 0,
    })
    return
  }

  const reader = stream.getReader()
  const chunks: BlobPart[] = []
  let received = 0
  const downloadT0 = Date.now()
  let smoothPct = Math.max(waitPct, 30)

  push({
    percent: smoothPct,
    stageLabel: "تنزيل الملف",
    detail:
      Number.isFinite(totalBytes) && totalBytes > 0
        ? `استلام البيانات — 0 من ${Math.max(1, Math.round(totalBytes / 1024))} كيلوبايت تقريبًا`
        : copy.downloadUnknown,
    etaSeconds: null,
  })

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value?.byteLength) {
      chunks.push(value)
      received += value.byteLength
      const elapsedDl = (Date.now() - downloadT0) / 1000
      let pct: number
      let eta: number | null
      if (Number.isFinite(totalBytes) && totalBytes > 0) {
        pct = 30 + (received / totalBytes) * 64
        const rate = received / Math.max(elapsedDl, 0.001)
        eta = (totalBytes - received) / rate
      } else {
        smoothPct = Math.min(smoothPct + 2.2, 90)
        pct = smoothPct
        eta = linearEtaSeconds((Date.now() - t0) / 1000, pct)
      }
      const kb = Math.round(received / 1024)
      const detail =
        Number.isFinite(totalBytes) && totalBytes > 0
          ? `استلام البيانات — ${kb} من ${Math.round(totalBytes / 1024)} كيلوبايت`
          : `تم استلام ${kb} كيلوبايت — جاري إكمال التنزيل...`
      push({
        percent: pct,
        stageLabel: "تنزيل الملف",
        detail,
        etaSeconds: eta != null && Number.isFinite(eta) ? eta : null,
      })
    }
  }

  push({
    percent: 95,
    stageLabel: "إنهاء التنزيل",
    detail: "تجميع الملف وتجهيز الحفظ على جهازك...",
    etaSeconds: 0,
  })

  const blob = new Blob(chunks, { type: copy.blobMime })
  triggerBlobDownload(blob, filename)

  push({
    percent: 100,
    stageLabel: "تم بنجاح",
    detail: copy.doneDetail,
    etaSeconds: 0,
  })
}

/** تنزيل PPTX مع تقارير تقدّم (مراحل، نسبة مئوية، وقت متبقٍ تقديري). */
export async function downloadPptxViaApiWithProgress(
  data: ReportDataForPptx,
  onProgress?: PptxProgressCallback,
): Promise<void> {
  await downloadGenerateEndpointWithProgress(data, "pptx", onProgress)
}

export async function downloadPptxViaApi(data: ReportDataForPptx) {
  await downloadPptxViaApiWithProgress(data)
}

/**
 * تنزيل PDF من الخادم مع التقدّم.
 * ملف PDF هو نفسه ملف العرض PPTX بعد تعبئته بالبيانات ثم تحويله إلى PDF (LibreOffice على الخادم).
 */
export async function downloadPdfViaApiWithProgress(
  data: ReportDataForPptx,
  onProgress?: PptxProgressCallback,
): Promise<void> {
  await downloadGenerateEndpointWithProgress(data, "pdf", onProgress)
}

export async function downloadPdfViaApi(data: ReportDataForPptx) {
  await downloadPdfViaApiWithProgress(data)
}
