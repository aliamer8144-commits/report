"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { PageHeader } from "@/components/ui-custom/page-header"
import { BackButton } from "@/components/ui-custom/back-button"
import { SearchIcon, PlusCircle, Edit, Ban, Download } from "lucide-react"
import { type ReportData } from "@/lib/report-generator"
import { createClientSupabaseClient } from "@/lib/supabase"
import { usePptxDownloadWithProgress, usePdfDownloadWithProgress } from "@/components/ui-custom/pptx-download-progress"

interface Report {
  id: string
  created_at: string
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
  [key: string]: unknown
}

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchResults, setSearchResults] = useState<Report[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [pptxEnabled, setPptxEnabled] = useState(true)
  const { downloadPptx, pptxProgressDialog } = usePptxDownloadWithProgress()
  const { downloadPdf, pdfProgressDialog } = usePdfDownloadWithProgress()

  useEffect(() => {
    const init = async () => {
      try {
        // التحقق من تسجيل الدخول
        const res = await fetch("/api/auth/session")
        if (!res.ok) {
          router.push("/")
          return
        }
        const { user } = await res.json()

        const supabase = createClientSupabaseClient()

        // جلب صلاحية PPTX للمستخدم
        const { data: userData } = await supabase
          .from("users")
          .select("pptx_enabled")
          .eq("id", user.id)
          .single()
        if (userData) {
          setPptxEnabled(userData.pptx_enabled !== false)
        }

        setIsInitializing(false)
      } catch (err) {
        console.error("Failed to initialize:", err)
        setError("فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.")
        setIsInitializing(false)
        return
      }

        // جلب نتائج البحث باستخدام المعاملات من URL بدل localStorage
        const serviceCode = searchParams.get("service_code")
        const idNumber = searchParams.get("id_number")

        if (serviceCode || idNumber) {
          const supabase = createClientSupabaseClient()
          let query = supabase.from("reports").select("*")
          if (serviceCode) query = query.eq("service_code", serviceCode)
          if (idNumber) query = query.eq("id_number", idNumber)
          const { data, error: searchError } = await query
          if (!searchError && data) {
            setSearchResults(data as unknown as Report[])
          }
        } else {
          router.push("/home")
        }
    }

    init()
  }, [router, searchParams])

  const handleAddSimilar = (report: Report) => {
    router.push(`/add?template_id=${report.id}`)
  }

  const handleEdit = (report: Report) => {
    router.push(`/edit?report_id=${report.id}`)
  }

  const handleToggleDisable = (report: Report) => {
    router.push(`/delete?report_id=${report.id}`)
  }

  const handleDownloadPPTX = async (report: Report) => {
    try {
      const sessionRes = await fetch("/api/auth/session")
      if (!sessionRes.ok) {
        setError("يجب تسجيل الدخول أولاً")
        return
      }
    } catch (_err) {
      setError("يجب تسجيل الدخول أولاً")
      return
    }

    const r = report as Record<string, unknown>
    await downloadPptx({
      SERVICE_CODE: String(r.SERVICE_CODE ?? r.service_code ?? ""),
      ID_NUMBER: String(r.ID_NUMBER ?? r.id_number ?? ""),
      NAME_AR: String(r.NAME_AR ?? r.name_ar ?? ""),
      NAME_EN: String(r.NAME_EN ?? r.name_en ?? ""),
      DAYS_COUNT: Number(r.DAYS_COUNT ?? r.days_count ?? 0),
      ENTRY_DATE_GREGORIAN: String(r.ENTRY_DATE_GREGORIAN ?? r.entry_date_gregorian ?? ""),
      EXIT_DATE_GREGORIAN: String(r.EXIT_DATE_GREGORIAN ?? r.exit_date_gregorian ?? ""),
      ENTRY_DATE_HIJRI: String(r.ENTRY_DATE_HIJRI ?? r.entry_date_hijri ?? ""),
      EXIT_DATE_HIJRI: String(r.EXIT_DATE_HIJRI ?? r.exit_date_hijri ?? ""),
      REPORT_ISSUE_DATE: String(r.REPORT_ISSUE_DATE ?? r.report_issue_date ?? ""),
      NATIONALITY_AR: String(r.NATIONALITY_AR ?? r.nationality_ar ?? ""),
      NATIONALITY_EN: String(r.NATIONALITY_EN ?? r.nationality_en ?? ""),
      DOCTOR_NAME_AR: String(r.DOCTOR_NAME_AR ?? r.doctor_name_ar ?? ""),
      DOCTOR_NAME_EN: String(r.DOCTOR_NAME_EN ?? r.doctor_name_en ?? ""),
      JOB_TITLE_AR: String(r.JOB_TITLE_AR ?? r.job_title_ar ?? ""),
      JOB_TITLE_EN: String(r.JOB_TITLE_EN ?? r.job_title_en ?? ""),
      HOSPITAL_NAME_AR: String(r.HOSPITAL_NAME_AR ?? r.hospital_name_ar ?? ""),
      HOSPITAL_NAME_EN: String(r.HOSPITAL_NAME_EN ?? r.hospital_name_en ?? ""),
      PRINT_DATE: String(r.PRINT_DATE ?? r.print_date ?? ""),
      PRINT_TIME: String(r.PRINT_TIME ?? r.print_time ?? ""),
    })
  }

  const handleDownloadPDF = async (report: Report) => {
    try {
      const sessionRes = await fetch("/api/auth/session")
      if (!sessionRes.ok) {
        setError("يجب تسجيل الدخول أولاً")
        return
      }
    } catch (_err) {
      setError("يجب تسجيل الدخول أولاً")
      return
    }

    const r = report as Record<string, unknown>
    await downloadPdf({
      SERVICE_CODE: String(r.SERVICE_CODE ?? r.service_code ?? ""),
      ID_NUMBER: String(r.ID_NUMBER ?? r.id_number ?? ""),
      NAME_AR: String(r.NAME_AR ?? r.name_ar ?? ""),
      NAME_EN: String(r.NAME_EN ?? r.name_en ?? ""),
      DAYS_COUNT: Number(r.DAYS_COUNT ?? r.days_count ?? 0),
      ENTRY_DATE_GREGORIAN: String(r.ENTRY_DATE_GREGORIAN ?? r.entry_date_gregorian ?? ""),
      EXIT_DATE_GREGORIAN: String(r.EXIT_DATE_GREGORIAN ?? r.exit_date_gregorian ?? ""),
      ENTRY_DATE_HIJRI: String(r.ENTRY_DATE_HIJRI ?? r.entry_date_hijri ?? ""),
      EXIT_DATE_HIJRI: String(r.EXIT_DATE_HIJRI ?? r.exit_date_hijri ?? ""),
      REPORT_ISSUE_DATE: String(r.REPORT_ISSUE_DATE ?? r.report_issue_date ?? ""),
      NATIONALITY_AR: String(r.NATIONALITY_AR ?? r.nationality_ar ?? ""),
      NATIONALITY_EN: String(r.NATIONALITY_EN ?? r.nationality_en ?? ""),
      DOCTOR_NAME_AR: String(r.DOCTOR_NAME_AR ?? r.doctor_name_ar ?? ""),
      DOCTOR_NAME_EN: String(r.DOCTOR_NAME_EN ?? r.doctor_name_en ?? ""),
      JOB_TITLE_AR: String(r.JOB_TITLE_AR ?? r.job_title_ar ?? ""),
      JOB_TITLE_EN: String(r.JOB_TITLE_EN ?? r.job_title_en ?? ""),
      HOSPITAL_NAME_AR: String(r.HOSPITAL_NAME_AR ?? r.hospital_name_ar ?? ""),
      HOSPITAL_NAME_EN: String(r.HOSPITAL_NAME_EN ?? r.hospital_name_en ?? ""),
      PRINT_DATE: String(r.PRINT_DATE ?? r.print_date ?? ""),
      PRINT_TIME: String(r.PRINT_TIME ?? r.print_time ?? ""),
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ar-SA")
  }

  if (isInitializing) {
    return (
      <div className="container max-w-md mx-auto p-4 pb-20 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      {pptxProgressDialog}
      {pdfProgressDialog}
      <BackButton />
      <PageHeader
        title="نتائج البحث"
        description={`تم العثور على ${searchResults.length} تقرير`}
        icon={<SearchIcon className="h-8 w-8" />}
      />

      {error && <AlertMessage type="error" title="خطأ" message={error} />}

      {searchResults.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">لم يتم العثور على نتائج</p>
          <Button onClick={() => router.push("/home")} className="mt-4 bg-blue-500 hover:bg-blue-600">
            العودة إلى الصفحة الرئيسية
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {searchResults.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle className="text-lg">{report.name_ar}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">رمز الخدمة:</span>
                    <p>{report.service_code}</p>
                  </div>
                  <div>
                    <span className="font-medium">رقم الهوية:</span>
                    <p>{report.id_number}</p>
                  </div>
                  <div>
                    <span className="font-medium">تاريخ الدخول:</span>
                    <p>{formatDate(report.entry_date_gregorian)}</p>
                  </div>
                  <div>
                    <span className="font-medium">تاريخ الخروج:</span>
                    <p>{formatDate(report.exit_date_gregorian)}</p>
                  </div>
                  <div>
                    <span className="font-medium">عدد الأيام:</span>
                    <p>{report.days_count}</p>
                  </div>
                  <div>
                    <span className="font-medium">تاريخ الإنشاء:</span>
                    <p>{new Date(report.created_at).toLocaleDateString("ar-SA")}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button onClick={() => handleAddSimilar(report)} className="bg-blue-500 hover:bg-blue-600" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    إضافة مشابه
                  </Button>
                  <Button onClick={() => handleEdit(report)} className="bg-yellow-500 hover:bg-yellow-600" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    تعديل
                  </Button>
                </div>
                <div className={`grid gap-2 w-full ${pptxEnabled ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <Button onClick={() => handleToggleDisable(report)} className="bg-red-500 hover:bg-red-600" size="sm">
                    <Ban className="mr-2 h-4 w-4" />
                    تعطيل
                  </Button>
                  <Button onClick={() => handleDownloadPDF(report)} className="bg-purple-500 hover:bg-purple-600" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                  {pptxEnabled && (
                    <Button onClick={() => handleDownloadPPTX(report)} className="bg-green-500 hover:bg-green-600" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      PPTX
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container max-w-md mx-auto p-4 pb-20 flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  )
}
