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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldOff,
  Clock,
  FileBarChart,
  Calendar,
  User,
} from "lucide-react"

/* ============================================================
   الأنواع
   ============================================================ */

export interface UserToSuspend {
  userId: string
  userName: string
  userFullName?: string
  reason: string
  reasonType: string
  currentValue: number
  limitValue: number
  stats?: {
    periodReportCount: number
    periodTotalDays: number
  }
}

interface AutoSuspendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usersToSuspend: UserToSuspend[]
  onConfirm: () => void
  onDismiss?: () => void
}

/* ============================================================
   أيقونات أنواع التعليق
   ============================================================ */

function getReasonIcon(type: string) {
  switch (type) {
    case "days_count":
      return <Clock className="h-4 w-4 text-amber-500" />
    case "reports_count":
      return <FileBarChart className="h-4 w-4 text-purple-500" />
    case "specific_date":
      return <Calendar className="h-4 w-4 text-blue-500" />
    default:
      return <AlertTriangle className="h-4 w-4 text-red-500" />
  }
}

function getReasonLabel(type: string): string {
  switch (type) {
    case "days_count":
      return "تجاوز الأيام"
    case "reports_count":
      return "تجاوز التقارير"
    case "specific_date":
      return "انتهت الصلاحية"
    default:
      return "تجاوز الحد"
  }
}

/* ============================================================
   المكون الرئيسي
   ============================================================ */

export function AutoSuspendDialog({
  open,
  onOpenChange,
  usersToSuspend,
  onConfirm,
  onDismiss,
}: AutoSuspendDialogProps) {
  const supabase = createClientSupabaseClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [suspendedCount, setSuspendedCount] = useState(0)
  const [failedUsers, setFailedUsers] = useState<string[]>([])

  /* ------ إعادة تعيين ------ */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setSubmitError(null)
        setSubmitSuccess(false)
        setSuspendedCount(0)
        setFailedUsers([])
      }
      onOpenChange(newOpen)
    },
    [onOpenChange]
  )

  /* ------ تنفيذ تعليق الجميع ------ */
  const handleSuspendAll = useCallback(async () => {
    const currentUserId = localStorage.getItem("user_id")
    if (!currentUserId) {
      setSubmitError("لم يتم العثور على معرف المستخدم الحالي.")
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    let successCount = 0
    const failed: string[] = []

    for (const user of usersToSuspend) {
      try {
        // 1. إدخال سجل في user_suspensions
        const record = buildSuspensionRecord(user.userId, currentUserId, user.reason, {
          period_report_count: user.stats?.periodReportCount ?? 0,
          period_total_days: user.stats?.periodTotalDays ?? 0,
        })

        const { error: insertError } = await supabase
          .from("user_suspensions")
          .insert(record)

        if (insertError) throw insertError

        // 2. تحديث حالة المستخدم
        const { error: updateError } = await supabase
          .from("users")
          .update({ is_suspended: true })
          .eq("id", user.userId)

        if (updateError) throw updateError

        successCount++
      } catch (err) {
        console.error(`Failed to suspend ${user.userName}:`, err)
        failed.push(user.userFullName || user.userName)
      }
    }

    setSuspendedCount(successCount)
    setFailedUsers(failed)

    if (successCount > 0) {
      setSubmitSuccess(true)
      setTimeout(() => {
        onConfirm()
        handleOpenChange(false)
      }, 1500)
    } else {
      setSubmitError("لم يتم تعليق أي حساب. حدثت أخطاء في جميع المحاولات.")
    }

    setIsSubmitting(false)
  }, [usersToSuspend, onConfirm, handleOpenChange, supabase])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[500px] p-0 overflow-hidden glass-card border-red-200/50 bg-gradient-to-b from-white to-red-50/20 backdrop-blur-xl"
        dir="rtl"
      >
        {/* رأس الحوار */}
        <div className="relative bg-gradient-to-l from-red-600 to-orange-600 px-6 py-5 text-white">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
          </div>

          <div className="relative">
            <DialogHeader className="text-right space-y-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-3 text-white">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                  className="bg-white/15 p-2 rounded-xl backdrop-blur-sm"
                >
                  <AlertTriangle className="h-5 w-5" />
                </motion.div>
                <span>كشف تجاوز الحدود المسموحة</span>
              </DialogTitle>
              <DialogDescription className="text-red-100 text-sm leading-relaxed">
                تم اكتشاف <span className="font-semibold text-white">{usersToSuspend.length}</span> حساب
                تجاوزت حدودها المسموحة ويحتاج تعليقاً فورياً
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* المحتوى */}
        <div className="px-6 py-5 space-y-4 max-h-[50vh] overflow-y-auto">
          {/* قائمة المستخدمين */}
          <div className="space-y-3">
            {usersToSuspend.map((user, index) => (
              <motion.div
                key={user.userId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className="rounded-xl border border-red-100 bg-gradient-to-l from-red-50 to-orange-50/30 p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-red-100 p-1.5 rounded-lg flex-shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {user.userFullName || user.userName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {getReasonIcon(user.reasonType)}
                      <Badge
                        variant="outline"
                        className="bg-red-100 text-red-700 border-red-200 text-[10px] px-2 py-0.5"
                      >
                        {getReasonLabel(user.reasonType)}
                      </Badge>
                      <span className="text-xs text-gray-500" dir="ltr">
                        {user.currentValue} / {user.limitValue}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
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
                className="space-y-2"
              >
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">
                    تم تعليق {suspendedCount} حساب بنجاح
                  </span>
                </div>
                {failedUsers.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-amber-700">
                      فشل تعليق: {failedUsers.join("، ")}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* التذييل */}
        <DialogFooter className="px-6 pb-6 pt-2 border-t border-gray-100 bg-gray-50/30 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              handleOpenChange(false)
              onDismiss?.()
            }}
            disabled={isSubmitting || submitSuccess}
            className="flex-1 h-11 border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            تخطي
          </Button>
          <Button
            type="button"
            onClick={handleSuspendAll}
            disabled={isSubmitting || submitSuccess}
            className="flex-1 h-11 text-white font-semibold shadow-md transition-all duration-200 bg-gradient-to-l from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-red-300/40"
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
                <span>تعليق الكل ({usersToSuspend.length})</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
