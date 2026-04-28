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

/* ===== Measurements from PPTX template (exact match) =====
 * Page: 297mm x 420mm (A3 long)
 * Table: left=12.84mm, top=86mm, width=271.15mm
 *   Col 0 (EN Label): 57.23mm
 *   Col 1 (EN Value): 84.12mm
 *   Col 2 (AR Value): 83.77mm
 *   Col 3 (AR Label): 46.02mm
 * Colors:
 *   Table border: #E0E0E0 (0.5mm)
 *   White row bg: #FFFFFF
 *   Gray row bg: #F7F7F7
 *   Dark blue row bg: #2C3E77
 *   Label text (blue): #366FB5
 *   Value text (dark): #2C3E77
 *   Arabic title: #306DB5, 22.5pt, top=55.85mm
 *   English title: #2C3E77, 18.7pt, top=70.59mm
 */

// ===== CSS Grid styles for HTML preview =====
const gridCols = `display:grid;grid-template-columns:57.23mm 84.12mm 83.77mm 46.02mm;`

const cellBase = (bg: string) =>
  `height:14.8mm;padding:0 3mm;border:0.5mm solid #E0E0E0;background:${bg};font-size:13.5pt;line-height:13.8mm;text-align:center;`

const labelEn = (bg: string) =>
  `${cellBase(bg)}font-weight:700;color:#366FB5;font-family:'Times New Roman',Times,serif;`

const valueEn = (bg: string) =>
  `${cellBase(bg)}font-weight:400;color:#2C3E77;font-family:'Times New Roman',Times,serif;`

const valueAr = (bg: string) =>
  `${cellBase(bg)}font-weight:400;color:#2C3E77;font-family:'Noto Sans Arabic',sans-serif;direction:rtl;`

const labelAr = (bg: string) =>
  `${cellBase(bg)}font-weight:700;color:#366FB5;font-family:'Noto Sans Arabic',sans-serif;direction:rtl;`

const mergedValueEn = (bg: string) =>
  `${cellBase(bg)}font-weight:400;color:#2C3E77;font-family:'Times New Roman',Times,serif;grid-column:span 2;`

const labelEnBlue = `${cellBase('#2C3E77')}font-weight:700;color:#FFFFFF;font-family:'Times New Roman',Times,serif;`
const valueEnBlue = `${cellBase('#2C3E77')}font-weight:400;color:#FFFFFF;font-family:'Times New Roman',Times,serif;`
const valueArBlue = `${cellBase('#2C3E77')}font-weight:400;color:#FFFFFF;font-family:'Noto Sans Arabic',sans-serif;direction:rtl;`
const labelArBlue = `${cellBase('#2C3E77')}font-weight:700;color:#FFFFFF;font-family:'Noto Sans Arabic',sans-serif;direction:rtl;`

// ===== HTML generation (kept for preview) =====
export function generateHtmlContent(data: ReportDataForPptx): string {
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

    <!-- HEADER: Logos (positions from PPTX: Seha left=12.7, Calligraphy left=101.78, MOH left=191.73) -->
    <img src="/images/seha-logo.png" alt="Seha" style="position:absolute;top:12.7mm;left:12.7mm;width:52.92mm;height:23.36mm;object-fit:contain;">
    <img src="/images/calligraphy.png" alt="Kingdom" style="position:absolute;top:12.7mm;left:101.78mm;width:92.6mm;height:44.02mm;object-fit:contain;">
    <img src="/images/moh-logo.png" alt="MOH" style="position:absolute;top:12.7mm;left:191.73mm;width:92.6mm;height:37.72mm;object-fit:contain;">

    <!-- HEADER: Title Text (from PPTX) -->
    <div style="position:absolute;top:55.85mm;left:0;width:297mm;text-align:center;font-family:'Noto Sans Arabic',sans-serif;font-size:22.5pt;font-weight:700;color:#306DB5;">تقرير إجازة مرضية</div>
    <div style="position:absolute;top:70.59mm;left:0;width:297mm;text-align:center;font-family:'Times New Roman',Times,serif;font-size:18.7pt;font-weight:700;color:#2C3E77;">Sick Leave Report</div>

    <!-- TABLE: CSS Grid layout -->
    <!-- left=12.84mm, top=86mm, width=271.15mm -->
    <!-- Column widths: 57.23mm | 84.12mm | 83.77mm | 46.02mm -->
    <div style="position:absolute;top:86mm;left:12.84mm;width:271.15mm;border:0.5mm solid #E0E0E0;border-radius:3mm;overflow:hidden;direction:ltr;">
      <!-- Row 0: Leave ID (bg: white) - columns 2&3 merged -->
      <div style="${gridCols}">
        <div style="${labelEn('#FFFFFF')}">Leave ID</div>
        <div style="${mergedValueEn('#FFFFFF')}">${data.SERVICE_CODE || ''}</div>
        <div style="${labelAr('#FFFFFF')}">رمز الإجازة</div>
      </div>
      <!-- Row 1: Leave Duration (bg: #2C3E77 dark blue) -->
      <div style="${gridCols}">
        <div style="${labelEnBlue}">Leave Duration</div>
        <div style="${valueEnBlue}">${leaveDurationEn}</div>
        <div style="${valueArBlue}">${leaveDurationAr}</div>
        <div style="${labelArBlue}">مدة الإجازة</div>
      </div>
      <!-- Row 2: Admission Date (bg: white) -->
      <div style="${gridCols}">
        <div style="${labelEn('#FFFFFF')}">Admission Date</div>
        <div style="${valueEn('#FFFFFF')}">${entryG}</div>
        <div style="${valueAr('#FFFFFF')}">${entryH}</div>
        <div style="${labelAr('#FFFFFF')}">تاريخ الدخول</div>
      </div>
      <!-- Row 3: Discharge Date (bg: #F7F7F7) -->
      <div style="${gridCols}">
        <div style="${labelEn('#F7F7F7')}">Discharge Date</div>
        <div style="${valueEn('#F7F7F7')}">${exitG}</div>
        <div style="${valueAr('#F7F7F7')}">${exitH}</div>
        <div style="${labelAr('#F7F7F7')}">تاريخ الخروج</div>
      </div>
      <!-- Row 4: Issue Date (bg: white) -->
      <div style="${gridCols}">
        <div style="${labelEn('#FFFFFF')}">Issue Date</div>
        <div style="${valueEn('#FFFFFF')}">${issueG}</div>
        <div style="${valueAr('#FFFFFF')}"></div>
        <div style="${labelAr('#FFFFFF')}">تاريخ إصدار التقرير</div>
      </div>
      <!-- Row 5: Name (bg: #F7F7F7) -->
      <div style="${gridCols}">
        <div style="${labelEn('#F7F7F7')}">Name</div>
        <div style="${valueEn('#F7F7F7')}">${data.NAME_EN || ''}</div>
        <div style="${valueAr('#F7F7F7')}">${data.NAME_AR || ''}</div>
        <div style="${labelAr('#F7F7F7')}">الاسم</div>
      </div>
      <!-- Row 6: National ID (bg: white) -->
      <div style="${gridCols}">
        <div style="${labelEn('#FFFFFF')}">National ID / Iqama</div>
        <div style="${valueEn('#FFFFFF')}">${data.ID_NUMBER || ''}</div>
        <div style="${valueAr('#FFFFFF')}"></div>
        <div style="${labelAr('#FFFFFF')}">الإقامة / رقم الهوية</div>
      </div>
      <!-- Row 7: Nationality (bg: #F7F7F7) -->
      <div style="${gridCols}">
        <div style="${labelEn('#F7F7F7')}">Nationality</div>
        <div style="${valueEn('#F7F7F7')}">${data.NATIONALITY_EN || ''}</div>
        <div style="${valueAr('#F7F7F7')}">${data.NATIONALITY_AR || ''}</div>
        <div style="${labelAr('#F7F7F7')}">الجنسية</div>
      </div>
      <!-- Row 8: Employer (bg: white) -->
      <div style="${gridCols}">
        <div style="${labelEn('#FFFFFF')}">Employer</div>
        <div style="${valueEn('#FFFFFF')}"></div>
        <div style="${valueAr('#FFFFFF')}"></div>
        <div style="${labelAr('#FFFFFF')}">جهة العمل</div>
      </div>
      <!-- Row 9: Practitioner Name (bg: #F7F7F7) -->
      <div style="${gridCols}">
        <div style="${labelEn('#F7F7F7')}">Practitioner Name</div>
        <div style="${valueEn('#F7F7F7')}">${data.DOCTOR_NAME_EN || ''}</div>
        <div style="${valueAr('#F7F7F7')}">${data.DOCTOR_NAME_AR || ''}</div>
        <div style="${labelAr('#F7F7F7')}">اسم الممارس</div>
      </div>
      <!-- Row 10: Position (bg: white) -->
      <div style="${gridCols}">
        <div style="${labelEn('#FFFFFF')}">Position</div>
        <div style="${valueEn('#FFFFFF')}">${data.JOB_TITLE_EN || ''}</div>
        <div style="${valueAr('#FFFFFF')}">${data.JOB_TITLE_AR || ''}</div>
        <div style="${labelAr('#FFFFFF')}">المسمى الوظيفي</div>
      </div>
    </div>

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
 * Convert images to base64 data URLs (kept for preview).
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
 * Replace all image src attributes with base64 data URLs (kept for preview).
 */
export async function inlineImages(html: string): Promise<string> {
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

/* ===== Canvas + jsPDF PDF generation (no html2canvas) ===== */

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function imageToDataURL(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const cx = c.getContext('2d')!
      cx.drawImage(img, 0, 0)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

interface CellDef {
  text: string
  bold: boolean
  color: string
  isAr?: boolean
}

interface RowDef {
  cells: CellDef[]
  bg: string
  merge?: { colIndex: number; span: number }
}

export async function generateHtmlPdf(
  data: ReportDataForPptx,
  onProgress?: HtmlPdfProgressCallback
): Promise<void> {
  const t0 = Date.now()
  const push = (update: { percent: number; stageLabel: string; detail: string; etaSeconds: number | null }) => {
    onProgress?.(update)
  }

  push({ percent: 5, stageLabel: 'تجهيز القالب', detail: 'جاري إعداد البيانات...', etaSeconds: null })

  // Scale factor: 3x for high quality
  const S = 3
  const MM = S * 96 / 25.4   // 1mm = 11.3386 canvas px at 3x
  const PT = S * 96 / 72     // 1pt = 4.0 canvas px at 3x
  const PW = 297 * MM        // page width in canvas px
  const PH = 420 * MM        // page height in canvas px

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = PW
  canvas.height = PH
  const ctx = canvas.getContext('2d')!

  // White background
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, PW, PH)

  push({ percent: 10, stageLabel: 'تحميل الخطوط', detail: 'جاري تحميل الخطوط...', etaSeconds: null })

  // Preload fonts via Font Loading API
  try {
    await Promise.all([
      document.fonts.load(`bold 22.5pt "Noto Sans Arabic"`),
      document.fonts.load(`bold 18.7pt "Times New Roman"`),
      document.fonts.load(`13.5pt "Noto Sans Arabic"`),
      document.fonts.load(`13.5pt "Times New Roman"`),
      document.fonts.load(`11.2pt "Noto Sans Arabic"`),
      document.fonts.load(`11.2pt "Times New Roman"`),
      document.fonts.load(`12.8pt "Noto Sans Arabic"`),
      document.fonts.load(`12.8pt "Times New Roman"`),
    ])
  } catch {
    // Fonts might already be loaded or partially available
  }

  push({ percent: 20, stageLabel: 'تحميل الصور', detail: 'جاري تحميل صور القالب...', etaSeconds: null })

  // Load images as data URLs (needed for canvas drawing)
  const [sehaUrl, calligraphyUrl, mohUrl, qrUrl, sealUrl, nhicUrl] = await Promise.all([
    imageToDataURL('/images/seha-logo.png'),
    imageToDataURL('/images/calligraphy.png'),
    imageToDataURL('/images/moh-logo.png'),
    imageToDataURL('/images/qr-code.png'),
    imageToDataURL('/images/seal.png'),
    imageToDataURL('/images/nhic-logo.png'),
  ])

  push({ percent: 35, stageLabel: 'رسم الهيدر', detail: 'جاري رسم رأس التقرير...', etaSeconds: null })

  // Helper: draw image from data URL at mm coordinates
  const drawImg = async (url: string | null, xMm: number, yMm: number, wMm: number, hMm: number) => {
    if (!url) return
    const img = await loadImage(url.startsWith('data:') ? url : '')
    if (img) ctx.drawImage(img, xMm * MM, yMm * MM, wMm * MM, hMm * MM)
  }

  // Draw logos
  await drawImg(sehaUrl, 12.7, 12.7, 52.92, 23.36)
  await drawImg(calligraphyUrl, 101.78, 12.7, 92.6, 44.02)
  await drawImg(mohUrl, 191.73, 12.7, 92.6, 37.72)

  // Draw Arabic title (centered horizontally, vertically at baseline)
  ctx.font = `bold ${22.5 * PT}px "Noto Sans Arabic", sans-serif`
  ctx.fillStyle = '#306DB5'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('تقرير إجازة مرضية', PW / 2, 55.85 * MM + 11.25 * PT)

  // Draw English title
  ctx.font = `bold ${18.7 * PT}px "Times New Roman", serif`
  ctx.fillStyle = '#2C3E77'
  ctx.fillText('Sick Leave Report', PW / 2, 70.59 * MM + 9.35 * PT)

  push({ percent: 50, stageLabel: 'رسم الجدول', detail: 'جاري رسم جدول البيانات...', etaSeconds: null })

  // ===== TABLE =====
  const TBL_LEFT = 12.84
  const TBL_TOP = 86
  const COLS = [57.23, 84.12, 83.77, 46.02]
  const ROW_H = 14.8
  const BORDER = 0.5
  const FONT_SIZE = 13.5

  // Format dates
  const entryG = format_date_dd_mm_yyyy(data.ENTRY_DATE_GREGORIAN)
  const exitG = format_date_dd_mm_yyyy(data.EXIT_DATE_GREGORIAN)
  const entryH = format_date_dd_mm_yyyy(data.ENTRY_DATE_HIJRI)
  const exitH = format_date_dd_mm_yyyy(data.EXIT_DATE_HIJRI)
  const issueG = format_date_dd_mm_yyyy(data.REPORT_ISSUE_DATE)
  const printG = format_date_dd_mm_yyyy(data.PRINT_DATE)

  const leaveDurationEn = `${data.DAYS_COUNT} day ( ${entryG} to ${exitG} )`
  const leaveDurationAr = `${data.DAYS_COUNT} يوم (${entryH} الى ${exitH})`

  // Table rows
  const rows: RowDef[] = [
    {
      cells: [
        { text: 'Leave ID', bold: true, color: '#366FB5' },
        { text: data.SERVICE_CODE || '', bold: false, color: '#2C3E77' },
        { text: '', bold: false, color: '#2C3E77', isAr: true },
        { text: 'رمز الإجازة', bold: true, color: '#366FB5', isAr: true },
      ],
      bg: '#FFFFFF',
      merge: { colIndex: 1, span: 2 },
    },
    {
      cells: [
        { text: 'Leave Duration', bold: true, color: '#FFFFFF' },
        { text: leaveDurationEn, bold: false, color: '#FFFFFF' },
        { text: leaveDurationAr, bold: false, color: '#FFFFFF', isAr: true },
        { text: 'مدة الإجازة', bold: true, color: '#FFFFFF', isAr: true },
      ],
      bg: '#2C3E77',
    },
    {
      cells: [
        { text: 'Admission Date', bold: true, color: '#366FB5' },
        { text: entryG, bold: false, color: '#2C3E77' },
        { text: entryH, bold: false, color: '#2C3E77', isAr: true },
        { text: 'تاريخ الدخول', bold: true, color: '#366FB5', isAr: true },
      ],
      bg: '#FFFFFF',
    },
    {
      cells: [
        { text: 'Discharge Date', bold: true, color: '#366FB5' },
        { text: exitG, bold: false, color: '#2C3E77' },
        { text: exitH, bold: false, color: '#2C3E77', isAr: true },
        { text: 'تاريخ الخروج', bold: true, color: '#366FB5', isAr: true },
      ],
      bg: '#F7F7F7',
    },
    {
      cells: [
        { text: 'Issue Date', bold: true, color: '#366FB5' },
        { text: issueG, bold: false, color: '#2C3E77' },
        { text: '', bold: false, color: '#2C3E77', isAr: true },
        { text: 'تاريخ إصدار التقرير', bold: true, color: '#366FB5', isAr: true },
      ],
      bg: '#FFFFFF',
    },
    {
      cells: [
        { text: 'Name', bold: true, color: '#366FB5' },
        { text: data.NAME_EN || '', bold: false, color: '#2C3E77' },
        { text: data.NAME_AR || '', bold: false, color: '#2C3E77', isAr: true },
        { text: 'الاسم', bold: true, color: '#366FB5', isAr: true },
      ],
      bg: '#F7F7F7',
    },
    {
      cells: [
        { text: 'National ID / Iqama', bold: true, color: '#366FB5' },
        { text: data.ID_NUMBER || '', bold: false, color: '#2C3E77' },
        { text: '', bold: false, color: '#2C3E77', isAr: true },
        { text: 'الإقامة / رقم الهوية', bold: true, color: '#366FB5', isAr: true },
      ],
      bg: '#FFFFFF',
    },
    {
      cells: [
        { text: 'Nationality', bold: true, color: '#366FB5' },
        { text: data.NATIONALITY_EN || '', bold: false, color: '#2C3E77' },
        { text: data.NATIONALITY_AR || '', bold: false, color: '#2C3E77', isAr: true },
        { text: 'الجنسية', bold: true, color: '#366FB5', isAr: true },
      ],
      bg: '#F7F7F7',
    },
    {
      cells: [
        { text: 'Employer', bold: true, color: '#366FB5' },
        { text: '', bold: false, color: '#2C3E77' },
        { text: '', bold: false, color: '#2C3E77', isAr: true },
        { text: 'جهة العمل', bold: true, color: '#366FB5', isAr: true },
      ],
      bg: '#FFFFFF',
    },
    {
      cells: [
        { text: 'Practitioner Name', bold: true, color: '#366FB5' },
        { text: data.DOCTOR_NAME_EN || '', bold: false, color: '#2C3E77' },
        { text: data.DOCTOR_NAME_AR || '', bold: false, color: '#2C3E77', isAr: true },
        { text: 'اسم الممارس', bold: true, color: '#366FB5', isAr: true },
      ],
      bg: '#F7F7F7',
    },
    {
      cells: [
        { text: 'Position', bold: true, color: '#366FB5' },
        { text: data.JOB_TITLE_EN || '', bold: false, color: '#2C3E77' },
        { text: data.JOB_TITLE_AR || '', bold: false, color: '#2C3E77', isAr: true },
        { text: 'المسمى الوظيفي', bold: true, color: '#366FB5', isAr: true },
      ],
      bg: '#FFFFFF',
    },
  ]

  // Draw table cells
  ctx.strokeStyle = '#E0E0E0'
  ctx.lineWidth = BORDER * MM

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]
    const yTop = (TBL_TOP + ri * ROW_H) * MM
    const yCenter = yTop + (ROW_H * MM) / 2  // vertical center of row

    let colOffset = 0
    for (let ci = 0; ci < row.cells.length; ci++) {
      // Skip cells inside a merged span
      if (row.merge && ci > row.merge.colIndex && ci < row.merge.colIndex + row.merge.span) {
        continue
      }

      const xLeft = (TBL_LEFT + colOffset) * MM
      const spanW = (row.merge && ci === row.merge.colIndex)
        ? COLS.slice(ci, ci + row.merge.span).reduce((a, b) => a + b, 0)
        : COLS[ci]
      const cellW = spanW * MM
      const cellH = ROW_H * MM
      const xCenter = xLeft + cellW / 2  // horizontal center of cell

      // Cell background
      ctx.fillStyle = row.bg
      ctx.fillRect(xLeft, yTop, cellW, cellH)

      // Cell border
      ctx.strokeRect(xLeft, yTop, cellW, cellH)

      // Cell text
      const cell = row.cells[ci]
      if (cell.text) {
        const fontFamily = cell.isAr
          ? '"Noto Sans Arabic", sans-serif'
          : '"Times New Roman", serif'
        const weight = cell.bold ? 'bold ' : ''
        ctx.font = `${weight}${FONT_SIZE * PT}px ${fontFamily}`
        ctx.fillStyle = cell.color
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(cell.text, xCenter, yCenter)
      }

      colOffset += spanW
    }
  }

  push({ percent: 70, stageLabel: 'رسم الفوتر', detail: 'جاري رسم ذيل التقرير...', etaSeconds: null })

  // ===== FOOTER =====
  // Draw footer images
  await drawImg(qrUrl, 60.1, 260, 25, 25)
  await drawImg(sealUrl, 203.5, 277, 39.7, 39.7)
  await drawImg(nhicUrl, 231.4, 339, 52.9, 25.1)

  // Helper: draw footer text
  const drawText = (
    text: string,
    xMm: number,
    yMm: number,
    sizePt: number,
    fontFamily: string,
    color: string,
    align: CanvasTextAlign = 'left',
  ) => {
    if (!text) return
    ctx.font = `bold ${sizePt * PT}px ${fontFamily}`
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.textBaseline = 'top'
    ctx.fillText(text, xMm * MM, yMm * MM)
  }

  // Verification text (RTL, right-aligned)
  // HTML: left:25.2mm, width:110mm, text-align:right → right edge = 135.2mm
  drawText('للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة', 135.2, 290, 11.2, '"Noto Sans Arabic", sans-serif', '#000000', 'right')
  drawText('الرسمي', 92.7, 304.9, 11.2, '"Noto Sans Arabic", sans-serif', '#000000', 'right')

  // English verification text (LTR)
  drawText('To check the report please visit Seha\'s official website', 35.1, 312.5, 11.2, '"Times New Roman", serif', '#000000', 'left')
  drawText('www.seha.sa/#/inquiries/slenquiry', 51.1, 321.6, 11.2, '"Times New Roman", serif', '#0000FF', 'left')

  // Facility info
  // Hospital name AR (RTL, right-aligned, no explicit width → use ~270mm as right edge)
  drawText(data.HOSPITAL_NAME_AR || '', 270, 263, 12.8, '"Noto Sans Arabic", sans-serif', '#000000', 'right')
  drawText(data.HOSPITAL_NAME_EN || '', 201.9, 306, 12.8, '"Times New Roman", serif', '#000000', 'left')
  drawText(': رقم الترخيص', 270, 312, 12.8, '"Noto Sans Arabic", sans-serif', '#000000', 'right')

  // Timestamp
  drawText(data.PRINT_TIME || '', 13.5, 338, 12.8, '"Times New Roman", serif', '#000000', 'left')
  drawText(printG, 13.5, 349, 12.8, '"Times New Roman", serif', '#000000', 'left')

  push({ percent: 85, stageLabel: 'توليد PDF', detail: 'جاري إنشاء ملف PDF النهائي...', etaSeconds: 2 })

  // ===== Convert canvas to PDF using jsPDF =====
  const jsPDF = (await import('jspdf')).default
  const doc = new jsPDF({
    unit: 'mm',
    format: [297, 420],
    orientation: 'portrait',
  })

  const imgData = canvas.toDataURL('image/jpeg', 0.98)
  doc.addImage(imgData, 'JPEG', 0, 0, 297, 420)

  const filename = `sickLeaves_${data.NAME_EN || data.SERVICE_CODE || 'report'}.pdf`
  doc.save(filename)

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  push({
    percent: 100,
    stageLabel: 'تم بنجاح',
    detail: `تم إنشاء وتنزيل ملف PDF بنجاح (${elapsed} ثانية)`,
    etaSeconds: 0,
  })
}
