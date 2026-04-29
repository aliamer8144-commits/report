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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  UserPlus,
  Loader2,
  Calendar,
  Hash,
  FileBarChart,
  Clock,
  Mail,
  Phone,
  User,
  Lock,
  Infinity,
  FileDown,
  AlertTriangle,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"

/* ============================================================
   الأنواع
   ============================================================ */

type LimitType = "none" | "days_count" | "reports_count" | "specific_date"

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supervisorId: string
  onSuccess: () => void
}

interface FormData {
  fullName: string
  username: string
  password: string
  phone: string
  email: string
  limitType: LimitType
  limitDays: string
  limitReports: string
  limitDate: string
  pptxEnabled: boolean
}

interface FormErrors {
  username?: string
  password?: string
  email?: string
  phone?: string
  limitDays?: string
  limitReports?: string
  limitDate?: string
}

/* ============================================================
   حالة النموذج الابتدائية
   ============================================================ */

const initialFormData: FormData = {
  fullName: "",
  username: "",
  password: "",
  phone: "",
  email: "",
  limitType: "none",
  limitDays: "",
  limitReports: "",
  limitDate: "",
  pptxEnabled: true,
}

/* ============================================================
   المكون الرئيسي - حوار إضافة مستخدم جديد
   ============================================================ */

export function AddUserDialog({
  open,
  onOpenChange,
  supervisorId,
  onSuccess,
}: AddUserDialogProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const supabase = createClientSupabaseClient()

  /* ---- مراقبة تغييرات النموذج ---- */
  const updateField = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      // مسح خطأ الحقل عند التعديل
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field as keyof FormErrors]
        return next
      })
    },
    []
  )

  /* ---- إعادة تعيين النموذج ---- */
  const resetForm = useCallback(() => {
    setFormData(initialFormData)
    setErrors({})
    setAlertMessage(null)
  }, [])

  /* ---- التحقق من صحة البيانات ---- */
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    // اسم المستخدم مطلوب
    if (!formData.username.trim()) {
      newErrors.username = "اسم المستخدم مطلوب"
    }

    // كلمة المرور مطلوبة
    if (!formData.password.trim()) {
      newErrors.password = "كلمة المرور مطلوبة"
    } else if (formData.password.length < 4) {
      newErrors.password = "كلمة المرور يجب أن تكون 4 أحرف على الأقل"
    }

    // التحقق من صحة البريد الإلكتروني (اختياري)
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "البريد الإلكتروني غير صالح"
    }

    // التحقق من رقم الهاتف (اختياري)
    if (formData.phone.trim() && !/^[\d\s+()-]{7,20}$/.test(formData.phone.trim())) {
      newErrors.phone = "رقم الهاتف غير صالح"
    }

    // التحقق من الحدود المسموحة
    if (formData.limitType === "days_count") {
      const days = parseInt(formData.limitDays, 10)
      if (!formData.limitDays.trim() || isNaN(days) || days <= 0) {
        newErrors.limitDays = "يرجى إدخال عدد أيام صحيح"
      }
    }

    if (formData.limitType === "reports_count") {
      const reports = parseInt(formData.limitReports, 10)
      if (!formData.limitReports.trim() || isNaN(reports) || reports <= 0) {
        newErrors.limitReports = "يرجى إدخال عدد تقارير صحيح"
      }
    }

    if (formData.limitType === "specific_date") {
      if (!formData.limitDate) {
        newErrors.limitDate = "يرجى اختيار تاريخ"
      } else {
        const selectedDate = new Date(formData.limitDate)
        const now = new Date()
        if (selectedDate <= now) {
          newErrors.limitDate = "التاريخ يجب أن يكون في المستقبل"
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  /* ---- إرسال النموذج ---- */
  const handleSubmit = useCallback(async () => {
    if (!validate()) return

    setLoading(true)
    setAlertMessage(null)

    try {
      // إعداد بيانات المستخدم
      const userData: Record<string, unknown> = {
        username: formData.username.trim(),
        password: formData.password.trim(),
        role: "user",
        supervisor_id: supervisorId,
        is_suspended: false,
        last_unsuspended_at: new Date().toISOString(),
        pptx_enabled: formData.pptxEnabled,
      }

      // حقول اختيارية
      if (formData.fullName.trim()) {
        userData.full_name = formData.fullName.trim()
      }
      if (formData.phone.trim()) {
        userData.phone = formData.phone.trim()
      }
      if (formData.email.trim()) {
        userData.email = formData.email.trim()
      }

      // حقول الحد المسموح (inline)
      if (formData.limitType === "days_count") {
        const days = parseInt(formData.limitDays, 10)
        userData.limit_type = "days"
        userData.limit_value = days
        userData.limit_date = null
      } else if (formData.limitType === "reports_count") {
        const reports = parseInt(formData.limitReports, 10)
        userData.limit_type = "reports"
        userData.limit_value = reports
        userData.limit_date = null
      } else if (formData.limitType === "specific_date") {
        userData.limit_type = "date"
        userData.limit_value = null
        userData.limit_date = new Date(formData.limitDate).toISOString()
      } else {
        userData.limit_type = null
        userData.limit_value = null
        userData.limit_date = null
      }

      // إدخال المستخدم الجديد
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert(userData)
        .select("id")
        .single()

      if (userError) {
        // التعامل مع خطأ تكرار اسم المستخدم
        if (userError.code === "23505") {
          setAlertMessage({
            type: "error",
            text: "اسم المستخدم مستخدم بالفعل. يرجى اختيار اسم آخر.",
          })
        } else {
          throw new Error(userError.message || "حدث خطأ أثناء إنشاء المستخدم")
        }
        return
      }

      // إذا تم تحديد حد مسموح، أضف سجل في user_limits
      if (
        formData.limitType === "days_count" ||
        formData.limitType === "reports_count" ||
        formData.limitType === "specific_date"
      ) {
        const supervisorUserId = localStorage.getItem("user_id")

        const limitRecord: Record<string, unknown> = {
          user_id: newUser.id,
          set_by: supervisorUserId || supervisorId,
          limit_type: formData.limitType,
        }

        if (formData.limitType === "days_count") {
          limitRecord.limit_value = parseInt(formData.limitDays, 10)
          limitRecord.limit_date = null
        } else if (formData.limitType === "reports_count") {
          limitRecord.limit_value = parseInt(formData.limitReports, 10)
          limitRecord.limit_date = null
        } else if (formData.limitType === "specific_date") {
          limitRecord.limit_value = null
          limitRecord.limit_date = new Date(formData.limitDate).toISOString()
        }

        const { error: limitError } = await supabase
          .from("user_limits")
          .insert(limitRecord)

        if (limitError) {
          // لا نمنع إنشاء المستخدم، لكن نسجل الخطأ
          console.error("خطأ في تعيين الحد المسموح:", limitError)
        }
      }

      // نجاح
      setAlertMessage({
        type: "success",
        text: `تم إنشاء المستخدم "${formData.username}" بنجاح!`,
      })

      // استدعاء callback لتحديث القائمة
      setTimeout(() => {
        onSuccess()
        resetForm()
        onOpenChange(false)
      }, 1200)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع"
      setAlertMessage({ type: "error", text: message })
    } finally {
      setLoading(false)
    }
  }, [formData, supervisorId, validate, onSuccess, onOpenChange, resetForm])

  /* ---- إغلاق مع إعادة تعيين ---- */
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        resetForm()
      }
      onOpenChange(isOpen)
    },
    [onOpenChange, resetForm]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        dir="rtl"
        className="bg-white rounded-2xl !shadow-xl max-w-[95vw] sm:max-w-[520px] max-h-[90vh] overflow-y-auto p-0"
      >
        {/* الشريط العلوي المتدرج */}
        <div className="bg-[#007AFF] px-6 py-5 rounded-t-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-white text-xl font-bold flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.1,
                }}
                className="bg-white/20 p-2 rounded-xl backdrop-blur-sm"
              >
                <UserPlus className="h-5 w-5 text-white" />
              </motion.div>
              إضافة مستخدم جديد
            </DialogTitle>
            <DialogDescription className="text-white/70 text-sm mt-1">
              أدخل بيانات المستخدم لإنشاء حساب جديد ضمن إدارتك
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* المحتوى الرئيسي */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="px-6 py-5 space-y-5"
        >
          {/* رسالة التنبيه */}
          <AnimatePresence>
            {alertMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                  alertMessage.type === "success"
                    ? "bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20"
                    : "bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20"
                }`}
              >
                {alertMessage.type === "success" ? "✓" : "✗"}
                {alertMessage.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== قسم البيانات الأساسية ===== */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              البيانات الأساسية
            </h3>

            {/* الاسم الكامل */}
            <div className="space-y-2">
              <Label className="text-gray-700 text-sm font-medium">
                الاسم الكامل <span className="text-gray-400">(اختياري)</span>
              </Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#007AFF]/40 pointer-events-none" />
                <Input
                  value={formData.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="أدخل الاسم الكامل"
                  className="bg-[#f2f2f7] border-0 pr-10 h-11 rounded-xl focus:ring-2 focus:ring-[#007AFF]/30 transition-colors"
                />
              </div>
            </div>

            {/* اسم المستخدم */}
            <div className="space-y-2">
              <Label className="text-gray-700 text-sm font-medium">
                اسم المستخدم <span className="text-[#FF3B30]">*</span>
              </Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#007AFF]/40 pointer-events-none" />
                <Input
                  value={formData.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  className={`bg-[#f2f2f7] border-0 pr-10 h-11 rounded-xl transition-colors ${errors.username ? "ring-2 ring-[#FF3B30]/30" : "focus:ring-2 focus:ring-[#007AFF]/30"}`}
                  autoComplete="off"
                />
              </div>
              {errors.username && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs mt-1"
                >
                  {errors.username}
                </motion.p>
              )}
            </div>

            {/* كلمة المرور */}
            <div className="space-y-2">
              <Label className="text-gray-700 text-sm font-medium">
                كلمة المرور <span className="text-[#FF3B30]">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#007AFF]/40 pointer-events-none" />
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className={`bg-[#f2f2f7] border-0 pr-10 h-11 rounded-xl transition-colors ${errors.password ? "ring-2 ring-[#FF3B30]/30" : "focus:ring-2 focus:ring-[#007AFF]/30"}`}
                  autoComplete="new-password"
                />
              </div>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs mt-1"
                >
                  {errors.password}
                </motion.p>
              )}
            </div>

            {/* رقم الهاتف */}
            <div className="space-y-2">
              <Label className="text-gray-700 text-sm font-medium">
                رقم الهاتف <span className="text-gray-400">(اختياري)</span>
              </Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#007AFF]/40 pointer-events-none" />
                <Input
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+966 5X XXX XXXX"
                  className={`bg-[#f2f2f7] border-0 pr-10 h-11 rounded-xl transition-colors ltr-placeholder ${errors.phone ? "ring-2 ring-[#FF3B30]/30" : "focus:ring-2 focus:ring-[#007AFF]/30"}`}
                  dir="ltr"
                />
              </div>
              {errors.phone && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs mt-1 text-right"
                >
                  {errors.phone}
                </motion.p>
              )}
            </div>

            {/* البريد الإلكتروني */}
            <div className="space-y-2">
              <Label className="text-gray-700 text-sm font-medium">
                البريد الإلكتروني <span className="text-gray-400">(اختياري)</span>
              </Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#007AFF]/40 pointer-events-none" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="example@domain.com"
                  className={`bg-[#f2f2f7] border-0 pr-10 h-11 rounded-xl transition-colors ltr-placeholder ${errors.email ? "ring-2 ring-[#FF3B30]/30" : "focus:ring-2 focus:ring-[#007AFF]/30"}`}
                  dir="ltr"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs mt-1 text-right"
                >
                  {errors.email}
                </motion.p>
              )}
            </div>
          </div>

          {/* ===== فاصل ===== */}
          <Separator className="bg-gray-100" />

          {/* ===== قسم ضبط الحد المسموح ===== */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#007AFF]" />
              ضبط الحد المسموح
            </h3>

            <div className="bg-[#f2f2f7] rounded-xl p-4 space-y-4 border-0">
              {/* نوع الحد */}
              <div className="space-y-2">
                <Label className="text-gray-700 text-sm font-medium">
                  نوع الحد
                </Label>
                <div className="relative">
                  <Select
                    value={formData.limitType}
                    onValueChange={(val) => updateField("limitType", val)}
                  >
                    <SelectTrigger className="bg-[#f2f2f7] border-0 h-11 rounded-xl text-right focus:ring-2 focus:ring-[#007AFF]/30">
                      <SelectValue placeholder="اختر نوع الحد" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-200">
                      <SelectItem value="none" className="rounded-lg m-1">
                        <span className="flex items-center gap-2">
                          <Infinity className="h-3.5 w-3.5 text-gray-400" />
                          بدون حد
                        </span>
                      </SelectItem>
                      <SelectItem value="days_count" className="rounded-lg m-1">
                        <span className="flex items-center gap-2">
                          <Hash className="h-3.5 w-3.5 text-[#007AFF]" />
                          بعدد الأيام
                        </span>
                      </SelectItem>
                      <SelectItem value="reports_count" className="rounded-lg m-1">
                        <span className="flex items-center gap-2">
                          <FileBarChart className="h-3.5 w-3.5 text-[#007AFF]" />
                          بعدد التقارير
                        </span>
                      </SelectItem>
                      <SelectItem value="specific_date" className="rounded-lg m-1">
                        <span className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-[#007AFF]" />
                          إلى تاريخ معين
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* حقول ديناميكية حسب نوع الحد */}
              <AnimatePresence mode="wait">
                {formData.limitType === "days_count" && (
                  <motion.div
                    key="days"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2">
                      <Label className="text-gray-700 text-sm font-medium">
                        عدد الأيام <span className="text-[#FF3B30]">*</span>
                      </Label>
                      <div className="relative">
                        <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#007AFF]/40 pointer-events-none" />
                        <Input
                          type="number"
                          min="1"
                          value={formData.limitDays}
                          onChange={(e) => updateField("limitDays", e.target.value)}
                          placeholder="مثال: 30"
                          className={`bg-[#f2f2f7] border-0 pr-10 h-11 rounded-xl transition-colors ${errors.limitDays ? "ring-2 ring-[#FF3B30]/30" : "focus:ring-2 focus:ring-[#007AFF]/30"}`}
                          dir="ltr"
                        />
                      </div>
                      {errors.limitDays && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 text-right"
                        >
                          {errors.limitDays}
                        </motion.p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        سيتم تعليق المستخدم تلقائياً بعد انتهاء العدد المحدد من الأيام
                      </p>
                    </div>
                  </motion.div>
                )}

                {formData.limitType === "reports_count" && (
                  <motion.div
                    key="reports"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2">
                      <Label className="text-gray-700 text-sm font-medium">
                        عدد التقارير <span className="text-[#FF3B30]">*</span>
                      </Label>
                      <div className="relative">
                        <FileBarChart className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#007AFF]/40 pointer-events-none" />
                        <Input
                          type="number"
                          min="1"
                          value={formData.limitReports}
                          onChange={(e) =>
                            updateField("limitReports", e.target.value)
                          }
                          placeholder="مثال: 100"
                          className={`bg-[#f2f2f7] border-0 pr-10 h-11 rounded-xl transition-colors ${errors.limitReports ? "ring-2 ring-[#FF3B30]/30" : "focus:ring-2 focus:ring-[#007AFF]/30"}`}
                          dir="ltr"
                        />
                      </div>
                      {errors.limitReports && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 text-right"
                        >
                          {errors.limitReports}
                        </motion.p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        سيتم تعليق المستخدم تلقائياً بعد إنشاء العدد المحدد من
                        التقارير
                      </p>
                    </div>
                  </motion.div>
                )}

                {formData.limitType === "specific_date" && (
                  <motion.div
                    key="date"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2">
                      <Label className="text-gray-700 text-sm font-medium">
                        التاريخ المحدد <span className="text-[#FF3B30]">*</span>
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#007AFF]/40 pointer-events-none" />
                        <Input
                          type="datetime-local"
                          value={formData.limitDate}
                          onChange={(e) => updateField("limitDate", e.target.value)}
                          min={
                            new Date(Date.now() + 60 * 1000)
                              .toISOString()
                              .slice(0, 16)
                          }
                          className={`bg-[#f2f2f7] border-0 pr-10 h-11 rounded-xl transition-colors ${errors.limitDate ? "ring-2 ring-[#FF3B30]/30" : "focus:ring-2 focus:ring-[#007AFF]/30"}`}
                          dir="ltr"
                        />
                      </div>
                      {errors.limitDate && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 text-right"
                        >
                          {errors.limitDate}
                        </motion.p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        سيتم تعليق المستخدم تلقائياً عند الوصول إلى هذا التاريخ
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ===== فاصل ===== */}
          <Separator className="bg-gray-100" />

          {/* ===== صلاحية تنزيل PPTX ===== */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <FileDown className="h-4 w-4 text-green-500" />
              صلاحيات التنزيل
            </h3>

            <div className="bg-[#34C759]/5 rounded-xl p-4 space-y-3 border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-[#34C759]/10 p-2 rounded-xl">
                    <FileDown className="h-4 w-4 text-[#34C759]" />
                  </div>
                  <div>
                    <Label className="text-gray-700 text-sm font-medium block">
                      تنزيل PPTX
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      السماح للمستخدم بتنزيل التقارير بصيغة PPTX
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.pptxEnabled}
                  onCheckedChange={(checked) => updateField("pptxEnabled", String(checked))}
                  className="data-[state=checked]:bg-[#34C759]"
                />
              </div>
              {!formData.pptxEnabled && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-[#FF9500] flex items-center gap-1"
                >
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  لن يتمكن المستخدم من رؤية زر تنزيل PPTX في أي مكان
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>

        {/* التذييل / الأزرار */}
        <DialogFooter className="px-6 py-4 bg-gray-50/80 rounded-b-2xl border-t border-gray-100 flex-row gap-3 sm:flex-row-reverse">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !!alertMessage?.text?.includes("نجاح")}
            className="flex-1 sm:flex-none bg-[#007AFF] text-white hover:opacity-95 font-semibold h-11 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed px-6"
          >
            {loading ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الإنشاء...
              </motion.span>
            ) : (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                إنشاء المستخدم
              </motion.span>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
            className="flex-1 sm:flex-none h-11 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-700 transition-colors px-6"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddUserDialog
