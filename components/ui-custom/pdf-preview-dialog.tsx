"use client"

import { useCallback, useState, useRef } from "react"
import { Eye, Download, Loader2, X, ZoomIn, ZoomOut } from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { generateHtmlPdf, generateHtmlContent, type HtmlPdfProgressCallback, type ReportDataForPptx } from "@/lib/html-pdf-service"

export function useHtmlPdfWithPreview() {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const currentDataRef = useRef<ReportDataForPptx | null>(null)

  const openPreview = useCallback((data: ReportDataForPptx) => {
    try {
      currentDataRef.current = data
      const html = generateHtmlContent(data)
      setPreviewHtml(html)
      setPreviewOpen(true)
      setErrorMsg(null)
      setLoadingPreview(false)
    } catch (e) {
      console.error("Preview generation error:", e)
      setErrorMsg(e instanceof Error ? e.message : "حدث خطأ أثناء إنشاء المعاينة")
    }
  }, [])

  const handleDownload = useCallback(async () => {
    if (!currentDataRef.current) return
    setDownloading(true)
    setErrorMsg(null)

    const cb: HtmlPdfProgressCallback = () => {}

    try {
      await generateHtmlPdf(currentDataRef.current, cb)
    } catch (e) {
      console.error("Download error:", e)
      setErrorMsg(e instanceof Error ? e.message : "حدث خطأ أثناء التنزيل")
    } finally {
      setDownloading(false)
    }
  }, [])

  const closePreview = useCallback(() => {
    setPreviewOpen(false)
    setPreviewHtml(null)
    currentDataRef.current = null
    setErrorMsg(null)
  }, [])

  const previewDialog = (
    <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) closePreview() }}>
      <DialogContent
        dir="rtl"
        className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden gap-0 [&>button]:hidden"
        onPointerDownOutside={(e) => downloading && e.preventDefault()}
        onEscapeKeyDown={(e) => downloading && e.preventDefault()}
        onInteractOutside={(e) => downloading && e.preventDefault()}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between bg-white border-b px-4 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-bold text-gray-700">
              معاينة التقرير قبل التنزيل
            </span>
          </div>
          <div className="flex items-center gap-2">
            {errorMsg && (
              <span className="text-xs text-red-500 ml-3">{errorMsg}</span>
            )}
            <Button
              onClick={handleDownload}
              disabled={downloading}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {downloading ? (
                <>
                  <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />
                  جاري التنزيل...
                </>
              ) : (
                <>
                  <Download className="ml-1.5 h-4 w-4" />
                  تنزيل PDF
                </>
              )}
            </Button>
            <Button
              onClick={closePreview}
              disabled={downloading}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="bg-gray-200 overflow-auto" style={{ height: "calc(95vh - 56px)" }}>
          {previewHtml ? (
            <div className="flex justify-center p-4">
              <PreviewFrame html={previewHtml} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-red-500">حدث خطأ أثناء تحميل المعاينة</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )

  return { openPreview, previewDialog }
}

function PreviewFrame({ html }: { html: string }) {
  const [scale, setScale] = useState(0.5)

  // A3 long proportions: 297mm x 420mm (at ~3.78px/mm for 96dpi)
  const pageW = 395  // ~297mm at 96dpi
  const pageH = 558  // ~420mm at 96dpi (keep aspect)

  return (
    <div className="relative inline-block">
      {/* Zoom Controls */}
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={() => setScale((s) => Math.max(0.2, +(s - 0.1).toFixed(2)))}
          className="p-1.5 rounded bg-white border shadow-sm hover:bg-gray-50"
          title="تصغير"
        >
          <ZoomOut className="h-4 w-4 text-gray-600" />
        </button>
        <span className="text-xs text-gray-600 bg-white px-3 py-1 rounded border shadow-sm min-w-[50px] text-center font-medium">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(1.5, +(s + 0.1).toFixed(2)))}
          className="p-1.5 rounded bg-white border shadow-sm hover:bg-gray-50"
          title="تكبير"
        >
          <ZoomIn className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Scaled page */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          width: `${pageW}px`,
          height: `${pageH}px`,
          marginBottom: `${pageH * (scale - 1)}px`,
        }}
      >
        <iframe
          srcDoc={html}
          className="border shadow-lg bg-white"
          style={{ width: `${pageW}px`, height: `${pageH}px` }}
          title="PDF Preview"
        />
      </div>
    </div>
  )
}
