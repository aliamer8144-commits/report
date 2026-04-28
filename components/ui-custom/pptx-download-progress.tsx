"use client"

import { useCallback, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, FileDown, Loader2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  downloadPptxViaApiWithProgress,
  downloadPdfViaApiWithProgress,
  type PptxProgressUpdate,
  type ReportDataForPptx,
} from "@/lib/pptx-service"
import { generateHtmlPdf, type HtmlPdfProgressCallback } from "@/lib/html-pdf-service"
import { cn } from "@/lib/utils"

function formatEtaArabic(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "يُحسب بعد لحظات..."
  if (seconds <= 0) return "أقل من ثانية"
  const s = Math.ceil(seconds)
  if (s === 1) return "ثانية واحدة تقريبًا"
  if (s < 60) return `حوالي ${s} ثانية`
  const m = Math.floor(s / 60)
  const r = s % 60
  if (r === 0) return `حوالي ${m} دقيقة`
  return `حوالي ${m} د و ${r} ث`
}

type Phase = "idle" | "loading" | "success" | "error"

export type ReportFileKind = "pptx" | "pdf" | "html-pdf"

function ReportDownloadProgressDialog({
  open,
  onOpenChange,
  phase,
  progress,
  errorMessage,
  fileKind,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  phase: Phase
  progress: PptxProgressUpdate
  errorMessage: string | null
  fileKind: ReportFileKind
}) {
  const pct = Math.min(100, Math.max(0, Math.round(progress.percent)))
  const loading = phase === "loading"

  const extLabel = fileKind === "pptx" ? "PPTX" : fileKind === "html-pdf" ? "PDF (قالب HTML)" : "PDF"
  const descriptionLabel = fileKind === "html-pdf"
    ? "تقرير إجازة مرضية — القالب الجديد عالي الجودة"
    : fileKind === "pdf"
      ? "تقرير إجازة مرضية — محول من عرض تقديمي"
      : "ملف عرض تقديمي للتقرير"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className={cn(
          "sm:max-w-[440px] gap-0 border border-indigo-200/70 bg-white/95 p-0 text-foreground shadow-xl backdrop-blur-md overflow-hidden rounded-2xl",
          "[&>button]:hidden",
        )}
        onPointerDownOutside={(e) => loading && e.preventDefault()}
        onEscapeKeyDown={(e) => loading && e.preventDefault()}
        onInteractOutside={(e) => loading && e.preventDefault()}
      >
        <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />
        <div className="relative bg-gradient-to-br from-indigo-500/[0.06] via-white to-purple-500/[0.06] px-8 pb-8 pt-8">
          <DialogHeader className="space-y-3 text-center sm:text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-sm ring-1 ring-indigo-100">
              <AnimatePresence mode="wait">
                {phase === "success" ? (
                  <motion.div
                    key="ok"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 24 }}
                  >
                    <CheckCircle2 className="h-9 w-9 text-green-600" strokeWidth={2} />
                  </motion.div>
                ) : phase === "error" ? (
                  <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <AlertCircle className="h-9 w-9 text-red-500" strokeWidth={2} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="load"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    <FileDown className="h-9 w-9 text-indigo-600" strokeWidth={2} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <DialogTitle
              className={cn(
                "text-xl font-bold tracking-tight",
                phase === "loading" && "gradient-heading",
                phase === "success" && "text-green-700",
                phase === "error" && "text-red-700",
              )}
            >
              {phase === "success"
                ? "تم التنزيل"
                : phase === "error"
                  ? "تعذّر إنشاء الملف"
                  : `جاري إنشاء ملف ${extLabel}`}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-gray-600">
              {phase === "error"
                ? errorMessage ?? "حدث خطأ أثناء الاتصال بالخادم أو إنشاء الملف."
                : phase === "loading"
                  ? descriptionLabel
                  : progress.detail || "يرجى الانتظار..."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8 space-y-5">
            {phase !== "error" && phase !== "success" && (
              <>
                <div className="flex items-end justify-between gap-3 px-0.5">
                  <div className="text-right">
                    <p className="text-xs font-medium uppercase tracking-wider text-indigo-600/90">
                      المرحلة الحالية
                    </p>
                    <p className="mt-1 text-sm font-semibold text-indigo-950">{progress.stageLabel || "—"}</p>
                  </div>
                  <motion.span
                    className="tabular-nums text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-indigo-600 to-purple-600"
                    key={pct}
                    initial={{ opacity: 0.6, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {pct}%
                  </motion.span>
                </div>

                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-l from-indigo-400/25 via-purple-400/20 to-blue-400/25 blur-md opacity-80" />
                  <Progress
                    value={pct}
                    rtl
                    className="relative h-3 bg-gray-100"
                    indicatorClassName="bg-gradient-to-l from-indigo-500 to-purple-500 shadow-sm"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-indigo-900/85">
                    {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-600" />}
                    <span className="text-sm font-medium">الوقت المتبقي (تقديري)</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-indigo-800">
                    {formatEtaArabic(progress.etaSeconds)}
                  </span>
                </div>
              </>
            )}

            {phase === "success" && (
              <p className="text-center text-sm text-muted-foreground">
                يمكنك فتح الملف من مجلد التنزيلات.
              </p>
            )}

            {phase === "error" && (
              <Button
                type="button"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:from-blue-600 hover:to-blue-700"
                onClick={() => onOpenChange(false)}
              >
                إغلاق
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const initialProgress: PptxProgressUpdate = {
  percent: 0,
  stageLabel: "",
  detail: "",
  etaSeconds: null,
}

function useReportFileDownloadProgress(fileKind: ReportFileKind) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [progress, setProgress] = useState<PptxProgressUpdate>(initialProgress)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const download = useCallback(
    async (data: ReportDataForPptx) => {
      setOpen(true)
      setPhase("loading")
      setErrorMessage(null)
      setProgress({ ...initialProgress, stageLabel: "بدء", detail: "جاري التحضير..." })
      try {
        if (fileKind === "pptx") {
          await downloadPptxViaApiWithProgress(data, setProgress)
        } else if (fileKind === "html-pdf") {
          const htmlCallback: HtmlPdfProgressCallback = (update) => {
            setProgress({
              percent: update.percent,
              stageLabel: update.stageLabel,
              detail: update.detail,
              etaSeconds: update.etaSeconds,
            })
          }
          await generateHtmlPdf(data, htmlCallback)
        } else {
          await downloadPdfViaApiWithProgress(data, setProgress)
        }
        setPhase("success")
        await new Promise((r) => setTimeout(r, 1100))
        setOpen(false)
        setPhase("idle")
        setProgress(initialProgress)
      } catch (e) {
        setPhase("error")
        const msg = e instanceof Error ? e.message : "حدث خطأ غير متوقع"
        setErrorMessage(msg.length > 220 ? `${msg.slice(0, 220)}…` : msg)
      }
    },
    [fileKind],
  )

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && phase === "loading") return
      setOpen(next)
      if (!next) {
        setPhase("idle")
        setErrorMessage(null)
        setProgress(initialProgress)
      }
    },
    [phase],
  )

  const dialog = (
    <ReportDownloadProgressDialog
      open={open}
      onOpenChange={handleOpenChange}
      phase={phase}
      progress={progress}
      errorMessage={errorMessage}
      fileKind={fileKind}
    />
  )

  return { download, dialog }
}

export function usePptxDownloadWithProgress() {
  const { download, dialog } = useReportFileDownloadProgress("pptx")
  return { downloadPptx: download, pptxProgressDialog: dialog }
}

export function usePdfDownloadWithProgress() {
  const { download, dialog } = useReportFileDownloadProgress("pdf")
  return { downloadPdf: download, pdfProgressDialog: dialog }
}

export function useHtmlPdfDownloadWithProgress() {
  const { download, dialog } = useReportFileDownloadProgress("html-pdf")
  return { downloadHtmlPdf: download, htmlPdfProgressDialog: dialog }
}
