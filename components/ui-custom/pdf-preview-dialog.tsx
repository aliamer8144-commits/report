"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, Download, Loader2, X, ZoomIn, ZoomOut } from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { generateHtmlPdf, generateHtmlContent, inlineImages, type HtmlPdfProgressCallback, type ReportDataForPptx } from "@/lib/html-pdf-service"
import type { PptxProgressUpdate } from "@/lib/pptx-service"

const initialProgress: PptxProgressUpdate = {
  percent: 0,
  stageLabel: "",
  detail: "",
  etaSeconds: null,
}

export function useHtmlPdfWithPreview() {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState<PptxProgressUpdate>(initialProgress)
  const currentDataRef = useRef<ReportDataForPptx | null>(null)

  const openPreview = useCallback(async (data: ReportDataForPptx) => {
    currentDataRef.current = data
    setLoadingPreview(true)
    setPreviewOpen(true)
    setProgress(initialProgress)

    try {
      let html = generateHtmlContent(data)
      html = await inlineImages(html)
      setPreviewHtml(html)
    } catch (e) {
      console.error("Preview generation error:", e)
      setPreviewHtml(null)
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  const handleDownload = useCallback(async () => {
    if (!currentDataRef.current) return
    setDownloading(true)
    setProgress(initialProgress)

    const cb: HtmlPdfProgressCallback = (update) => {
      setProgress({
        percent: update.percent,
        stageLabel: update.stageLabel,
        detail: update.detail,
        etaSeconds: update.etaSeconds,
      })
    }

    try {
      await generateHtmlPdf(currentDataRef.current, cb)
    } catch (e) {
      console.error("Download error:", e)
    } finally {
      setDownloading(false)
      setProgress(initialProgress)
    }
  }, [])

  const closePreview = useCallback(() => {
    setPreviewOpen(false)
    setPreviewHtml(null)
    currentDataRef.current = null
    setProgress(initialProgress)
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
            {downloading && (
              <span className="text-xs text-gray-500 ml-3">
                {progress.stageLabel} — {Math.round(progress.percent)}%
              </span>
            )}
            <Button
              onClick={handleDownload}
              disabled={downloading || loadingPreview}
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
        <div className="bg-gray-100 overflow-auto" style={{ height: "calc(95vh - 56px)" }}>
          {loadingPreview ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">جاري تحميل المعاينة...</p>
              </div>
            </div>
          ) : previewHtml ? (
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
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState(0.45)

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(html)
        doc.close()
      }
    }
  }, [html])

  // A3 long proportions: 297mm x 420mm
  const pageW = 297 * 1.33 // px at 1.33px/mm
  const pageH = 420 * 1.33

  return (
    <div className="relative">
      {/* Zoom Controls */}
      <div className="absolute -top-10 left-0 flex items-center gap-1 z-10">
        <button
          onClick={() => setScale((s) => Math.max(0.2, s - 0.05))}
          className="p-1 rounded bg-white border shadow-sm hover:bg-gray-50"
          title="تصغير"
        >
          <ZoomOut className="h-4 w-4 text-gray-600" />
        </button>
        <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded border shadow-sm min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(1.5, s + 0.05))}
          className="p-1 rounded bg-white border shadow-sm hover:bg-gray-50"
          title="تكبير"
        >
          <ZoomIn className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Scaled iframe container */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          width: `${pageW}px`,
          height: `${pageH}px`,
          marginBottom: `${(pageH * (scale - 1))}px`,
        }}
      >
        <iframe
          ref={iframeRef}
          className="border shadow-lg bg-white"
          style={{ width: `${pageW}px`, height: `${pageH}px`, pointerEvents: downloading ? "none" : "auto" }}
          sandbox="allow-same-origin"
          title="PDF Preview"
        />
      </div>
    </div>
  )
}
