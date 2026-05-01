"use client"

import type React from "react"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { PageHeader } from "@/components/ui-custom/page-header"
import { BackButton } from "@/components/ui-custom/back-button"
import {
  Edit,
  SearchIcon,
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
  ArrowLeft,
} from "lucide-react"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { addActivity } from "@/lib/activities-service"
import { toHijri } from "hijri-date-converter"
import { invalidateArToEnSeq, scheduleArToEnSync } from "@/lib/auto-translate-ar-en"

interface Report {
  id: string
  user_id: string
  service_code: string
  id_number: string
  name_ar: string
  name_en: string
  days_count: number
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
  is_disabled: boolean
  created_at: string
  updated_at: string
}

interface EditFormState {
  serviceCode: string
  idNumber: string
  nameAr: string
  nameEn: string
  daysCount: string
  entryDateGregorian: string
  exitDateGregorian: string
  entryDateHijri: string
  exitDateHijri: string
  reportIssueDate: string
  nationalityAr: string
  nationalityEn: string
  doctorNameAr: string
  doctorNameEn: string
  jobTitleAr: string
  jobTitleEn: string
  hospitalNameAr: string
  hospitalNameEn: string
  printDate: string
  printTime: string
}

const EDIT_AR_EN_PAIRS: { ar: keyof EditFormState; en: keyof EditFormState; mode: "translate" | "transliterate" }[] = [
  { ar: "nameAr", en: "nameEn", mode: "transliterate" },
  { ar: "nationalityAr", en: "nationalityEn", mode: "translate" },
  { ar: "doctorNameAr", en: "doctorNameEn", mode: "transliterate" },
  { ar: "jobTitleAr", en: "jobTitleEn", mode: "translate" },
  { ar: "hospitalNameAr", en: "hospitalNameEn", mode: "translate" },
]

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

function EditReportPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchMode, setSearchMode] = useState(true)
  const [serviceCode, setServiceCode] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [report, setReport] = useState<Report | null>(null)
  const [formData, setFormData] = useState<EditFormState>({
    serviceCode: "",
    idNumber: "",
    nameAr: "",
    nameEn: "",
    daysCount: "",
    entryDateGregorian: "",
    exitDateGregorian: "",
    entryDateHijri: "",
    exitDateHijri: "",
    reportIssueDate: "",
    nationalityAr: "السعودية",
    nationalityEn: "Saudi Arabia",
    doctorNameAr: "",
    doctorNameEn: "",
    jobTitleAr: "طبيب",
    jobTitleEn: "Doctor",
    hospitalNameAr: "",
    hospitalNameEn: "",
    printDate: "",
    printTime: "",
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const translateSeqRef = useRef<Record<string, number>>({})
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        if (!res.ok) {
          router.push("/")
          return
        }
        const { user } = await res.json()

        // التحقق مما إذا كان هناك معرف تقرير في URL
        const reportId = searchParams.get("report_id")
        if (reportId) {
          // جلب بيانات التقرير من Supabase بدل localStorage
          const { data: reportData, error: reportError } = await supabase
            .from("reports")
            .select("*")
            .eq("id", reportId)
            .eq("user_id", user.id)
            .single()

          if (!reportError && reportData) {
            const r = reportData as unknown as Report
            setReport(r)
            setSearchMode(false)
            populateFormData(r)
          }
        }
      } catch (_err) {
        router.push("/")
      }
    }
    checkSession()
  }, [router])

  // حساب تاريخ الخروج بناءً على تاريخ الدخول وعدد الأيام
  useEffect(() => {
    if (formData.entryDateGregorian && formData.daysCount) {
      const entryDate = new Date(formData.entryDateGregorian)
      const days = Number.parseInt(formData.daysCount)

      if (!isNaN(days)) {
        const exitDate = new Date(entryDate)
        // إذا كان عدد الأيام 1 → تاريخ الخروج = تاريخ الدخول
        // عمومًا: تاريخ الخروج = تاريخ الدخول + (عدد الأيام - 1)
        const offset = Math.max(0, days - 1)
        exitDate.setDate(exitDate.getDate() + offset)

        setFormData((prev) => ({
          ...prev,
          exitDateGregorian: exitDate.toISOString().split("T")[0],
        }))
      }
    }
  }, [formData.entryDateGregorian, formData.daysCount])

  // حساب التاريخ الهجري للدخول بناءً على التاريخ الميلادي
  useEffect(() => {
    if (formData.entryDateGregorian) {
      const hijriDate = convertToHijri(formData.entryDateGregorian)
      setFormData((prev) => ({
        ...prev,
        entryDateHijri: hijriDate,
      }))
    }
  }, [formData.entryDateGregorian])

  // حساب التاريخ الهجري للخروج بناءً على التاريخ الميلادي
  useEffect(() => {
    if (formData.exitDateGregorian) {
      const hijriDate = convertToHijri(formData.exitDateGregorian)
      setFormData((prev) => ({
        ...prev,
        exitDateHijri: hijriDate,
      }))
    }
  }, [formData.exitDateGregorian])

  useEffect(() => {
    return () => invalidateArToEnSeq(translateSeqRef)
  }, [])

  const populateFormData = (report: Report) => {
    setFormData({
      serviceCode: report.service_code,
      idNumber: report.id_number,
      nameAr: report.name_ar,
      nameEn: report.name_en,
      daysCount: report.days_count.toString(),
      entryDateGregorian: report.entry_date_gregorian,
      exitDateGregorian: report.exit_date_gregorian,
      entryDateHijri: report.entry_date_hijri,
      exitDateHijri: report.exit_date_hijri,
      reportIssueDate: report.report_issue_date,
      nationalityAr: report.nationality_ar,
      nationalityEn: report.nationality_en,
      doctorNameAr: report.doctor_name_ar,
      doctorNameEn: report.doctor_name_en,
      jobTitleAr: report.job_title_ar,
      jobTitleEn: report.job_title_en,
      hospitalNameAr: report.hospital_name_ar,
      hospitalNameEn: report.hospital_name_en,
      printDate: report.print_date,
      printTime: report.print_time,
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    const pair = EDIT_AR_EN_PAIRS.find((p) => p.ar === name)
    if (pair) {
      scheduleArToEnSync<EditFormState>(setFormData, translateSeqRef, pair.ar, pair.en, value, pair.mode)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!serviceCode && !idNumber) {
      setError("يرجى إدخال رمز الخدمة أو رقم الهوية")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const sessionRes = await fetch("/api/auth/session")
      if (!sessionRes.ok) {
        setError("يرجى تسجيل الدخول مرة أخرى")
        return
      }
      const { user } = await sessionRes.json()
      let query = supabase.from("reports").select("*").eq("user_id", user.id).eq("is_disabled", false)

      if (serviceCode) {
        query = query.eq("service_code", serviceCode)
      }

      if (idNumber) {
        query = query.eq("id_number", idNumber)
      }

      const { data, error: searchError } = await query

      if (searchError) {
        throw new Error("حدث خطأ أثناء البحث")
      }

      if (!data || data.length === 0) {
        throw new Error("لم يتم العثور على نتائج")
      }

      // إذا وجدنا أكثر من نتيجة، نوجه المستخدم إلى صفحة البحث بمعاملات URL
      if (data.length > 1) {
        const params = new URLSearchParams()
        if (serviceCode) params.set("service_code", serviceCode)
        if (idNumber) params.set("id_number", idNumber)
        router.push(`/search?${params.toString()}`)
        return
      }

      // إذا وجدنا نتيجة واحدة، نعرضها للتعديل
      const r = data[0] as unknown as Report
      setReport(r)
      setSearchMode(false)
      populateFormData(r)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!report) {
        throw new Error("لم يتم العثور على التقرير")
      }

      const sessionRes = await fetch("/api/auth/session")
      if (!sessionRes.ok) {
        throw new Error("يرجى تسجيل الدخول مرة أخرى")
      }
      const { user } = await sessionRes.json()

      // التحقق من البيانات المطلوبة
      const requiredFields = [
        "serviceCode",
        "idNumber",
        "nameAr",
        "nameEn",
        "daysCount",
        "entryDateGregorian",
        "entryDateHijri",
        "doctorNameAr",
        "doctorNameEn",
        "hospitalNameAr",
        "hospitalNameEn",
      ]

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          throw new Error(`حقل ${field} مطلوب`)
        }
      }

      // تحديث التقرير في قاعدة البيانات
      const { error: updateError } = await supabase
        .from("reports")
        .update({
          service_code: formData.serviceCode,
          id_number: formData.idNumber,
          name_ar: formData.nameAr,
          name_en: formData.nameEn,
          days_count: Number.parseInt(formData.daysCount),
          entry_date_gregorian: formData.entryDateGregorian,
          exit_date_gregorian: formData.exitDateGregorian,
          entry_date_hijri: formData.entryDateHijri,
          exit_date_hijri: formData.exitDateHijri,
          report_issue_date: formData.reportIssueDate,
          nationality_ar: formData.nationalityAr,
          nationality_en: formData.nationalityEn,
          doctor_name_ar: formData.doctorNameAr,
          doctor_name_en: formData.doctorNameEn,
          job_title_ar: formData.jobTitleAr,
          job_title_en: formData.jobTitleEn,
          hospital_name_ar: formData.hospitalNameAr,
          hospital_name_en: formData.hospitalNameEn,
          print_date: formData.printDate,
          print_time: formData.printTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id)

      if (updateError) {
        throw new Error("حدث خطأ أثناء تحديث التقرير")
      }

      // إضافة نشاط تعديل
      await addActivity(
        user.id,
        "edit",
        "تم تعديل تقرير",
        `تم تعديل تقرير للمريض ${formData.nameAr} برقم هوية ${formData.idNumber}`,
        report.id,
      )

      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
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
    <motion.div className="space-y-2" variants={itemVariants}>
      <Label htmlFor={name} className="text-amber-900 flex items-center gap-1.5">
        {Icon && <Icon className="h-4 w-4 text-amber-600" />}
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
          className={`border-amber-200 focus:border-amber-400 ${readOnly ? "bg-gray-50" : ""} ${inputClassName || ""}`}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </motion.div>
  )

  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      <BackButton />
      <PageHeader
        title={<span className="gradient-heading text-2xl">تعديل تقرير</span>}
        description={searchMode ? "البحث عن تقرير للتعديل" : "تعديل بيانات التقرير"}
        icon={<Edit className="h-8 w-8 text-amber-600" />}
      />

      {searchMode ? (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
          <Card className="glass-card overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-amber-500 to-amber-600"></div>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <SearchIcon className="ml-2 h-5 w-5 text-amber-600" />
                البحث عن تقرير
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                {error && (
                  <AlertMessage type="error" title="خطأ في البحث" message={error} onClose={() => setError(null)} />
                )}

                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="serviceCode" className="text-amber-900 flex items-center gap-1.5">
                    <Hash className="h-4 w-4 text-amber-600" />
                    رمز الخدمة
                  </Label>
                  <Input
                    id="serviceCode"
                    value={serviceCode}
                    onChange={(e) => setServiceCode(e.target.value)}
                    placeholder="أدخل رمز الخدمة"
                    className="border-amber-200 focus:border-amber-400"
                  />
                </motion.div>

                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="idNumber" className="text-amber-900 flex items-center gap-1.5">
                    <Hash className="h-4 w-4 text-amber-600" />
                    رقم الهوية
                  </Label>
                  <Input
                    id="idNumber"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="أدخل رقم الهوية"
                    className="border-amber-200 focus:border-amber-400"
                  />
                </motion.div>

                <motion.div className="text-sm text-muted-foreground mb-4" variants={itemVariants}>
                  أدخل رمز الخدمة أو رقم الهوية أو كليهما للبحث عن التقرير
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري البحث...
                      </>
                    ) : (
                      <>
                        <SearchIcon className="ml-2 h-4 w-4" />
                        بحث
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
          <Card className="glass-card overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-amber-500 to-amber-600"></div>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <FileText className="ml-2 h-5 w-5 text-amber-600" />
                تعديل بيانات التقرير
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <AlertMessage
                    type="error"
                    title="خطأ في تحديث التقرير"
                    message={error}
                    onClose={() => setError(null)}
                  />
                )}
                {success && <AlertMessage type="success" title="تم التحديث بنجاح" message="تم تحديث التقرير بنجاح" />}

                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger
                      value="basic"
                      className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700"
                    >
                      البيانات الأساسية
                    </TabsTrigger>
                    <TabsTrigger
                      value="dates"
                      className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700"
                    >
                      التواريخ
                    </TabsTrigger>
                    <TabsTrigger
                      value="additional"
                      className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700"
                    >
                      بيانات إضافية
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
                    <FormField
                      label="رمز الخدمة"
                      name="serviceCode"
                      value={formData.serviceCode}
                      onChange={handleChange}
                      placeholder="رمز الخدمة"
                      required
                      readOnly
                      icon={Hash}
                      inputClassName="font-mono tracking-wider"
                      hint="(لا يمكن تعديل رمز الخدمة)"
                    />

                    <FormField
                      label="رقم الهوية"
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleChange}
                      placeholder="أدخل رقم الهوية"
                      required
                      icon={Hash}
                    />

                    <FormField
                      label="الاسم (عربي)"
                      name="nameAr"
                      value={formData.nameAr}
                      onChange={handleChange}
                      placeholder="أدخل الاسم باللغة العربية"
                      required
                      icon={User}
                    />

                    <FormField
                      label="الاسم (إنجليزي)"
                      name="nameEn"
                      value={formData.nameEn}
                      onChange={handleChange}
                      placeholder="أدخل الاسم باللغة الإنجليزية"
                      required
                      icon={User}
                      inputClassName="uppercase"
                    />

                    <FormField
                      label="عدد الأيام"
                      name="daysCount"
                      type="number"
                      value={formData.daysCount}
                      onChange={handleChange}
                      placeholder="أدخل عدد الأيام"
                      required
                      icon={Calendar}
                    />
                  </TabsContent>

                  <TabsContent value="dates" className="space-y-4">
                    <FormField
                      label="تاريخ الدخول (ميلادي)"
                      name="entryDateGregorian"
                      type="date"
                      value={formData.entryDateGregorian}
                      onChange={handleChange}
                      required
                      icon={Calendar}
                    />

                    <FormField
                      label="تاريخ الخروج (ميلادي)"
                      name="exitDateGregorian"
                      type="date"
                      value={formData.exitDateGregorian}
                      onChange={handleChange}
                      readOnly
                      icon={Calendar}
                      hint="(يتم حسابه تلقائيًا بناءً على تاريخ الدخول وعدد الأيام)"
                    />

                    <FormField
                      label="تاريخ الدخول (هجري)"
                      name="entryDateHijri"
                      value={formData.entryDateHijri}
                      onChange={handleChange}
                      placeholder="يتم حسابه تلقائيًا"
                      readOnly
                      icon={Calendar}
                      hint="(يتم حسابه تلقائيًا من تاريخ الدخول الميلادي)"
                    />

                    <FormField
                      label="تاريخ الخروج (هجري)"
                      name="exitDateHijri"
                      value={formData.exitDateHijri}
                      onChange={handleChange}
                      placeholder="يتم حسابه تلقائيًا"
                      readOnly
                      icon={Calendar}
                      hint="(يتم حسابه تلقائيًا من تاريخ الخروج الميلادي)"
                    />

                    <FormField
                      label="تاريخ إصدار التقرير"
                      name="reportIssueDate"
                      type="date"
                      value={formData.reportIssueDate}
                      onChange={handleChange}
                      required
                      icon={Calendar}
                    />
                  </TabsContent>

                  <TabsContent value="additional" className="space-y-4">
                    <FormField
                      label="الجنسية (عربي)"
                      name="nationalityAr"
                      value={formData.nationalityAr}
                      onChange={handleChange}
                      placeholder="أدخل الجنسية باللغة العربية"
                      required
                      icon={Flag}
                    />

                    <FormField
                      label="الجنسية (إنجليزي)"
                      name="nationalityEn"
                      value={formData.nationalityEn}
                      onChange={handleChange}
                      placeholder="أدخل الجنسية باللغة الإنجليزية"
                      required
                      icon={Flag}
                    />

                    <FormField
                      label="اسم الطبيب (عربي)"
                      name="doctorNameAr"
                      value={formData.doctorNameAr}
                      onChange={handleChange}
                      placeholder="أدخل اسم الطبيب باللغة العربية"
                      required
                      icon={UserCheck}
                    />

                    <FormField
                      label="اسم الطبيب (إنجليزي)"
                      name="doctorNameEn"
                      value={formData.doctorNameEn}
                      onChange={handleChange}
                      placeholder="أدخل اسم الطبيب باللغة الإنجليزية"
                      required
                      icon={UserCheck}
                      inputClassName="uppercase"
                    />

                    <FormField
                      label="المسمى الوظيفي (عربي)"
                      name="jobTitleAr"
                      value={formData.jobTitleAr}
                      onChange={handleChange}
                      placeholder="أدخل المسمى الوظيفي باللغة العربية"
                      required
                      icon={UserCheck}
                    />

                    <FormField
                      label="المسمى الوظيفي (إنجليزي)"
                      name="jobTitleEn"
                      value={formData.jobTitleEn}
                      onChange={handleChange}
                      placeholder="أدخل المسمى الوظيفي باللغة الإنجليزية"
                      required
                      icon={UserCheck}
                    />

                    <FormField
                      label="اسم المستشفى (عربي)"
                      name="hospitalNameAr"
                      value={formData.hospitalNameAr}
                      onChange={handleChange}
                      placeholder="أدخل اسم المستشفى باللغة العربية"
                      required
                      icon={Building}
                    />

                    <FormField
                      label="اسم المستشفى (إنجليزي)"
                      name="hospitalNameEn"
                      value={formData.hospitalNameEn}
                      onChange={handleChange}
                      placeholder="أدخل اسم المستشفى باللغة الإنجليزية"
                      required
                      icon={Building}
                    />

                    <FormField
                      label="تاريخ الطباعة"
                      name="printDate"
                      value={formData.printDate}
                      onChange={handleChange}
                      placeholder="مثال: Tuesday, 22 April 2025"
                      required
                      icon={Calendar}
                    />

                    <FormField
                      label="وقت الطباعة"
                      name="printTime"
                      value={formData.printTime}
                      onChange={handleChange}
                      placeholder="مثال: 12:32 PM"
                      required
                      icon={Clock}
                    />
                  </TabsContent>
                </Tabs>

                <Separator className="my-4" />

                <motion.div className="flex gap-2" variants={itemVariants}>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري التحديث...
                      </>
                    ) : (
                      <>
                        <Save className="ml-2 h-4 w-4" />
                        تحديث التقرير
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => router.push("/home")}
                  >
                    <X className="ml-2 h-4 w-4" />
                    إلغاء
                  </Button>
                </motion.div>
              </form>
            </CardContent>
            {success && (
              <CardFooter className="bg-amber-50 border-t border-amber-100 p-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-full"
                >
                  <Button
                    onClick={() => router.push("/home")}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md"
                  >
                    <ArrowLeft className="ml-2 h-4 w-4" />
                    العودة إلى الصفحة الرئيسية
                  </Button>
                </motion.div>
              </CardFooter>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  )
}


export default function EditReportPage() {
  return (
    <Suspense>
      <EditReportPageContent />
    </Suspense>
  )
}
