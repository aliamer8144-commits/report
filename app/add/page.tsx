"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import { addActivity } from "@/lib/activities-service"
import { checkSuspension, buildSuspensionRecord } from "@/lib/suspension-check"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { PageHeader } from "@/components/ui-custom/page-header"
import { BackButton } from "@/components/ui-custom/back-button"
import {
  PlusCircle,
  Download,
  RefreshCw,
  Calendar,
  User,
  Hash,
  Clock,
  Flag,
  FileText,
  Building,
  UserCheck,
  Loader2,
  Save,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldOff,
  AlertTriangle,
} from "lucide-react"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { usePptxDownloadWithProgress, usePdfDownloadWithProgress } from "@/components/ui-custom/pptx-download-progress"
import { toHijri } from "hijri-date-converter"
import { invalidateArToEnSeq, scheduleArToEnSync } from "@/lib/auto-translate-ar-en"

interface ReportFormFields {
  service_code: string
  id_number: string
  name_ar: string
  name_en: string
  days_count: string
  entry_date_gregorian: string
  exit_date_gregorian: string
  entry_date_hijri: string
  exit_date_hijri: string
  report_issue_date: string
  nationality_ar: string
  nationality_en: string
  doctor_name_ar: string
  doctor_name_en: string
  job_title_ar: string
  job_title_en: string
  hospital_name_ar: string
  hospital_name_en: string
  print_date: string
  print_time: string
}

// دالة لتحويل التاريخ الميلادي إلى هجري
const convertToHijri = (gregorianDate: string): string => {
  if (!gregorianDate) return ""
  try {
    const date = new Date(gregorianDate)
    const hijriDate = toHijri(date)
    // تنسيق التاريخ بصيغة DD-MM-YYYY
    const day = String(hijriDate.day).padStart(2, "0")
    const month = String(hijriDate.month).padStart(2, "0")
    const year = hijriDate.year
    return `${day}-${month}-${year}`
  } catch (error) {
    console.error("Error converting to Hijri:", error)
    return ""
  }
}

const AR_EN_FIELD_PAIRS: { ar: keyof ReportFormFields; en: keyof ReportFormFields; mode: "translate" | "transliterate" }[] = [
  { ar: "name_ar", en: "name_en", mode: "transliterate" },
  { ar: "nationality_ar", en: "nationality_en", mode: "translate" },
  { ar: "doctor_name_ar", en: "doctor_name_en", mode: "transliterate" },
  { ar: "job_title_ar", en: "job_title_en", mode: "translate" },
  { ar: "hospital_name_ar", en: "hospital_name_en", mode: "translate" },
]

const FormField = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  readOnly = false,
  icon: Icon,
  hint,
  inputClassName,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  required?: boolean
  readOnly?: boolean
  icon?: React.ElementType
  hint?: string
  inputClassName?: string
}) => (
  <motion.div className="space-y-2 text-right" variants={{
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
  }}>
    <Label htmlFor={name} className="text-indigo-900 flex items-center gap-1.5 justify-end flex-row-reverse w-full">
      {Icon && <Icon className="h-4 w-4 text-indigo-600" />}
      {label}
      {required && <span className="text-red-500">*</span>}
    </Label>
    <div className="relative">
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        className={`text-right border-indigo-200 focus:border-indigo-400 ${readOnly ? "bg-gray-50" : ""} ${inputClassName || ""}`}
      />
    </div>
    {hint && <p className="text-xs text-muted-foreground text-right">{hint}</p>}
  </motion.div>
)

export default function AddReportPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<ReportFormFields>({
    service_code: "",
    id_number: "",
    name_ar: "",
    name_en: "",
    days_count: "",
    entry_date_gregorian: "",
    exit_date_gregorian: "",
    entry_date_hijri: "",
    exit_date_hijri: "",
    report_issue_date: "",
    nationality_ar: "السعودية",
    nationality_en: "Saudi Arabia",
    doctor_name_ar: "",
    doctor_name_en: "",
    job_title_ar: "طبيب",
    job_title_en: "Doctor",
    hospital_name_ar: "",
    hospital_name_en: "",
    print_date: "",
    print_time: "",
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuspended, setIsSuspended] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState<string | null>(null)
  const [isCheckingSuspension, setIsCheckingSuspension] = useState(true)
  // إضافة متغير حالة للتبويب النشط
  const [activeTab, setActiveTab] = useState("basic")
  const translateSeqRef = useRef<Record<string, number>>({})
  const { downloadPptx, pptxProgressDialog } = usePptxDownloadWithProgress()
  const { downloadPdf, pdfProgressDialog } = usePdfDownloadWithProgress()
  const supabase = createClientSupabaseClient()
  const [pptxEnabled, setPptxEnabled] = useState(true)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)

  // دالة توليد 11 رقم عشوائي
  const generateRandomDigits = (length: number): string => {
    let result = ''
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10).toString()
    }
    return result
  }

  // دالة توليد رمز خدمة فريد (PSL + 11 رقم)
  const generateUniqueServiceCode = async (): Promise<string> => {
    const maxAttempts = 10
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = 'PSL' + generateRandomDigits(11)
      // التحقق من عدم وجود الرمز في قاعدة البيانات
      const { data, error } = await supabase
        .from('reports')
        .select('id')
        .eq('service_code', code)
        .limit(1)

      if (error || !data || data.length === 0) {
        return code // الرمز فريد
      }
    }
    // في حال نادر عدم إيجاد رمز فريد، نُرجع رمز مع طابع زمني
    return 'PSL' + Date.now().toString().slice(-11)
  }

  // تحميل رمز خدمة تلقائي
  const loadServiceCode = async () => {
    setIsGeneratingCode(true)
    try {
      const code = await generateUniqueServiceCode()
      setFormData(prev => ({ ...prev, service_code: code }))
    } catch (err) {
      console.error('Error generating service code:', err)
    }
    setIsGeneratingCode(false)
  }

  const tabs = ["basic", "dates", "additional"]
  const tabLabels = {
    basic: "البيانات الأساسية",
    dates: "التواريخ",
    additional: "بيانات إضافية",
  }

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        if (!res.ok) {
          router.push("/")
          return
        }
        const { user } = await res.json()

    // التحقق من حالة التعليق
    const checkUserSuspension = async () => {
      try {
        const supabase = createClientSupabaseClient()
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("is_suspended, id")
          .eq("id", user.id)
          .single()

        if (userError) {
          console.error("Error checking suspension:", userError)
          setIsCheckingSuspension(false)
          return
        }

        if (userData?.is_suspended) {
          // جلب سبب التعليق
          const { data: suspensionData } = await supabase
            .from("user_suspensions")
            .select("suspension_reason")
            .eq("user_id", user.id)
            .is("reactivated_at", null)
            .order("suspended_at", { ascending: false })
            .limit(1)
            .single()

          setIsSuspended(true)
          setSuspensionReason(suspensionData?.suspension_reason || "تم تعليق هذا الحساب")
        }
      } catch (err) {
        console.error("Error checking suspension:", err)
      } finally {
        setIsCheckingSuspension(false)
      }
    }

    // جلب صلاحية PPTX للمستخدم
    supabase
      .from("users")
      .select("pptx_enabled")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setPptxEnabled(data.pptx_enabled !== false)
      })
      .catch(() => {})

    checkUserSuspension()

    // تعيين التاريخ والوقت الحاليين
    const now = new Date()
    const today = now.toISOString().split("T")[0]

    // تنسيق التاريخ مثل "Tuesday, 22 April 2025"
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
    const formattedDate = now.toLocaleDateString("en-US", options)

    // تنسيق الوقت مثل "12:32 PM"
    const formattedTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    // التحقق من وجود قالب تقرير (إضافة مشابه)
    const template = localStorage.getItem("report_template")
    if (template) {
      const parsed = JSON.parse(template)
      localStorage.removeItem("report_template")

      setFormData({
        service_code: "",
        id_number: parsed.id_number ?? "",
        name_ar: parsed.name_ar ?? "",
        name_en: parsed.name_en ?? "",
        days_count: "",
        entry_date_gregorian: today,
        exit_date_gregorian: "",
        entry_date_hijri: "",
        exit_date_hijri: "",
        report_issue_date: today,
        nationality_ar: parsed.nationality_ar ?? "السعودية",
        nationality_en: parsed.nationality_en ?? "Saudi Arabia",
        doctor_name_ar: parsed.doctor_name_ar ?? "",
        doctor_name_en: parsed.doctor_name_en ?? "",
        job_title_ar: parsed.job_title_ar ?? "طبيب",
        job_title_en: parsed.job_title_en ?? "Doctor",
        hospital_name_ar: parsed.hospital_name_ar ?? "",
        hospital_name_en: parsed.hospital_name_en ?? "",
        print_date: formattedDate,
        print_time: formattedTime,
      })
      loadServiceCode()
      return
    }

    setFormData((prev) => ({
      ...prev,
      entry_date_gregorian: today,
      report_issue_date: today,
      print_date: formattedDate,
      print_time: formattedTime,
    }))
    loadServiceCode()
      } catch {
        router.push("/")
      }
    }
    checkSession()
  }, [router])

  // حساب تاريخ الخروج بناءً على تاريخ الدخول وعدد الأيام
  useEffect(() => {
    if (formData.entry_date_gregorian && formData.days_count) {
      const entryDate = new Date(formData.entry_date_gregorian)
      const days = Number.parseInt(formData.days_count)

      if (!isNaN(days)) {
        const exitDate = new Date(entryDate)
        // إذا كان عدد الأيام 1 → تاريخ الخروج = تاريخ الدخول
        // عمومًا: تاريخ الخروج = تاريخ الدخول + (عدد الأيام - 1)
        const offset = Math.max(0, days - 1)
        exitDate.setDate(exitDate.getDate() + offset)

        setFormData((prev) => ({
          ...prev,
          exit_date_gregorian: exitDate.toISOString().split("T")[0],
        }))
      }
    }
  }, [formData.entry_date_gregorian, formData.days_count])

  // حساب التاريخ الهجري للدخول بناءً على التاريخ الميلادي
  useEffect(() => {
    if (formData.entry_date_gregorian) {
      const hijriDate = convertToHijri(formData.entry_date_gregorian)
      setFormData((prev) => ({
        ...prev,
        entry_date_hijri: hijriDate,
      }))
    }
  }, [formData.entry_date_gregorian])

  // حساب التاريخ الهجري للخروج بناءً على التاريخ الميلادي
  useEffect(() => {
    if (formData.exit_date_gregorian) {
      const hijriDate = convertToHijri(formData.exit_date_gregorian)
      setFormData((prev) => ({
        ...prev,
        exit_date_hijri: hijriDate,
      }))
    }
  }, [formData.exit_date_gregorian])

  useEffect(() => {
    return () => invalidateArToEnSeq(translateSeqRef)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    const pair = AR_EN_FIELD_PAIRS.find((p) => p.ar === name)
    if (pair) {
      scheduleArToEnSync<ReportFormFields>(setFormData, translateSeqRef, pair.ar, pair.en, value, pair.mode)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const sessionRes = await fetch("/api/auth/session")
      if (!sessionRes.ok) {
        router.push("/")
        return
      }
      const { user } = await sessionRes.json()

      const supabase = createClientSupabaseClient()

      // التحقق من حالة التعليق قبل إنشاء التقرير
      const { data: userData, error: userCheckError } = await supabase
        .from("users")
        .select("is_suspended")
        .eq("id", user.id)
        .single()

      if (userCheckError) throw new Error("حدث خطأ أثناء التحقق من حالة الحساب")

      if (userData?.is_suspended) {
        setIsSuspended(true)
        setSuspensionReason("حسابك معلق ولا يمكنك إنشاء تقارير جديدة. يرجى التواصل مع المشرف.")
        throw new Error("حسابك معلق ولا يمكنك إنشاء تقارير جديدة. يرجى التواصل مع المشرف.")
      }

      // تحويل البيانات إلى النموذج المطلوب
      const reportData = {
        ...formData,
        days_count: parseInt(formData.days_count),
        user_id: user.id,
        is_disabled: false,
      }

      const { data, error: insertError } = await supabase.from("reports").insert(reportData).select()

      if (insertError) {
        throw new Error("حدث خطأ أثناء حفظ التقرير")
      }

      // إضافة نشاط جديد
      if (data && data.length > 0) {
        const reportId = String(data[0].id)
        await addActivity(
          user.id,
          "add",
          "تم إضافة تقرير جديد",
          `تم إضافة تقرير جديد للمريض ${formData.name_ar} برقم هوية ${formData.id_number}`,
          reportId,
        )

        // ===== التحقق التلقائي من تجاوز الحدود بعد إنشاء التقرير =====
        await checkAndAutoSuspend(user.id, supabase)
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ===== دالة التحقق التلقائي من التعليق بعد إنشاء التقرير =====
  const checkAndAutoSuspend = async (userId: string, supabase: any) => {
    try {
      // جلب بيانات المستخدم مع الحدود
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("limit_type, limit_value, limit_date, is_suspended")
        .eq("id", userId)
        .single()

      if (userError || !userData) return

      // إذا كان معلقاً بالفعل أو لا يوجد حد، لا داعي للفحص
      if (!userData.limit_type || userData.is_suspended) return

      // جلب إحصائيات الفترة الحالية
      const { data: statsData, error: statsError } = await supabase
        .from("user_period_stats")
        .select("period_report_count, period_total_days, last_report_at")
        .eq("user_id", userId)
        .single()

      if (statsError || !statsData) return

      // فحص هل يجب تعليق المستخدم
      const result = checkSuspension(
        {
          limit_type: userData.limit_type,
          limit_value: userData.limit_value,
          limit_date: userData.limit_date,
          is_suspended: userData.is_suspended,
        },
        {
          period_report_count: statsData.period_report_count,
          period_total_days: statsData.period_total_days,
          last_report_at: statsData.last_report_at,
        }
      )

      if (result && result.shouldSuspend) {
        // إنشاء سجل تعليق تلقائي
        const suspensionRecord = buildSuspensionRecord(
          userId,
          userId, // تعليق تلقائي (النظام)
          result.reason,
          {
            period_report_count: statsData.period_report_count,
            period_total_days: statsData.period_total_days,
          }
        )

        await supabase.from("user_suspensions").insert(suspensionRecord)

        // تحديث حالة المستخدم
        await supabase
          .from("users")
          .update({ is_suspended: true })
          .eq("id", userId)

        // تحديث حالة العرض
        setIsSuspended(true)
        setSuspensionReason(result.reason)
      }
    } catch (err) {
      console.error("Error in auto-suspension check:", err)
    }
  }

  const handleReset = () => {
    setFormData({
      service_code: "",
      id_number: "",
      name_ar: "",
      name_en: "",
      days_count: "",
      entry_date_gregorian: new Date().toISOString().split("T")[0],
      exit_date_gregorian: "",
      entry_date_hijri: "",
      exit_date_hijri: "",
      report_issue_date: new Date().toISOString().split("T")[0],
      nationality_ar: "السعودية",
      nationality_en: "Saudi Arabia",
      doctor_name_ar: "",
      doctor_name_en: "",
      job_title_ar: "طبيب",
      job_title_en: "Doctor",
      hospital_name_ar: "",
      hospital_name_en: "",
      print_date: formData.print_date,
      print_time: formData.print_time,
    })
    setSuccess(false)
    setError(null)
    loadServiceCode()
  }

  const handleDownloadPPTX = async () => {
    try {
      const sessionRes = await fetch("/api/auth/session")
      if (!sessionRes.ok) return
    } catch { return }

    await downloadPptx({
      SERVICE_CODE: formData.service_code,
      ID_NUMBER: formData.id_number,
      NAME_AR: formData.name_ar,
      NAME_EN: formData.name_en,
      DAYS_COUNT: parseInt(formData.days_count) || 0,
      ENTRY_DATE_GREGORIAN: formData.entry_date_gregorian,
      EXIT_DATE_GREGORIAN: formData.exit_date_gregorian,
      ENTRY_DATE_HIJRI: formData.entry_date_hijri,
      EXIT_DATE_HIJRI: formData.exit_date_hijri,
      REPORT_ISSUE_DATE: formData.report_issue_date,
      NATIONALITY_AR: formData.nationality_ar,
      NATIONALITY_EN: formData.nationality_en,
      DOCTOR_NAME_AR: formData.doctor_name_ar,
      DOCTOR_NAME_EN: formData.doctor_name_en,
      JOB_TITLE_AR: formData.job_title_ar,
      JOB_TITLE_EN: formData.job_title_en,
      HOSPITAL_NAME_AR: formData.hospital_name_ar,
      HOSPITAL_NAME_EN: formData.hospital_name_en,
      PRINT_DATE: formData.print_date,
      PRINT_TIME: formData.print_time,
    })
  }

  const handleDownloadPDF = async () => {
    try {
      const sessionRes = await fetch("/api/auth/session")
      if (!sessionRes.ok) return
    } catch { return }
    await downloadPdf({
      SERVICE_CODE: formData.service_code,
      ID_NUMBER: formData.id_number,
      NAME_AR: formData.name_ar,
      NAME_EN: formData.name_en,
      DAYS_COUNT: parseInt(formData.days_count) || 0,
      ENTRY_DATE_GREGORIAN: formData.entry_date_gregorian,
      EXIT_DATE_GREGORIAN: formData.exit_date_gregorian,
      ENTRY_DATE_HIJRI: formData.entry_date_hijri,
      EXIT_DATE_HIJRI: formData.exit_date_hijri,
      REPORT_ISSUE_DATE: formData.report_issue_date,
      NATIONALITY_AR: formData.nationality_ar,
      NATIONALITY_EN: formData.nationality_en,
      DOCTOR_NAME_AR: formData.doctor_name_ar,
      DOCTOR_NAME_EN: formData.doctor_name_en,
      JOB_TITLE_AR: formData.job_title_ar,
      JOB_TITLE_EN: formData.job_title_en,
      HOSPITAL_NAME_AR: formData.hospital_name_ar,
      HOSPITAL_NAME_EN: formData.hospital_name_en,
      PRINT_DATE: formData.print_date,
      PRINT_TIME: formData.print_time,
    })
  }

  // إضافة دالة للانتقال إلى التبويب التالي
  const handleNextTab = () => {
    if (activeTab === "basic") {
      setActiveTab("dates")
    } else if (activeTab === "dates") {
      setActiveTab("additional")
    }
  }

  // إضافة دالة للانتقال إلى التبويب السابق
  const handlePrevTab = () => {
    if (activeTab === "additional") {
      setActiveTab("dates")
    } else if (activeTab === "dates") {
      setActiveTab("basic")
    }
  }

  const getCurrentTabIndex = () => {
    return tabs.indexOf(activeTab) + 1
  }

  const getProgressPercentage = () => {
    return (getCurrentTabIndex() / tabs.length) * 100
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  }

  

  return (
    <div className="container max-w-md mx-auto p-4 pb-20 text-right" dir="rtl">
      {pptxProgressDialog}
      {pdfProgressDialog}
      <BackButton />
      <PageHeader
        title={<span className="gradient-heading text-2xl">إضافة تقرير جديد</span>}
        description="أدخل بيانات التقرير الجديد"
        icon={<PlusCircle className="h-8 w-8 text-blue-600" />}
      />

      {/* شاشة التحقق من التعليق */}
      {isCheckingSuspension && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-500">جاري التحقق من حالة الحساب...</p>
        </div>
      )}

      {/* رسالة التعليق - تظهر فقط إذا كان معلقاً ولم يسجل نجاح (لم ينشئ تقرير الآن) */}
      {isSuspended && !success && !isCheckingSuspension && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <Card className="border-red-200 bg-gradient-to-b from-red-50 to-white overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-red-500 to-red-600"></div>
            <CardContent className="p-6 text-center space-y-4">
              <div className="bg-red-100 p-4 rounded-full inline-flex">
                <ShieldOff className="h-10 w-10 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-700 mb-2">
                  حسابك معلق
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {suspensionReason || "لا يمكنك إنشاء تقارير جديدة حالياً. يرجى التواصل مع المشرف لتفعيل حسابك."}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-xs">لتفعيل حسابك، يرجى التواصل مع المشرف المسؤول عنك.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* النموذج - يظهر إذا لم يكن معلقاً أصلاً، أو بعد نجاح الإرسال (حتى لو اتعلق تلقائياً) */}
      {((!isSuspended && !isCheckingSuspension) || success) && (
      <motion.div initial="hidden" animate="visible" variants={containerVariants}>
        <Card className="glass-card overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600"></div>

          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="ml-2 h-5 w-5 text-blue-600" />
                <span>بيانات التقرير</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-blue-600 font-bold">{getCurrentTabIndex()}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-500">{tabs.length}</span>
              </div>
            </CardTitle>
            <div className="mt-2" dir="rtl">
              <Progress
                value={getProgressPercentage()}
                rtl
                className="h-2 bg-gray-100"
                indicatorClassName="bg-gradient-to-l from-blue-500 to-blue-600"
              />
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <AlertMessage type="error" title="خطأ في حفظ التقرير" message={error} onClose={() => setError(null)} />
              )}
              {success && <AlertMessage type="success" title="تم الحفظ بنجاح" message="تم حفظ التقرير بنجاح" />}

              {/* تحديث مكون Tabs ليستخدم activeTab */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4" dir="rtl">
                  <TabsTrigger
                    value="basic"
                    className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                  >
                    <div className="flex items-center gap-1 justify-center">
                      {activeTab === "basic" && <Check className="h-3 w-3" />}
                      <span>البيانات الأساسية</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="dates"
                    className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                  >
                    <div className="flex items-center gap-1 justify-center">
                      {activeTab === "dates" && <Check className="h-3 w-3" />}
                      <span>التواريخ</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="additional"
                    className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                  >
                    <div className="flex items-center gap-1 justify-center">
                      {activeTab === "additional" && <Check className="h-3 w-3" />}
                      <span>بيانات إضافية</span>
                    </div>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="space-y-2 text-right">
                    <Label htmlFor="service_code" className="text-indigo-900 flex items-center gap-1.5 justify-end flex-row-reverse w-full">
                      <Hash className="h-4 w-4 text-indigo-600" />
                      رمز الخدمة
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="service_code"
                        name="service_code"
                        value={formData.service_code}
                        readOnly
                        required
                        className={`flex-1 text-right border-indigo-200 bg-gray-50 font-mono tracking-wider ${isGeneratingCode ? 'animate-pulse' : ''}`}
                        dir="ltr"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 flex-shrink-0"
                        onClick={loadServiceCode}
                        disabled={isGeneratingCode}
                        title="توليد رمز جديد"
                      >
                        <RefreshCw className={`h-4 w-4 ${isGeneratingCode ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">يتم توليد رمز الخدمة تلقائياً</p>
                  </div>

                  <FormField
                    label="رقم الهوية"
                    name="id_number"
                    value={formData.id_number}
                    onChange={handleChange}
                    placeholder="أدخل رقم الهوية"
                    required
                    icon={Hash}
                  />

                  <FormField
                    label="الاسم (عربي)"
                    name="name_ar"
                    value={formData.name_ar}
                    onChange={handleChange}
                    placeholder="أدخل الاسم باللغة العربية"
                    required
                    icon={User}
                  />

                  <FormField
                    label="الاسم (إنجليزي)"
                    name="name_en"
                    value={formData.name_en}
                    onChange={handleChange}
                    placeholder="أدخل الاسم باللغة الإنجليزية"
                    required
                    icon={User}
                    inputClassName="uppercase"
                  />

                  <FormField
                    label="عدد الأيام"
                    name="days_count"
                    type="number"
                    value={formData.days_count}
                    onChange={handleChange}
                    placeholder="أدخل عدد الأيام"
                    required
                    icon={Calendar}
                  />
                </TabsContent>

                <TabsContent value="dates" className="space-y-4">
                  <FormField
                    label="تاريخ الدخول (ميلادي)"
                    name="entry_date_gregorian"
                    type="date"
                    value={formData.entry_date_gregorian}
                    onChange={handleChange}
                    required
                    icon={Calendar}
                  />

                  <FormField
                    label="تاريخ الخروج (ميلادي)"
                    name="exit_date_gregorian"
                    type="date"
                    value={formData.exit_date_gregorian}
                    onChange={handleChange}
                    readOnly
                    icon={Calendar}
                    hint="(يتم حسابه تلقائيًا بناءً على تاريخ الدخول وعدد الأيام)"
                  />

                  <FormField
                    label="تاريخ الدخول (هجري)"
                    name="entry_date_hijri"
                    value={formData.entry_date_hijri}
                    onChange={handleChange}
                    placeholder="يتم حسابه تلقائيًا"
                    readOnly
                    icon={Calendar}
                    hint="(يتم حسابه تلقائيًا من تاريخ الدخول الميلادي)"
                  />

                  <FormField
                    label="تاريخ الخروج (هجري)"
                    name="exit_date_hijri"
                    value={formData.exit_date_hijri}
                    onChange={handleChange}
                    placeholder="يتم حسابه تلقائيًا"
                    readOnly
                    icon={Calendar}
                    hint="(يتم حسابه تلقائيًا من تاريخ الخروج الميلادي)"
                  />

                  <FormField
                    label="تاريخ إصدار التقرير"
                    name="report_issue_date"
                    type="date"
                    value={formData.report_issue_date}
                    onChange={handleChange}
                    required
                    icon={Calendar}
                  />
                </TabsContent>

                <TabsContent value="additional" className="space-y-4">
                  <FormField
                    label="الجنسية (عربي)"
                    name="nationality_ar"
                    value={formData.nationality_ar}
                    onChange={handleChange}
                    placeholder="أدخل الجنسية باللغة العربية"
                    required
                    icon={Flag}
                  />

                  <FormField
                    label="الجنسية (إنجليزي)"
                    name="nationality_en"
                    value={formData.nationality_en}
                    onChange={handleChange}
                    placeholder="أدخل الجنسية باللغة الإنجليزية"
                    required
                    icon={Flag}
                  />

                  <FormField
                    label="اسم الطبيب (عربي)"
                    name="doctor_name_ar"
                    value={formData.doctor_name_ar}
                    onChange={handleChange}
                    placeholder="أدخل اسم الطبيب باللغة العربية"
                    required
                    icon={UserCheck}
                  />

                  <FormField
                    label="اسم الطبيب (إنجليزي)"
                    name="doctor_name_en"
                    value={formData.doctor_name_en}
                    onChange={handleChange}
                    placeholder="أدخل اسم الطبيب باللغة الإنجليزية"
                    required
                    icon={UserCheck}
                    inputClassName="uppercase"
                  />

                  <FormField
                    label="المسمى الوظيفي (عربي)"
                    name="job_title_ar"
                    value={formData.job_title_ar}
                    onChange={handleChange}
                    placeholder="أدخل المسمى الوظيفي باللغة العربية"
                    required
                    icon={UserCheck}
                  />

                  <FormField
                    label="المسمى الوظيفي (إنجليزي)"
                    name="job_title_en"
                    value={formData.job_title_en}
                    onChange={handleChange}
                    placeholder="أدخل المسمى الوظيفي باللغة الإنجليزية"
                    required
                    icon={UserCheck}
                  />

                  <FormField
                    label="اسم المستشفى (عربي)"
                    name="hospital_name_ar"
                    value={formData.hospital_name_ar}
                    onChange={handleChange}
                    placeholder="أدخل اسم المستشفى باللغة العربية"
                    required
                    icon={Building}
                  />

                  <FormField
                    label="اسم المستشفى (إنجليزي)"
                    name="hospital_name_en"
                    value={formData.hospital_name_en}
                    onChange={handleChange}
                    placeholder="أدخل اسم المستشفى باللغة الإنجليزية"
                    required
                    icon={Building}
                  />

                  <FormField
                    label="تاريخ الطباعة"
                    name="print_date"
                    value={formData.print_date}
                    onChange={handleChange}
                    placeholder="مثال: Tuesday, 22 April 2025"
                    required
                    icon={Calendar}
                  />

                  <FormField
                    label="وقت الطباعة"
                    name="print_time"
                    value={formData.print_time}
                    onChange={handleChange}
                    placeholder="مثال: 12:32 PM"
                    required
                    icon={Clock}
                  />
                </TabsContent>
              </Tabs>

              <Separator className="my-4" />

              {/* استبدال أزرار الإرسال والإلغاء بأزرار التالي والسابق */}
              <motion.div className="flex gap-2" variants={itemVariants}>
                {activeTab !== "basic" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    onClick={handlePrevTab}
                  >
                    <ArrowRight className="ml-2 h-4 w-4" />
                    السابق
                  </Button>
                )}

                {activeTab !== "additional" ? (
                  <Button
                    type="button"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                    onClick={handleNextTab}
                  >
                    <ArrowLeft className="ml-2 h-4 w-4" />
                    التالي
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="ml-2 h-4 w-4" />
                        حفظ التقرير
                      </>
                    )}
                  </Button>
                )}
              </motion.div>

              {activeTab === "additional" && (
                <motion.div variants={itemVariants}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => router.push("/home")}
                  >
                    <X className="ml-2 h-4 w-4" />
                    إلغاء
                  </Button>
                </motion.div>
              )}
            </form>
          </CardContent>
          {success && (
            <CardFooter className="flex flex-col space-y-3 bg-blue-50 border-t border-blue-100 p-4">
              {/* تحذير التعليق التلقائي بعد إنشاء التقرير */}
              {isSuspended && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3"
                >
                  <div className="bg-red-100 p-1.5 rounded-lg flex-shrink-0 mt-0.5">
                    <ShieldOff className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-700">تم تعليق حسابك تلقائياً</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      {suspensionReason || "تجاوزت الحد المسموح لإنشاء التقارير."}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      يرجى التواصل مع المشرف لتفعيل حسابك.
                    </p>
                  </div>
                </motion.div>
              )}

              <motion.div
                className="flex gap-2 w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {pptxEnabled && (
                <Button
                  onClick={handleDownloadPPTX}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md"
                >
                  <Download className="ml-2 h-4 w-4" />
                  تنزيل PPTX
                </Button>
                )}
                <Button
                  onClick={handleDownloadPDF}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md"
                  style={{ flex: pptxEnabled ? 1 : undefined, width: pptxEnabled ? undefined : '100%' }}
                >
                  <Download className="ml-2 h-4 w-4" />
                  تنزيل PDF
                </Button>
              </motion.div>
              {/* زر إدخال تقرير جديد - يختفي إذا اتعلق تلقائياً */}
              {!isSuspended && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Button
                  onClick={handleReset}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                >
                  <RefreshCw className="ml-2 h-4 w-4" />
                  إدخال تقرير جديد
                </Button>
              </motion.div>
              )}
            </CardFooter>
          )}
        </Card>
      </motion.div>
      )}
    </div>
  )
}
