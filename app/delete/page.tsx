"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { PageHeader } from "@/components/ui-custom/page-header"
import { BackButton } from "@/components/ui-custom/back-button"
import { Trash2, SearchIcon, AlertTriangle, Hash, Loader2, ArrowLeft, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { motion } from "framer-motion"
import { Separator } from "@/components/ui/separator"
import { addActivity } from "@/lib/activities-service"

interface Report {
  id: string
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
  [key: string]: any
}

export default function DeleteReportPage() {
  const router = useRouter()
  const [searchMode, setSearchMode] = useState(true)
  const [serviceCode, setServiceCode] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    // التحقق من تسجيل الدخول
    const userId = localStorage.getItem("user_id")
    if (!userId) {
      router.push("/")
      return
    }

    // التحقق مما إذا كان هناك تقرير للحذف في التخزين المحلي
    const reportToDelete = localStorage.getItem("report_to_delete")
    if (reportToDelete) {
      const parsedReport = JSON.parse(reportToDelete)
      setReport(parsedReport)
      setSearchMode(false)
      // مسح التخزين المحلي بعد استخدامه
      localStorage.removeItem("report_to_delete")
    }
  }, [router])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!serviceCode && !idNumber) {
      setError("يرجى إدخال رمز الخدمة أو رقم الهوية")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const userId = localStorage.getItem("user_id")
      let query = supabase.from("reports").select("*").eq("user_id", userId).eq("is_deleted", false)

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

      // إذا وجدنا أكثر من نتيجة، نخزنها في التخزين المحلي ونوجه المستخدم إلى صفحة البحث
      if (data.length > 1) {
        localStorage.setItem("search_results", JSON.stringify(data))
        router.push("/search")
        return
      }

      // إذا وجدنا نتيجة واحدة، نعرضها للحذف
      setReport(data[0])
      setSearchMode(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    setConfirmDialogOpen(false)

    try {
      if (!report) {
        throw new Error("لم يتم العثور على التقرير")
      }

      const userId = localStorage.getItem("user_id")
      if (!userId) {
        throw new Error("يرجى تسجيل الدخول مرة أخرى")
      }

      // تحديث حالة التقرير إلى محذوف
      const { error: updateError } = await supabase
        .from("reports")
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id)

      if (updateError) {
        throw new Error("حدث خطأ أثناء حذف التقرير")
      }

      // إضافة نشاط حذف
      await addActivity(
        userId,
        "delete",
        "تم حذف تقرير",
        `تم حذف تقرير للمريض ${report.name_ar} برقم هوية ${report.id_number}`,
        report.id,
      )

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ar-SA")
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
    <div className="container max-w-md mx-auto p-4 pb-20">
      <BackButton />
      <PageHeader
        title={<span className="gradient-heading text-2xl">حذف تقرير</span>}
        description={searchMode ? "البحث عن تقرير للحذف" : "حذف التقرير"}
        icon={<Trash2 className="h-8 w-8 text-red-500" />}
      />

      {searchMode ? (
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
          <Card className="glass-card overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-red-500 to-red-600"></div>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <SearchIcon className="ml-2 h-5 w-5 text-red-600" />
                البحث عن تقرير
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                {error && (
                  <AlertMessage type="error" title="خطأ في البحث" message={error} onClose={() => setError(null)} />
                )}

                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="serviceCode" className="text-red-900 flex items-center gap-1.5">
                    <Hash className="h-4 w-4 text-red-600" />
                    رمز الخدمة
                  </Label>
                  <Input
                    id="serviceCode"
                    value={serviceCode}
                    onChange={(e) => setServiceCode(e.target.value)}
                    placeholder="أدخل رمز الخدمة"
                    className="border-red-200 focus:border-red-400"
                  />
                </motion.div>

                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="idNumber" className="text-red-900 flex items-center gap-1.5">
                    <Hash className="h-4 w-4 text-red-600" />
                    رقم الهوية
                  </Label>
                  <Input
                    id="idNumber"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="أدخل رقم الهوية"
                    className="border-red-200 focus:border-red-400"
                  />
                </motion.div>

                <motion.div className="text-sm text-muted-foreground mb-4" variants={itemVariants}>
                  أدخل رمز الخدمة أو رقم الهوية أو كليهما للبحث عن التقرير
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md"
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
            <div className="h-2 bg-gradient-to-r from-red-500 to-red-600"></div>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Trash2 className="ml-2 h-5 w-5 text-red-600" />
                معلومات التقرير
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <AlertMessage type="error" title="خطأ في حذف التقرير" message={error} onClose={() => setError(null)} />
              )}
              {success && <AlertMessage type="success" title="تم الحذف بنجاح" message="تم حذف التقرير بنجاح" />}

              {report && !success && (
                <motion.div className="space-y-4" variants={containerVariants}>
                  <motion.div className="grid grid-cols-2 gap-4" variants={itemVariants}>
                    <div className="space-y-1">
                      <Label className="text-red-900 flex items-center gap-1.5">
                        <Hash className="h-4 w-4 text-red-600" />
                        رمز الخدمة
                      </Label>
                      <div className="p-2 bg-red-50 rounded-md border border-red-100 text-red-800">
                        {report.service_code}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-red-900 flex items-center gap-1.5">
                        <Hash className="h-4 w-4 text-red-600" />
                        رقم الهوية
                      </Label>
                      <div className="p-2 bg-red-50 rounded-md border border-red-100 text-red-800">
                        {report.id_number}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div className="space-y-1" variants={itemVariants}>
                    <Label className="text-red-900">الاسم (عربي)</Label>
                    <div className="p-2 bg-red-50 rounded-md border border-red-100 text-red-800">{report.name_ar}</div>
                  </motion.div>

                  <motion.div className="space-y-1" variants={itemVariants}>
                    <Label className="text-red-900">الاسم (إنجليزي)</Label>
                    <div className="p-2 bg-red-50 rounded-md border border-red-100 text-red-800">{report.name_en}</div>
                  </motion.div>

                  <motion.div className="grid grid-cols-2 gap-4" variants={itemVariants}>
                    <div className="space-y-1">
                      <Label className="text-red-900">تاريخ الدخول</Label>
                      <div className="p-2 bg-red-50 rounded-md border border-red-100 text-red-800">
                        {formatDate(report.entry_date_gregorian)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-red-900">تاريخ الخروج</Label>
                      <div className="p-2 bg-red-50 rounded-md border border-red-100 text-red-800">
                        {formatDate(report.exit_date_gregorian)}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div className="space-y-1" variants={itemVariants}>
                    <Label className="text-red-900">عدد الأيام</Label>
                    <div className="p-2 bg-red-50 rounded-md border border-red-100 text-red-800">
                      {report.days_count}
                    </div>
                  </motion.div>

                  <motion.div className="space-y-1" variants={itemVariants}>
                    <Label className="text-red-900">اسم الطبيب</Label>
                    <div className="p-2 bg-red-50 rounded-md border border-red-100 text-red-800">
                      {report.doctor_name_ar}
                    </div>
                  </motion.div>

                  <motion.div className="space-y-1" variants={itemVariants}>
                    <Label className="text-red-900">اسم المستشفى</Label>
                    <div className="p-2 bg-red-50 rounded-md border border-red-100 text-red-800">
                      {report.hospital_name_ar}
                    </div>
                  </motion.div>

                  <Separator className="my-4" />

                  <motion.div
                    className="bg-red-50 border-2 border-red-200 rounded-md p-4 text-red-700 flex items-start space-x-2 space-x-reverse"
                    variants={itemVariants}
                    animate={{
                      boxShadow: [
                        "0px 0px 0px rgba(239, 68, 68, 0.2)",
                        "0px 0px 8px rgba(239, 68, 68, 0.5)",
                        "0px 0px 0px rgba(239, 68, 68, 0.2)",
                      ],
                      transition: {
                        repeat: Number.POSITIVE_INFINITY,
                        duration: 2,
                      },
                    }}
                  >
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-600" />
                    <div>
                      <h4 className="font-bold">تحذير</h4>
                      <p className="text-sm">سيتم حذف هذا التقرير بشكل نهائي. هل أنت متأكد من أنك تريد المتابعة؟</p>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              {!success ? (
                <motion.div className="flex gap-2 w-full" variants={itemVariants}>
                  <Button
                    onClick={() => setConfirmDialogOpen(true)}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md"
                    disabled={loading || !report}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري الحذف...
                      </>
                    ) : (
                      <>
                        <Trash2 className="ml-2 h-4 w-4" />
                        حذف التقرير
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-gray-200 hover:bg-gray-50"
                    onClick={() => router.push("/home")}
                  >
                    <X className="ml-2 h-4 w-4" />
                    إلغاء
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-full"
                >
                  <Button
                    onClick={() => router.push("/home")}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                  >
                    <ArrowLeft className="ml-2 h-4 w-4" />
                    العودة إلى الصفحة الرئيسية
                  </Button>
                </motion.div>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      )}

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-900">تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من أنك تريد حذف هذا التقرير؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              className="border-gray-200"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="ml-2 h-4 w-4" />
                  تأكيد الحذف
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
