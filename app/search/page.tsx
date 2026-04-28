"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { PageHeader } from "@/components/ui-custom/page-header"
import { BackButton } from "@/components/ui-custom/back-button"
import { SearchIcon, PlusCircle, Edit, Trash2, Download, Eye } from "lucide-react"
import { type ReportData } from "@/lib/report-generator"
import { createClientSupabaseClient } from "@/lib/supabase"
import { usePptxDownloadWithProgress, usePdfDownloadWithProgress } from "@/components/ui-custom/pptx-download-progress"

interface Report extends ReportData {
  id: string
  created_at: string
}

export default function SearchPage() {
  const router = useRouter()
  const [searchResults, setSearchResults] = useState<Report[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const { downloadPptx, pptxProgressDialog } = usePptxDownloadWithProgress()
  const { downloadPdf, pdfProgressDialog } = usePdfDownloadWithProgress()

  useEffect(() => {
    // تهيئة عميل Supabase
    const init = async () => {
      try {
        const supabase = createClientSupabaseClient()
        setIsInitializing(false)
      } catch (err) {
        console.error("Failed to initialize Supabase:", err)
        setError("فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.")
        setIsInitializing(false)
      }
    }

    // التحقق من تسجيل الدخول
    const userId = localStorage.getItem("user_id")
    if (!userId) {
      router.push("/")
      return
    }

    // جلب نتائج البحث من التخزين المحلي
    const results = localStorage.getItem("search_results")
    if (results) {
      setSearchResults(JSON.parse(results))
    } else {
      router.push("/home")
    }

    init()
  }, [router])

  const handleAddSimilar = (report: Report) => {
    localStorage.setItem("report_template", JSON.stringify(report))
    router.push("/add")
  }

  const handleEdit = (report: Report) => {
    localStorage.setItem("report_to_edit", JSON.stringify(report))
    router.push("/edit")
  }

  const handleDelete = (report: Report) => {
    localStorage.setItem("report_to_delete", JSON.stringify(report))
    router.push("/delete")
  }

  const handleView = (report: Report) => {
    localStorage.setItem("report_to_view", JSON.stringify(report))
    router.push("/view")
  }

  const handleDownloadPPTX = async (report: Report) => {
    const userId = localStorage.getItem("user_id")
    if (!userId) {
      setError("يجب تسجيل الدخول أولاً")
      return
    }

    await downloadPptx({
      SERVICE_CODE: (report as any).SERVICE_CODE ?? report.service_code,
      ID_NUMBER: (report as any).ID_NUMBER ?? report.id_number,
      NAME_AR: (report as any).NAME_AR ?? report.name_ar,
      NAME_EN: (report as any).NAME_EN ?? report.name_en,
      DAYS_COUNT: (report as any).DAYS_COUNT ?? report.days_count,
      ENTRY_DATE_GREGORIAN: (report as any).ENTRY_DATE_GREGORIAN ?? report.entry_date_gregorian,
      EXIT_DATE_GREGORIAN: (report as any).EXIT_DATE_GREGORIAN ?? report.exit_date_gregorian,
      ENTRY_DATE_HIJRI: (report as any).ENTRY_DATE_HIJRI ?? (report as any).entry_date_hijri,
      EXIT_DATE_HIJRI: (report as any).EXIT_DATE_HIJRI ?? (report as any).exit_date_hijri,
      REPORT_ISSUE_DATE: (report as any).REPORT_ISSUE_DATE ?? (report as any).report_issue_date,
      NATIONALITY_AR: (report as any).NATIONALITY_AR ?? (report as any).nationality_ar,
      NATIONALITY_EN: (report as any).NATIONALITY_EN ?? (report as any).nationality_en,
      DOCTOR_NAME_AR: (report as any).DOCTOR_NAME_AR ?? (report as any).doctor_name_ar,
      DOCTOR_NAME_EN: (report as any).DOCTOR_NAME_EN ?? (report as any).doctor_name_en,
      JOB_TITLE_AR: (report as any).JOB_TITLE_AR ?? (report as any).job_title_ar,
      JOB_TITLE_EN: (report as any).JOB_TITLE_EN ?? (report as any).job_title_en,
      HOSPITAL_NAME_AR: (report as any).HOSPITAL_NAME_AR ?? (report as any).hospital_name_ar,
      HOSPITAL_NAME_EN: (report as any).HOSPITAL_NAME_EN ?? (report as any).hospital_name_en,
      PRINT_DATE: (report as any).PRINT_DATE ?? (report as any).print_date,
      PRINT_TIME: (report as any).PRINT_TIME ?? (report as any).print_time,
    })
  }

  const handleDownloadPDF = async (report: Report) => {
    const userId = localStorage.getItem("user_id")
    if (!userId) {
      setError("يجب تسجيل الدخول أولاً")
      return
    }

    await downloadPdf({
      SERVICE_CODE: (report as any).SERVICE_CODE ?? report.service_code,
      ID_NUMBER: (report as any).ID_NUMBER ?? report.id_number,
      NAME_AR: (report as any).NAME_AR ?? report.name_ar,
      NAME_EN: (report as any).NAME_EN ?? report.name_en,
      DAYS_COUNT: (report as any).DAYS_COUNT ?? report.days_count,
      ENTRY_DATE_GREGORIAN: (report as any).ENTRY_DATE_GREGORIAN ?? report.entry_date_gregorian,
      EXIT_DATE_GREGORIAN: (report as any).EXIT_DATE_GREGORIAN ?? report.exit_date_gregorian,
      ENTRY_DATE_HIJRI: (report as any).ENTRY_DATE_HIJRI ?? (report as any).entry_date_hijri,
      EXIT_DATE_HIJRI: (report as any).EXIT_DATE_HIJRI ?? (report as any).exit_date_hijri,
      REPORT_ISSUE_DATE: (report as any).REPORT_ISSUE_DATE ?? (report as any).report_issue_date,
      NATIONALITY_AR: (report as any).NATIONALITY_AR ?? (report as any).nationality_ar,
      NATIONALITY_EN: (report as any).NATIONALITY_EN ?? (report as any).nationality_en,
      DOCTOR_NAME_AR: (report as any).DOCTOR_NAME_AR ?? (report as any).doctor_name_ar,
      DOCTOR_NAME_EN: (report as any).DOCTOR_NAME_EN ?? (report as any).doctor_name_en,
      JOB_TITLE_AR: (report as any).JOB_TITLE_AR ?? (report as any).job_title_ar,
      JOB_TITLE_EN: (report as any).JOB_TITLE_EN ?? (report as any).job_title_en,
      HOSPITAL_NAME_AR: (report as any).HOSPITAL_NAME_AR ?? (report as any).hospital_name_ar,
      HOSPITAL_NAME_EN: (report as any).HOSPITAL_NAME_EN ?? (report as any).hospital_name_en,
      PRINT_DATE: (report as any).PRINT_DATE ?? (report as any).print_date,
      PRINT_TIME: (report as any).PRINT_TIME ?? (report as any).print_time,
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
                <div className="grid grid-cols-3 gap-2 w-full">
                  <Button onClick={() => handleDelete(report)} className="bg-red-500 hover:bg-red-600" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    حذف
                  </Button>
                  <Button onClick={() => handleView(report)} className="bg-green-500 hover:bg-green-600" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    عرض
                  </Button>
                  <Button onClick={() => handleDownloadPPTX(report)} className="bg-purple-500 hover:bg-purple-600" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    PPTX
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full">
                  <Button onClick={() => handleDownloadPDF(report)} className="bg-purple-500 hover:bg-purple-600" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
