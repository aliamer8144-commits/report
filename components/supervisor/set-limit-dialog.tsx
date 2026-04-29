"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Loader2,
  Calendar,
  Hash,
  FileBarChart,
  Clock,
  Info,
  ShieldOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"

/* ============================================================
   أنواع البيانات
   ============================================================ */

/** نوع قيمة النموذج لنوع الحد */
type LimitTypeFormValue = "days_count" | "reports_count" | "specific_date" | "none"

/** قيم limit_type في جدول users (inline fields) */
type UserLimitType = "days" | "reports" | "date" | null

/** قيم limit_type في جدول user_limits (سجل كامل) */
type UserLimitsTableType = "days_count" | "reports_count" | "specific_date"

/** بيانات الحد الحالي المعروضة */
interface CurrentLimitInfo {
  type: UserLimitType
  typeLabel: string
  value: string
  setByName: string | null
  createdAt: string | null
}

/** خصائص المكون */
interface SetLimitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userFullName: string
  currentLimitType: string | null
  onSuccess: () => void
}

/* ============================================================
   خريطة التسميات والأيقونات
   ============================================================ */

const LIMIT_TYPE_OPTIONS: {
  value: LimitTypeFormValue
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    value: "days_count",
    label: "بعدد الأيام",
    description: "تحديد عدد الأيام المسموح للعمل",
    icon: <Clock className="h-4 w-4 text-indigo-500" />,
  },
  {
    value: "reports_count",
    label: "بعدد التقارير",
    description: "تحديد الحد الأقصى لعدد التقارير",
    icon: <FileBarChart className="h-4 w-4 text-purple-500" />,
  },
  {
    value: "specific_date",
    label: "إلى تاريخ معين",
    description: "تحديد تاريخ انتهاء محدد",
    icon: <Calendar className="h-4 w-4 text-blue-500" />,
  },
  {
    value: "none",
    label: "بدون حد",
    description: "إزالة الحد المسموح الحالي",
    icon: <ShieldOff className="h-4 w-4 text-amber-500" />,
  },
]

/** تحويل قيمة limit_type من جدول users إلى قيمة النموذج */
function mapUserLimitTypeToForm(type: string | null): LimitTypeFormValue {
  switch (type) {
    case "days":
      return "days_count"
    case "reports":
      return "reports_count"
    case "date":
      return "specific_date"
    default:
      return "none"
  }
}

/** تحويل قيمة النموذج إلى قيمة limit_type لجدول users */
function mapFormToUserLimitType(formValue: LimitTypeFormValue): UserLimitType {
  switch (formValue) {
    case "days_count":
      return "days"
    case "reports_count":
      return "reports"
    case "specific_date":
      return "date"
    case "none":
      return null
  }
}

/** تحويل قيمة النموذج إلى قيمة limit_type لجدول user_limits */
function mapFormToUserLimitsTableType(
  formValue: LimitTypeFormValue
): UserLimitsTableType | null {
  switch (formValue) {
    case "days_count":
      return "days_count"
    case "reports_count":
      return "reports_count"
    case "specific_date":
      return "specific_date"
    case "none":
      return null
  }
}

/** تحويل قيمة limit_type إلى تسمية عربية */
function getLimitTypeLabel(type: string | null): string {
  switch (type) {
    case "days":
    case "days_count":
      return "بعدد الأيام"
    case "reports":
    case "reports_count":
      return "بعدد التقارير"
    case "date":
    case "specific_date":
      return "إلى تاريخ معين"
    default:
      return "غير محدد"
  }
}

/** تنسيق التاريخ */
function formatDate(dateStr: string): string {
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

/** تنسيق التاريخ فقط (بدون وقت) */
function formatDateOnly(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}

/* ============================================================
   المكون الرئيسي
   ============================================================ */

export default function SetLimitDialog({
  open,
  onOpenChange,
  userId,
  userFullName,
  currentLimitType,
  onSuccess,
}: SetLimitDialogProps) {
  const supabase = createClientSupabaseClient()

  // حالة النموذج
  const [selectedType, setSelectedType] = useState<LimitTypeFormValue>("none")
  const [daysValue, setDaysValue] = useState<string>("")
  const [reportsValue, setReportsValue] = useState<string>("")
  const [dateValue, setDateValue] = useState<string>("")

  // حالة التحميل والنتائج
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [currentLimitInfo, setCurrentLimitInfo] = useState<CurrentLimitInfo | null>(null)
  const [isLoadingCurrentLimit, setIsLoadingCurrentLimit] = useState(false)

  // تحقق من صحة النموذج
  const [validationError, setValidationError] = useState<string | null>(null)

  /* ------ تحميل بيانات الحد الحالي عند فتح الحوار ------ */
  useEffect(() => {
    if (!open || !userId) return

    const fetchCurrentLimit = async () => {
      setIsLoadingCurrentLimit(true)
      try {
        // جلب بيانات المستخدم (inline limit fields)
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("limit_type, limit_value, limit_date")
          .eq("id", userId)
          .single()

        if (userError) throw userError

        if (userData.limit_type) {
          // جلب آخر سجل من user_limits لمعرفة من قام بالتحديد ومتى
          const { data: limitRecords, error: limitsError } = await supabase
            .from("user_limits")
            .select("set_by, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)

          if (limitsError) throw limitsError

          let setByName: string | null = null
          let createdAt: string | null = null

          if (limitRecords && limitRecords.length > 0) {
            createdAt = limitRecords[0].created_at

            // جلب اسم من قام بالتحديد
            if (limitRecords[0].set_by) {
              const { data: setterData } = await supabase
                .from("users")
                .select("full_name, username")
                .eq("id", limitRecords[0].set_by)
                .single()

              setByName = setterData?.full_name || setterData?.username || null
            }
          }

          // بناء قيمة العرض
          let displayValue = ""
          if (userData.limit_type === "days" && userData.limit_value) {
            displayValue = `${userData.limit_value} يوم`
          } else if (userData.limit_type === "reports" && userData.limit_value) {
            displayValue = `${userData.limit_value} تقرير`
          } else if (userData.limit_type === "date" && userData.limit_date) {
            displayValue = formatDateOnly(userData.limit_date)
          }

          setCurrentLimitInfo({
            type: userData.limit_type as UserLimitType,
            typeLabel: getLimitTypeLabel(userData.limit_type),
            value: displayValue,
            setByName,
            createdAt,
          })
        } else {
          setCurrentLimitInfo(null)
        }

        // تحديد القيمة الافتراضية لنوع الحد
        setSelectedType(mapUserLimitTypeToForm(userData.limit_type))
      } catch (err: any) {
        console.error("Error fetching current limit:", err)
        setCurrentLimitInfo(null)
        setSelectedType(currentLimitType ? mapUserLimitTypeToForm(currentLimitType) : "none")
      } finally {
        setIsLoadingCurrentLimit(false)
      }
    }

    // إعادة تعيين حالة النموذج
    setSubmitError(null)
    setSubmitSuccess(false)
    setValidationError(null)
    setDaysValue("")
    setReportsValue("")
    setDateValue("")

    fetchCurrentLimit()
  }, [open, userId, currentLimitType])

  /* ------ التحقق من صحة النموذج ------ */
  const validate = useCallback((): boolean => {
    if (selectedType === "days_count") {
      const days = parseInt(daysValue, 10)
      if (!daysValue || isNaN(days) || days < 1) {
        setValidationError("يرجى إدخال عدد الأيام (على الأقل 1)")
        return false
      }
      if (days > 3650) {
        setValidationError("الحد الأقصى لعدد الأيام هو 3650 يوم (10 سنوات)")
        return false
      }
    } else if (selectedType === "reports_count") {
      const reports = parseInt(reportsValue, 10)
      if (!reportsValue || isNaN(reports) || reports < 1) {
        setValidationError("يرجى إدخال عدد التقارير (على الأقل 1)")
        return false
      }
      if (reports > 10000) {
        setValidationError("الحد الأقصى لعدد التقارير هو 10000")
        return false
      }
    } else if (selectedType === "specific_date") {
      if (!dateValue) {
        setValidationError("يرجى تحديد تاريخ الانتهاء")
        return false
      }
      const selectedDate = new Date(dateValue)
      const now = new Date()
      if (selectedDate <= now) {
        setValidationError("تاريخ الانتهاء يجب أن يكون في المستقبل")
        return false
      }
    }

    setValidationError(null)
    return true
  }, [selectedType, daysValue, reportsValue, dateValue])

  /* ------ إرسال النموذج ------ */
  const handleSubmit = async () => {
    if (!validate()) return

    const currentUserId = localStorage.getItem("user_id")
    if (!currentUserId) {
      setSubmitError("لم يتم العثور على معرف المستخدم الحالي. يرجى تسجيل الدخول مرة أخرى.")
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      if (selectedType === "none") {
        // ---- إزالة الحد ----

        // تحديث حقول inline في جدول users
        const { error: updateError } = await supabase
          .from("users")
          .update({
            limit_type: null,
            limit_value: null,
            limit_date: null,
          })
          .eq("id", userId)

        if (updateError) throw updateError

        // تسجيل في سجل user_limits كإزالة (نوع خاص: 'none' لا يُخزن، لكن نُسجّل نشاطاً)
        // ملاحظة: جدول user_limits لديه قيد CHECK يسمح فقط بـ days_count/reports_count/specific_date
        // لذا لا يمكننا إدخال 'none' فيه. سنقوم فقط بتحديث users.

      } else {
        // ---- تعيين حد جديد ----

        const userLimitType = mapFormToUserLimitType(selectedType)!
        const limitsTableType = mapFormToUserLimitsTableType(selectedType)!

        let limitValue: number | null = null
        let limitDate: string | null = null

        if (selectedType === "days_count") {
          limitValue = parseInt(daysValue, 10)
        } else if (selectedType === "reports_count") {
          limitValue = parseInt(reportsValue, 10)
        } else if (selectedType === "specific_date") {
          limitDate = new Date(dateValue).toISOString()
        }

        // إدخال سجل في user_limits (السجل الكامل)
        const { error: insertError } = await supabase
          .from("user_limits")
          .insert({
            user_id: userId,
            set_by: currentUserId,
            limit_type: limitsTableType,
            limit_value: limitValue,
            limit_date: limitDate,
          })

        if (insertError) throw insertError

        // تحديث حقول inline في جدول users
        const { error: updateError } = await supabase
          .from("users")
          .update({
            limit_type: userLimitType,
            limit_value: limitValue,
            limit_date: limitDate,
          })
          .eq("id", userId)

        if (updateError) throw updateError
      }

      // نجاح
      setSubmitSuccess(true)

      // استدعاء دالة التحديث بعد فترة قصيرة
      setTimeout(() => {
        onSuccess()
        onOpenChange(false)
      }, 1200)
    } catch (err: any) {
      console.error("Error setting limit:", err)
      setSubmitError(
        err?.message || "حدث خطأ أثناء حفظ إعدادات الحد. يرجى المحاولة مرة أخرى."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ------ إغلاق الحوار مع إعادة التعيين ------ */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSubmitError(null)
      setSubmitSuccess(false)
      setValidationError(null)
      setDaysValue("")
      setReportsValue("")
      setDateValue("")
    }
    onOpenChange(newOpen)
  }

  /* ------ القيمة الدنيا لتاريخ datetime-local (الآن) ------ */
  const getMinDateTime = (): string => {
    const now = new Date()
    // تعديل التوقيت لتكون +3 ساعات (توقيت الرياض)
    const offset = now.getTimezoneOffset()
    const local = new Date(now.getTime() - offset * 60 * 1000)
    // إضافة ساعة واحدة كحد أدنى لتجنب مشاكل التوقيت
    local.setHours(local.getHours() + 1)
    local.setMinutes(0, 0, 0)
    return local.toISOString().slice(0, 16)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] p-0 overflow-hidden glass-card border-indigo-200/50 bg-gradient-to-b from-white to-indigo-50/30 backdrop-blur-xl"
        dir="rtl"
      >
        {/* رأس الحوار مع تدرج الخلفية */}
        <div className="relative bg-gradient-to-l from-indigo-600 to-purple-600 px-6 py-5 text-white">
          {/* زخرفة الخلفية */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-white/[0.02] rounded-full" />
          </div>

          <div className="relative">
            <DialogHeader className="text-right space-y-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-3 text-white">
                <div className="bg-white/15 p-2 rounded-xl backdrop-blur-sm">
                  <Settings className="h-5 w-5" />
                </div>
                <span>تحديد حد مسموح</span>
              </DialogTitle>
              <DialogDescription className="text-indigo-100 text-sm leading-relaxed">
                تحديد وتعديل الحد المسموح للمستخدم{" "}
                <span className="font-semibold text-white">{userFullName}</span>
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* ===== معلومات الحد الحالي ===== */}
          <AnimatePresence>
            {isLoadingCurrentLimit && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center py-3"
              >
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                <span className="mr-2 text-sm text-gray-500">جاري تحميل بيانات الحد...</span>
              </motion.div>
            )}

            {!isLoadingCurrentLimit && currentLimitInfo && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="rounded-xl border border-indigo-200/60 bg-gradient-to-l from-indigo-50 to-purple-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-800">الحد المسموح الحالي</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs text-gray-500">نوع الحد</span>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs"
                        >
                          {currentLimitInfo.typeLabel}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-gray-500">القيمة</span>
                      <span className="text-sm font-medium text-gray-800">
                        {currentLimitInfo.value}
                      </span>
                    </div>

                    {currentLimitInfo.setByName && (
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500">تم التحديد بواسطة</span>
                        <span className="text-sm font-medium text-gray-800">
                          {currentLimitInfo.setByName}
                        </span>
                      </div>
                    )}

                    {currentLimitInfo.createdAt && (
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500">تاريخ التحديد</span>
                        <span className="text-sm text-gray-600">
                          {formatDate(currentLimitInfo.createdAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {!isLoadingCurrentLimit && !currentLimitInfo && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-l from-emerald-50 to-green-50/50 p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-emerald-700">
                    لا يوجد حد مسموح حالياً لهذا المستخدم
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Separator className="bg-indigo-100" />

          {/* ===== اختيار نوع الحد ===== */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Settings className="h-4 w-4 text-indigo-600" />
              نوع الحد
            </Label>

            <RadioGroup
              value={selectedType}
              onValueChange={(val) => {
                setSelectedType(val as LimitTypeFormValue)
                setValidationError(null)
              }}
              className="grid gap-2"
            >
              {LIMIT_TYPE_OPTIONS.map((option) => (
                <motion.div
                  key={option.value}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <label
                    className={`
                      relative flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer
                      transition-all duration-200
                      ${
                        selectedType === option.value
                          ? option.value === "none"
                            ? "border-amber-400 bg-amber-50/80 shadow-sm shadow-amber-200/50"
                            : "border-indigo-400 bg-indigo-50/80 shadow-sm shadow-indigo-200/50"
                          : "border-gray-200 bg-white/70 hover:border-gray-300 hover:bg-gray-50/50"
                      }
                    `}
                    htmlFor={`limit-type-${option.value}`}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`limit-type-${option.value}`}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {option.icon}
                        <span
                          className={`text-sm font-semibold ${
                            selectedType === option.value
                              ? option.value === "none"
                                ? "text-amber-800"
                                : "text-indigo-800"
                              : "text-gray-700"
                          }`}
                        >
                          {option.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 leading-relaxed">
                        {option.description}
                      </span>
                    </div>
                  </label>
                </motion.div>
              ))}
            </RadioGroup>
          </div>

          {/* ===== الحقل الديناميكي بناءً على النوع المختار ===== */}
          <AnimatePresence mode="wait">
            {selectedType === "days_count" && (
              <motion.div
                key="days-count"
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: 10 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="days-input"
                    className="text-sm font-semibold text-gray-800 flex items-center gap-2"
                  >
                    <Hash className="h-4 w-4 text-indigo-500" />
                    عدد الأيام المسموح
                  </Label>
                  <div className="relative">
                    <Input
                      id="days-input"
                      type="number"
                      min={1}
                      max={3650}
                      value={daysValue}
                      onChange={(e) => {
                        setDaysValue(e.target.value)
                        setValidationError(null)
                      }}
                      placeholder="مثال: 30"
                      className="pr-10 pl-4 border-indigo-200 focus:border-indigo-500 bg-white/80 text-right h-11"
                      dir="ltr"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                      يوم
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    الحد الأدنى: 1 يوم — الحد الأقصى: 3650 يوم (10 سنوات)
                  </p>
                </div>
              </motion.div>
            )}

            {selectedType === "reports_count" && (
              <motion.div
                key="reports-count"
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: 10 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="reports-input"
                    className="text-sm font-semibold text-gray-800 flex items-center gap-2"
                  >
                    <FileBarChart className="h-4 w-4 text-purple-500" />
                    عدد التقارير المسموح
                  </Label>
                  <div className="relative">
                    <Input
                      id="reports-input"
                      type="number"
                      min={1}
                      max={10000}
                      value={reportsValue}
                      onChange={(e) => {
                        setReportsValue(e.target.value)
                        setValidationError(null)
                      }}
                      placeholder="مثال: 50"
                      className="pr-10 pl-4 border-indigo-200 focus:border-indigo-500 bg-white/80 text-right h-11"
                      dir="ltr"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                      تقرير
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    الحد الأدنى: 1 تقرير — الحد الأقصى: 10000 تقرير
                  </p>
                </div>
              </motion.div>
            )}

            {selectedType === "specific_date" && (
              <motion.div
                key="specific-date"
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: 10 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="date-input"
                    className="text-sm font-semibold text-gray-800 flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4 text-blue-500" />
                    تاريخ الانتهاء
                  </Label>
                  <div className="relative">
                    <Input
                      id="date-input"
                      type="datetime-local"
                      min={getMinDateTime()}
                      value={dateValue}
                      onChange={(e) => {
                        setDateValue(e.target.value)
                        setValidationError(null)
                      }}
                      className="pr-10 pl-4 border-indigo-200 focus:border-indigo-500 bg-white/80 h-11"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    يجب أن يكون التاريخ في المستقبل
                  </p>
                </div>
              </motion.div>
            )}

            {selectedType === "none" && (
              <motion.div
                key="none"
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: 10 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-amber-300/60 bg-gradient-to-l from-amber-50 to-orange-50/50 p-4 flex items-start gap-3">
                  <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0 mt-0.5">
                    <ShieldOff className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 mb-1">
                      إزالة الحد المسموح
                    </p>
                    <p className="text-xs text-amber-700/80 leading-relaxed">
                      سيتم إزالة الحد المسموح الحالي وسيتمكن المستخدم من إنشاء تقارير بدون قيود.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== رسائل الخطأ والنجاح ===== */}
          <AnimatePresence>
            {validationError && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
              >
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700">{validationError}</span>
              </motion.div>
            )}

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
                  {selectedType === "none"
                    ? "تم إزالة الحد المسموح بنجاح"
                    : "تم تحديد الحد المسموح بنجاح"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== التذييل ===== */}
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
            className={`
              flex-1 h-11 text-white font-semibold shadow-md transition-all duration-200
              ${
                selectedType === "none"
                  ? "bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-300/40"
                  : "bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-300/40"
              }
            `}
          >
            {isSubmitting ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري الحفظ...</span>
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
            ) : selectedType === "none" ? (
              <div className="flex items-center gap-2">
                <ShieldOff className="h-4 w-4" />
                <span>إزالة الحد</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>تطبيق الحد</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
