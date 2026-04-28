import type { ReportDataForPptx } from './pptx-service'

export type HtmlPdfProgressCallback = (update: {
  percent: number
  stageLabel: string
  detail: string
  etaSeconds: number | null
}) => void

function format_date_dd_mm_yyyy(value?: string | null): string {
  if (!value) return ''
  const s = value.trim()
  const m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!m) return s
  const dd = m[3].padStart(2, '0')
  const mm = m[2].padStart(2, '0')
  return `${dd}-${mm}-${m[1]}`
}

/* ===== Precise measurements from PDF analysis =====
 * Page: 297mm x 420mm (A3 long)
 * Table: left=12.7mm, right=284.2mm, width=271.5mm
 *   Col 1 (EN Label): 57.3mm (21.1%)
 *   Col 2 (EN Value): 84.1mm (31.0%)
 *   Col 3 (AR Value): 84.1mm (31.0%)
 *   Col 4 (AR Label): 45.9mm (16.9%)
 * Row height: ~14.8mm (Row 6 Name ~15.7mm, Row 11 Position ~18.6mm)
 * Colors:
 *   Table border: #DDDDDD
 *   White row bg: #FFFFFF
 *   Gray row bg: #F7F7F7
 *   Dark blue row bg: #2C3E77
 *   Label text (blue): #366FB5
 *   Value text (dark): #2C3E77
 *   Arabic title: #306DB5
 *   English title: #2C3E77
 */

const cellBase = `height:14.8mm;padding:0 3mm;vertical-align:middle;border:0.3mm solid #DDDDDD;font-size:13.5pt;line-height:1.2;`

const labelEn = (bg: string) =>
  `${cellBase}background:${bg};font-weight:700;color:#366FB5;font-family:'Times New Roman',Times,serif;text-align:left;padding-left:4mm;`

const valueEn = (bg: string) =>
  `${cellBase}background:${bg};font-weight:400;color:#2C3E77;font-family:'Times New Roman',Times,serif;text-align:left;padding-left:3mm;`

const valueAr = (bg: string) =>
  `${cellBase}background:${bg};font-weight:400;color:#2C3E77;font-family:'Noto Sans Arabic',sans-serif;text-align:right;direction:rtl;padding-right:3mm;`

const labelAr = (bg: string) =>
  `${cellBase}background:${bg};font-weight:700;color:#366FB5;font-family:'Noto Sans Arabic',sans-serif;text-align:right;direction:rtl;padding-right:4mm;`

/* Blue row overrides */
const labelEnBlue = `${cellBase}background:#2C3E77;font-weight:700;color:#FFFFFF;font-family:'Times New Roman',Times,serif;text-align:left;padding-left:4mm;`
const valueEnBlue = `${cellBase}background:#2C3E77;font-weight:400;color:#FFFFFF;font-family:'Times New Roman',Times,serif;text-align:left;padding-left:3mm;`
const valueArBlue = `${cellBase}background:#2C3E77;font-weight:400;color:#FFFFFF;font-family:'Noto Sans Arabic',sans-serif;text-align:right;direction:rtl;padding-right:3mm;`
const labelArBlue = `${cellBase}background:#2C3E77;font-weight:700;color:#FFFFFF;font-family:'Noto Sans Arabic',sans-serif;text-align:right;direction:rtl;padding-right:4mm;`

function generateHtmlContent(data: ReportDataForPptx): string {
  const entryG = format_date_dd_mm_yyyy(data.ENTRY_DATE_GREGORIAN)
  const exitG = format_date_dd_mm_yyyy(data.EXIT_DATE_GREGORIAN)
  const entryH = format_date_dd_mm_yyyy(data.ENTRY_DATE_HIJRI)
  const exitH = format_date_dd_mm_yyyy(data.EXIT_DATE_HIJRI)
  const issueG = format_date_dd_mm_yyyy(data.REPORT_ISSUE_DATE)
  const printG = format_date_dd_mm_yyyy(data.PRINT_DATE)

  const leaveDurationEn = `${data.DAYS_COUNT} day ( ${entryG} to ${exitG} )`
  const leaveDurationAr = `<span style="font-family:'Times New Roman',Times,serif;font-weight:400;">(${entryH} </span><span style="font-family:'Noto Sans Arabic',sans-serif;font-weight:400;">الى</span><span style="font-family:'Times New Roman',Times,serif;font-weight:400;"> ${exitH})</span> <span style="font-family:'Noto Sans Arabic',sans-serif;font-weight:400;">يوم</span> <span style="font-family:'Times New Roman',Times,serif;font-weight:400;">${data.DAYS_COUNT}</span>`

  return `<!DOCTYPE html>
<html lang="ar" dir="ltr">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:297mm; height:420mm; background:#FFFFFF; -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
  </style>
</head>
<body>
  <div style="position:relative;width:297mm;height:420mm;overflow:hidden;background:#FFFFFF;font-family:'Times New Roman',Times,serif;color:#000000;">

    <!-- HEADER: Logos (positions from PDF: Seha left=12.7, Calligraphy left=101.8, MOH left=191.7) -->
    <img src="/images/seha-logo.png" alt="Seha" style="position:absolute;top:12.7mm;left:12.7mm;width:52.9mm;height:23.4mm;object-fit:contain;">
    <img src="/images/calligraphy.png" alt="Kingdom" style="position:absolute;top:12.7mm;left:101.8mm;width:92.6mm;height:44mm;object-fit:contain;">
    <img src="/images/moh-logo.png" alt="MOH" style="position:absolute;top:12.7mm;left:191.7mm;width:92.6mm;height:37.7mm;object-fit:contain;">

    <!-- HEADER: Title Text (centered on 297mm page = center at 148.5mm) -->
    <!-- NOTE: "Kingdom of Saudi Arabia" is already inside calligraphy.png image, no separate text needed -->
    <div style="position:absolute;top:55.3mm;left:0;width:297mm;text-align:center;font-family:'Noto Sans Arabic',sans-serif;font-size:22.5pt;font-weight:700;color:#306DB5;line-height:1.3;direction:rtl;">تقرير إجازة مرضية</div>
    <div style="position:absolute;top:70.8mm;left:0;width:297mm;text-align:center;font-family:'Times New Roman',Times,serif;font-size:18.7pt;font-weight:700;color:#2C3E77;line-height:1.3;direction:ltr;">Sick Leave Report</div>

    <!-- TABLE: left=12.7mm, width=271.5mm, top=85.0mm -->
    <!-- Columns: 57.3mm | 84.1mm | 84.1mm | 45.9mm -->
    <table style="position:absolute;top:85mm;left:12.7mm;width:271.5mm;border-collapse:separate;border-spacing:0;border:0.3mm solid #DDDDDD;border-radius:3mm;overflow:hidden;table-layout:fixed;direction:ltr;">
      <colgroup>
        <col style="width:57.3mm;">
        <col style="width:84.1mm;">
        <col style="width:84.1mm;">
        <col style="width:45.9mm;">
      </colgroup>
      <tbody>
        <!-- Row 1: Leave ID (bg: #FFFFFF, h: 15.1mm) -->
        <tr>
          <td style="${labelEn('#F7F7F7')}">Leave ID</td>
          <td style="${valueEn('#F7F7F7')}">${data.SERVICE_CODE || ''}</td>
          <td style="${valueAr('#F7F7F7')}"></td>
          <td style="${labelAr('#F7F7F7')}">رمز الإجازة</td>
        </tr>
        <!-- Row 2: Leave Duration (bg: #2C3E77 dark blue, h: 14.8mm) -->
        <tr>
          <td style="${labelEnBlue}">Leave Duration</td>
          <td style="${valueEnBlue}">${leaveDurationEn}</td>
          <td style="${valueArBlue}">${leaveDurationAr}</td>
          <td style="${labelArBlue}">مدة الإجازة</td>
        </tr>
        <!-- Row 3: Admission Date (bg: #FFFFFF, h: 14.8mm) -->
        <tr>
          <td style="${labelEn('#FFFFFF')}">Admission Date</td>
          <td style="${valueEn('#FFFFFF')}">${entryG}</td>
          <td style="${valueAr('#FFFFFF')}">${entryH}</td>
          <td style="${labelAr('#FFFFFF')}">تاريخ الدخول</td>
        </tr>
        <!-- Row 4: Discharge Date (bg: #F7F7F7, h: 14.9mm) -->
        <tr>
          <td style="${labelEn('#F7F7F7')}">Discharge Date</td>
          <td style="${valueEn('#F7F7F7')}">${exitG}</td>
          <td style="${valueAr('#F7F7F7')}">${exitH}</td>
          <td style="${labelAr('#F7F7F7')}">تاريخ الخروج</td>
        </tr>
        <!-- Row 5: Issue Date (bg: #FFFFFF, h: 14.8mm) -->
        <tr>
          <td style="${labelEn('#FFFFFF')}">Issue Date</td>
          <td style="${valueEn('#FFFFFF')}">${issueG}</td>
          <td style="${valueAr('#FFFFFF')}"></td>
          <td style="${labelAr('#FFFFFF')}">تاريخ إصدار التقرير</td>
        </tr>
        <!-- Row 6: Name (bg: #F7F7F7, h: 15.7mm) -->
        <tr>
          <td style="${labelEn('#F7F7F7')}">Name</td>
          <td style="${valueEn('#F7F7F7')}">${data.NAME_EN || ''}</td>
          <td style="${valueAr('#F7F7F7')}">${data.NAME_AR || ''}</td>
          <td style="${labelAr('#F7F7F7')}">الاسم</td>
        </tr>
        <!-- Row 7: National ID (bg: #FFFFFF, h: 14.9mm) -->
        <tr>
          <td style="${labelEn('#FFFFFF')}">National ID / Iqama</td>
          <td style="${valueEn('#FFFFFF')}">${data.ID_NUMBER || ''}</td>
          <td style="${valueAr('#FFFFFF')}"></td>
          <td style="${labelAr('#FFFFFF')}">الإقامة / رقم الهوية</td>
        </tr>
        <!-- Row 8: Nationality (bg: #F7F7F7, h: 14.8mm) -->
        <tr>
          <td style="${labelEn('#F7F7F7')}">Nationality</td>
          <td style="${valueEn('#F7F7F7')}">${data.NATIONALITY_EN || ''}</td>
          <td style="${valueAr('#F7F7F7')}">${data.NATIONALITY_AR || ''}</td>
          <td style="${labelAr('#F7F7F7')}">الجنسية</td>
        </tr>
        <!-- Row 9: Employer (bg: #FFFFFF, h: 14.8mm) -->
        <tr>
          <td style="${labelEn('#FFFFFF')}">Employer</td>
          <td style="${valueEn('#FFFFFF')}"></td>
          <td style="${valueAr('#FFFFFF')}"></td>
          <td style="${labelAr('#FFFFFF')}">جهة العمل</td>
        </tr>
        <!-- Row 10: Practitioner Name (bg: #F7F7F7, h: 14.8mm) -->
        <tr>
          <td style="${labelEn('#F7F7F7')}">Practitioner Name</td>
          <td style="${valueEn('#F7F7F7')}">${data.DOCTOR_NAME_EN || ''}</td>
          <td style="${valueAr('#F7F7F7')}">${data.DOCTOR_NAME_AR || ''}</td>
          <td style="${labelAr('#F7F7F7')}">اسم الممارس</td>
        </tr>
        <!-- Row 11: Position (bg: #FFFFFF, h: 14.8mm) -->
        <tr>
          <td style="${labelEn('#FFFFFF')}">Position</td>
          <td style="${valueEn('#FFFFFF')}">${data.JOB_TITLE_EN || ''}</td>
          <td style="${valueAr('#FFFFFF')}">${data.JOB_TITLE_AR || ''}</td>
          <td style="${labelAr('#FFFFFF')}">المسمى الوظيفي</td>
        </tr>
      </tbody>
    </table>

    <!-- FOOTER: QR Code (top≈260mm, left≈60mm, 25mm height) -->
    <img src="/images/qr-code.png" alt="QR Code" style="position:absolute;top:260mm;left:60.1mm;width:25mm;height:25mm;object-fit:contain;">

    <!-- FOOTER: Seal (top≈277mm, right side) -->
    <img src="/images/seal.png" alt="Seal" style="position:absolute;top:277mm;left:203.5mm;width:39.7mm;height:39.7mm;object-fit:contain;">

    <!-- FOOTER: Verification Text -->
    <div style="position:absolute;top:290mm;left:25.2mm;width:110mm;font-family:'Noto Sans Arabic',sans-serif;font-size:11.2pt;font-weight:700;color:#000000;text-align:right;direction:rtl;line-height:1.6;">للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة</div>
    <div style="position:absolute;top:304.9mm;left:72.7mm;width:20mm;font-family:'Noto Sans Arabic',sans-serif;font-size:11.2pt;font-weight:700;color:#000000;text-align:right;direction:rtl;">الرسمي</div>
    <div style="position:absolute;top:312.5mm;left:35.1mm;width:100mm;font-family:'Times New Roman',Times,serif;font-size:11.2pt;font-weight:700;color:#000000;direction:ltr;">To check the report please visit Seha's official website</div>
    <div style="position:absolute;top:321.6mm;left:51.1mm;font-family:'Times New Roman',Times,serif;font-size:11.2pt;font-weight:700;color:#0000FF;text-decoration:none;direction:ltr;">www.seha.sa/#/inquiries/slenquiry</div>

    <!-- FOOTER: Facility Info -->
    <div style="position:absolute;top:263mm;left:205.3mm;font-family:'Noto Sans Arabic',sans-serif;font-size:12.8pt;font-weight:700;color:#000000;text-align:right;direction:rtl;">${data.HOSPITAL_NAME_AR || ''}</div>
    <div style="position:absolute;top:306mm;left:201.9mm;font-family:'Times New Roman',Times,serif;font-size:12.8pt;font-weight:700;color:#000000;direction:ltr;">${data.HOSPITAL_NAME_EN || ''}</div>
    <div style="position:absolute;top:313.5mm;left:196.3mm;font-family:'Times New Roman',Times,serif;font-size:12.8pt;font-weight:700;color:#000000;direction:ltr;"></div>
    <div style="position:absolute;top:312mm;left:222.1mm;font-family:'Noto Sans Arabic',sans-serif;font-size:12.8pt;font-weight:700;color:#000000;text-align:right;direction:rtl;">: رقم الترخيص</div>

    <!-- FOOTER: Timestamp -->
    <div style="position:absolute;top:338mm;left:13.5mm;font-family:'Times New Roman',Times,serif;font-size:12.8pt;font-weight:700;color:#000000;direction:ltr;">${data.PRINT_TIME || ''}</div>
    <div style="position:absolute;top:349mm;left:13.5mm;font-family:'Times New Roman',Times,serif;font-size:12.8pt;font-weight:700;color:#000000;direction:ltr;">${printG}</div>

    <!-- FOOTER: NHIC Logo -->
    <img src="/images/nhic-logo.png" alt="NHIC" style="position:absolute;top:339mm;left:231.4mm;width:52.9mm;height:25.1mm;object-fit:contain;">

  </div>
</body>
</html>`
}

/**
 * Convert images to base64 data URLs so html2pdf can render them.
 */
async function imageToBase64(src: string): Promise<string> {
  try {
    const response = await fetch(src)
    const blob = await response.blob()
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return src
  }
}

/**
 * Replace all image src attributes with base64 data URLs.
 */
async function inlineImages(html: string): Promise<string> {
  const imgRegex = /src="(\/images\/[^"]+)"/g
  const matches = [...html.matchAll(imgRegex)]

  if (matches.length === 0) return html

  const replacements = new Map<string, string>()
  await Promise.all(
    matches.map(async (m) => {
      const original = m[1]
      if (!replacements.has(original)) {
        replacements.set(original, await imageToBase64(original))
      }
    })
  )

  let result = html
  for (const [original, dataUrl] of replacements) {
    result = result.replace(new RegExp(`src="${original}"`, 'g'), `src="${dataUrl}"`)
  }
  return result
}

/**
 * Generate and download a PDF from the HTML template.
 * Uses html2pdf.js (client-side) for browser-based PDF generation.
 */
export async function generateHtmlPdf(
  data: ReportDataForPptx,
  onProgress?: HtmlPdfProgressCallback
): Promise<void> {
  const t0 = Date.now()

  const push = (update: { percent: number; stageLabel: string; detail: string; etaSeconds: number | null }) => {
    onProgress?.(update)
  }

  push({ percent: 5, stageLabel: 'تجهيز القالب', detail: 'جاري إنشاء محتوى HTML...', etaSeconds: null })

  let html = generateHtmlContent(data)

  push({ percent: 15, stageLabel: 'تحميل الصور', detail: 'جاري تحميل صور القالب وتحويلها...', etaSeconds: null })
  html = await inlineImages(html)

  push({ percent: 30, stageLabel: 'تحميل المحرك', detail: 'جاري تحميل محرك توليد PDF...', etaSeconds: null })

  const html2pdf = (await import('html2pdf.js')).default

  push({ percent: 45, stageLabel: 'بناء PDF', detail: 'جاري تحويل HTML إلى PDF عالي الجودة...', etaSeconds: null })

  const container = document.createElement('div')
  container.innerHTML = html
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  document.body.appendChild(container)

  await new Promise((resolve) => setTimeout(resolve, 800))

  push({ percent: 60, stageLabel: 'توليد PDF', detail: 'جاري إنشاء ملف PDF النهائي...', etaSeconds: 2 })

  try {
    const filename = `sickLeaves_${data.NAME_EN || data.SERVICE_CODE || 'report'}.pdf`

    const pageEl = container.querySelector('div[style*="width:297mm"]') as HTMLElement
    if (!pageEl) throw new Error('Template element not found')

    await html2pdf()
      .from(pageEl)
      .set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          logging: false,
          letterRendering: true,
        },
        jsPDF: {
          unit: 'mm',
          format: [297, 420],
          orientation: 'portrait',
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .save()

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    push({
      percent: 100,
      stageLabel: 'تم بنجاح',
      detail: `تم إنشاء وتنزيل ملف PDF بنجاح (${elapsed} ثانية)`,
      etaSeconds: 0,
    })
  } finally {
    document.body.removeChild(container)
  }
}
