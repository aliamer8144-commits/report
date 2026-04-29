"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createClientSupabaseClient } from "@/lib/supabase"
import { buildSuspensionRecord } from "@/lib/suspension-check"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ShieldOff,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileBarChart,
  Clock,
  MessageSquare,
} from "lucide-react"

/* ============================================================
   الأنواع
   ============================================================ */

interface SuspendUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userFullName: string
  currentStats: {
    periodReportCount: number
    periodTotalDays: number
  }
  onSuccess: () => void
}

/* ============================================================
   المكون الرئيسي
   ============================================================ */

export function SuspendUserDialog({
  open,
  onOpenChange,
  userId,
  userFullName,
  currentStats,
  onSuccess,
}: SuspendUserDialogProps) {
  const supabase = createClientSupabaseClient()

  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  /* ------ إعادة تعيين الحالة عند الفتح ------ */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setReason("")
        setSubmitError(null)
        setSubmitSuccess(false)
      }
      onOpenChange(newOpen)
    },
    [onOpenChange]
  )

  /* ------ تنفيذ التعليق ------ */
  const handleSubmit = useCallback(async () => {
    const currentUserId = localStorage.getItem("user_id")
    if (!currentUserId) {
      setSubmitError("لم يتم العثور على معرف المستخدم الحالي. يرجى تسجيل الدخول.")
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const suspensionReason =
        reason.trim() || "تم تعليق الحساب بواسطة المشرف"

      // 1. إدخال سجل في user_suspensions
      const suspensionRecord = buildSuspensionRecord(userId, currentUserId, suspensionReason, {
        period_report_count: currentStats.periodReportCount,
        period_total_days: currentStats.periodTotalDays,
      })

      const { error: insertError } = await supabase
        .from("user_suspensions")
        .insert(suspensionRecord)

      if (insertError) throw insertError

      // 2. تحديث حالة المستخدم
      const { error: updateError } = await supabase
        .from("users")
        .update({ is_suspended: true })
        .eq("id", userId)

      if (updateError) throw updateError

      // نجاح
      setSubmitSuccess(true)

      setTimeout(() => {
        onSuccess()
        handleOpenChange(false)
      }, 1200)
    } catch (err: any) {
      console.error("Error suspending user:", err)
      setSubmitError(err?.message || "حدث خطأ أثناء تعليق الحساب. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsSubmitting(false)
    }
  }, [userId, reason, currentStats, onSuccess, handleOpenChange, supabase])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[460px] p-0 overflow-hidden glass-card border-red-200/50 bg-gradient-to-b from-white to-red-50/20 backdrop-blur-xl"
        dir="rtl"
      >
        {/* رأس الحوار */}
        <div className="relative bg-gradient-to-l from-red-600 to-red-700 px-6 py-5 text-white">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
          </div>

          <div className="relative">
            <DialogHeader className="text-right space-y-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-3 text-white">
                <div className="bg-white/15 p-2 rounded-xl backdrop-blur-sm">
                  <ShieldOff className="h-5 w-5" />
                </div>
                <span>تعليق حساب المستخدم</span>
              </DialogTitle>
              <DialogDescription className="text-red-100 text-sm leading-relaxed">
                أنت على وشك تعليق حساب{" "}
                <span className="font-semibold text-white">{userFullName}</span>
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* المحتوى */}
        <div className="px-6 py-5 space-y-4 max-h-[55vh] overflow-y-auto">
          {/* تحذير */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-amber-200/60 bg-gradient-to-l from-amber-50 to-orange-50/50 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-800">
                  تنبيه مهم
                </p>
                <p className="text-xs text-amber-700/80 leading-relaxed">
                  بعد تعليق الحساب لن يتمكن المستخدم من تسجيل الدخول أو إنشاء تقارير حتى يتم إلغاء التعليق.
                </p>
              </div>
            </div>
          </motion.div>

          {/* الإحصائيات الحالية */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <FileBarChart className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-blue-600">التقارير</p>
                <p className="text-lg font-bold text-blue-700">
                  {currentStats.periodReportCount}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-amber-600">الأيام</p>
                <p className="text-lg font-bold text-amber-700">
                  {currentStats.periodTotalDays}
                </p>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-100" />

          {/* سبب التعليق */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              سبب التعليق <span className="text-gray-400 font-normal">(اختياري)</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="أدخل سبب التعليق..."
              className="border-gray-200 focus:border-red-300 bg-white/70 min-h-[80px] rounded-xl resize-none transition-colors"
              dir="rtl"
            />
            {!reason.trim() && (
              <p className="text-xs text-gray-400">
                إذا لم تُدخل سبباً، سيتم استخدام السبب الافتراضي
              </p>
            )}
          </div>

          {/* رسائل النتائج */}
          <AnimatePresence>
            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
              >
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700">{submitError}</span>
              </motion.div>
            )}

            {submitSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.1 }}
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </motion.div>
                <span className="text-sm font-medium text-emerald-700">
                  تم تعليق الحساب بنجاح
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* التذييل */}
        <DialogFooter className="px-6 pb-6 pt-2 border-t border-gray-100 bg-gray-50/30 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting || submitSuccess}
            className="flex-1 h-11 border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || submitSuccess}
            className="flex-1 h-11 text-white font-semibold shadow-md transition-all duration-200 bg-gradient-to-l from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-300/40"
          >
            {isSubmitting ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري التعليق...</span>
              </motion.div>
            ) : submitSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>تم بنجاح</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-2">
                <ShieldOff className="h-4 w-4" />
                <span>تعليق الحساب</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
