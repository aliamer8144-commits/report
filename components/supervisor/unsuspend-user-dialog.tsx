"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createClientSupabaseClient } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  Calendar,
  MessageSquare,
  AlertCircle,
} from "lucide-react"

/* ============================================================
   الأنواع
   ============================================================ */

interface UnsuspendUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userFullName: string
  suspensionInfo: {
    suspendedAt: string | null
    reason: string | null
    daysCount: number | null
    reportsCount: number | null
  } | null
  onSuccess: () => void
}

/* ============================================================
   مساعدات
   ============================================================ */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

/* ============================================================
   المكون الرئيسي
   ============================================================ */

export function UnsuspendUserDialog({
  open,
  onOpenChange,
  userId,
  userFullName,
  suspensionInfo,
  onSuccess,
}: UnsuspendUserDialogProps) {
  const supabase = createClientSupabaseClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  /* ------ إعادة تعيين الحالة ------ */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setSubmitError(null)
        setSubmitSuccess(false)
      }
      onOpenChange(newOpen)
    },
    [onOpenChange]
  )

  /* ------ تنفيذ إلغاء التعليق ------ */
  const handleSubmit = useCallback(async () => {
    const currentUserId = localStorage.getItem("user_id")
    if (!currentUserId) {
      setSubmitError("لم يتم العثور على معرف المستخدم الحالي. يرجى تسجيل الدخول.")
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // 1. تحديث آخر سجل تعليق نشط (إلغاء التعليق)
      const { data: activeSuspension, error: fetchError } = await supabase
        .from("user_suspensions")
        .select("id")
        .eq("user_id", userId)
        .is("reactivated_at", null)
        .order("suspended_at", { ascending: false })
        .limit(1)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError
      }

      if (activeSuspension) {
        const { error: updateSuspError } = await supabase
          .from("user_suspensions")
          .update({
            reactivated_at: new Date().toISOString(),
            reactivated_by: currentUserId,
          })
          .eq("id", activeSuspension.id)

        if (updateSuspError) throw updateSuspError
      }

      // 2. تحديث حالة المستخدم
      const { error: updateUserError } = await supabase
        .from("users")
        .update({
          is_suspended: false,
          last_unsuspended_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (updateUserError) throw updateUserError

      // نجاح
      setSubmitSuccess(true)

      setTimeout(() => {
        onSuccess()
        handleOpenChange(false)
      }, 1200)
    } catch (err: any) {
      console.error("Error unsuspending user:", err)
      setSubmitError(err?.message || "حدث خطأ أثناء إلغاء التعليق. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsSubmitting(false)
    }
  }, [userId, onSuccess, handleOpenChange, supabase])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[460px] p-0 overflow-hidden glass-card border-emerald-200/50 bg-gradient-to-b from-white to-emerald-50/20 backdrop-blur-xl"
        dir="rtl"
      >
        {/* رأس الحوار */}
        <div className="relative bg-gradient-to-l from-emerald-600 to-emerald-700 px-6 py-5 text-white">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
          </div>

          <div className="relative">
            <DialogHeader className="text-right space-y-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-3 text-white">
                <div className="bg-white/15 p-2 rounded-xl backdrop-blur-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span>إلغاء تعليق الحساب</span>
              </DialogTitle>
              <DialogDescription className="text-emerald-100 text-sm leading-relaxed">
                إعادة تفعيل حساب{" "}
                <span className="font-semibold text-white">{userFullName}</span>
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* المحتوى */}
        <div className="px-6 py-5 space-y-4">
          {/* رسالة نجاح مسبقة */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-emerald-200/60 bg-gradient-to-l from-emerald-50 to-green-50/50 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg flex-shrink-0 mt-0.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-800">
                  إعادة تفعيل الحساب
                </p>
                <p className="text-xs text-emerald-700/80 leading-relaxed">
                  بعد إلغاء التعليق، سيتمكن المستخدم من تسجيل الدخول وإنشاء تقارير جديدة.
                  سيتم إعادة تعيين عداد الأيام والتقارير من هذه اللحظة.
                </p>
              </div>
            </div>
          </motion.div>

          {/* معلومات التعليق الحالي */}
          {suspensionInfo && (
            <>
              <Separator className="bg-gray-100" />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-gray-500" />
                  تفاصيل التعليق الحالي
                </h3>

                <div className="grid grid-cols-1 gap-2">
                  {/* سبب التعليق */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">السبب</p>
                      <p className="text-sm text-gray-700">
                        {suspensionInfo.reason || "غير محدد"}
                      </p>
                    </div>
                  </div>

                  {/* تاريخ التعليق */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">تاريخ التعليق</p>
                      <p className="text-sm text-gray-700">
                        {formatDate(suspensionInfo.suspendedAt)}
                      </p>
                    </div>
                  </div>

                  {/* إحصائيات عند التعليق */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <span className="text-xs text-blue-500">تقارير:</span>
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-700 border-blue-200 text-xs"
                      >
                        {suspensionInfo.reportsCount ?? 0}
                      </Badge>
                    </div>
                    <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <span className="text-xs text-amber-500">أيام:</span>
                      <Badge
                        variant="outline"
                        className="bg-amber-100 text-amber-700 border-amber-200 text-xs"
                      >
                        {suspensionInfo.daysCount ?? 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

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
                  تم إلغاء التعليق وإعادة تفعيل الحساب بنجاح
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
            رجوع
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || submitSuccess}
            className="flex-1 h-11 text-white font-semibold shadow-md transition-all duration-200 bg-gradient-to-l from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-300/40"
          >
            {isSubmitting ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري التفعيل...</span>
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
                <ShieldCheck className="h-4 w-4" />
                <span>إلغاء التعليق</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
