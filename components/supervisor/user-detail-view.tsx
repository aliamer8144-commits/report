"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"
import { AnimatePresence } from "framer-motion"
import {
  ArrowRight,
  User,
  Phone,
  Mail,
  Calendar,
  FileBarChart,
  Clock,
  Hash,
  AlertTriangle,
  Shield,
  ShieldOff,
  ShieldCheck,
  Settings,
  Loader2,
  Edit,
  Ban,
  FileDown,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react"
import {
  downloadPptxViaApi,
  downloadPdfViaApi,
  type ReportDataForPptx,
} from "@/lib/pptx-service"
import { SuspendUserDialog } from "./suspend-user-dialog"
import { UnsuspendUserDialog } from "./unsuspend-user-dialog"

/* ============================================================
   Types
   ============================================================ */

interface UserDetailViewProps {
  userId: string
  onBack: () => void
}

interface UserInfo {
  id: string
  username: string
  full_name: string | null
  phone: string | null
  email: string | null
  role: string
  created_at: string
  is_suspended: boolean
  limit_type: string | null
  limit_value: number | null
  limit_date: string | null
  pptx_enabled: boolean
}

interface PeriodStats {
  period_report_count: number
  period_total_days: number
  period_start: string
  total_suspensions: number
  last_report_at: string | null
}

interface AllTimeStats {
  total_reports: number
  active_reports: number
  deleted_reports: number
}

interface CurrentLimit {
  limit_type: string | null
  limit_value: number | null
  limit_date: string | null
  set_by_username: string | null
  limit_set_at: string | null
}

interface ReportItem {
  id: string
  service_code: string
  id_number: string
  name_ar: string
  name_en: string
  days_count: number
  entry_date_gregorian: string
  exit_date_gregorian: string
  created_at: string
  pptx_enabled?: boolean
  [key: string]: any
}

interface SuspensionHistoryItem {
  id: string
  suspended_at: string
  suspension_reason: string
  reactivated_at: string | null
  days_count_at_suspension: number
  reports_count_at_suspension: number
}

/* ============================================================
   Animation variants
   ============================================================ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
}

/* ============================================================
   Helpers
   ============================================================ */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
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

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—"
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

function getLimitTypeLabel(type: string | null): string {
  switch (type) {
    case "days_count":
      return "بعدد الأيام"
    case "reports_count":
      return "بعدد التقارير"
    case "specific_date":
      return "إلى تاريخ محدد"
    default:
      return "—"
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "user":
      return "مستخدم"
    case "supervisor":
      return "مشرف"
    case "admin":
      return "مدير"
    default:
      return role
  }
}

/* ============================================================
   Loading Skeleton
   ============================================================ */

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-4" dir="rtl">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-8 w-40" />
        </div>
      </div>

      {/* User info card skeleton */}
      <Card className="bg-[#f2f2f7] rounded-2xl">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Limit card skeleton */}
      <Skeleton className="h-32 rounded-2xl" />

      {/* Reports section skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    </div>
  )
}

/* ============================================================
   Report Card Component (expandable)
   ============================================================ */

function ReportCard({ report, index: _index }: { report: ReportItem; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const toPayload = (): ReportDataForPptx => ({
    SERVICE_CODE: report.service_code,
    ID_NUMBER: report.id_number,
    NAME_AR: report.name_ar,
    NAME_EN: report.name_en || "",
    DAYS_COUNT: report.days_count,
    ENTRY_DATE_GREGORIAN: report.entry_date_gregorian || "",
    EXIT_DATE_GREGORIAN: report.exit_date_gregorian || "",
    ENTRY_DATE_HIJRI: report.entry_date_hijri || "",
    EXIT_DATE_HIJRI: report.exit_date_hijri || "",
    REPORT_ISSUE_DATE: report.report_issue_date || "",
    NATIONALITY_AR: report.nationality_ar || "",
    NATIONALITY_EN: report.nationality_en || "",
    DOCTOR_NAME_AR: report.doctor_name_ar || "",
    DOCTOR_NAME_EN: report.doctor_name_en || "",
    JOB_TITLE_AR: report.job_title_ar || "",
    JOB_TITLE_EN: report.job_title_en || "",
    HOSPITAL_NAME_AR: report.hospital_name_ar || "",
    HOSPITAL_NAME_EN: report.hospital_name_en || "",
    PRINT_DATE: report.print_date || "",
    PRINT_TIME: report.print_time || "",
  })

  const handleDownload = async (kind: "pdf" | "pptx") => {
    setDownloading(kind)
    try {
      const payload = toPayload()
      if (kind === "pptx") await downloadPptxViaApi(payload)
      else await downloadPdfViaApi(payload)
    } catch (err) {
      console.error(`Download ${kind} error:`, err)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden"
    >
      {/* Card header (always visible) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-right hover:bg-[#f2f2f7]/60 transition-colors"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
          <FileBarChart className="w-4 h-4 text-[#007AFF]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#1c1c1e] truncate leading-tight">
            {report.name_ar}
          </p>
          <div className="flex items-center gap-2.5 text-[11px] text-gray-400 mt-0.5">
            <span className="flex items-center gap-0.5">
              <Hash className="w-2.5 h-2.5" />
              {report.id_number}
            </span>
            <span className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {report.days_count} يوم
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-gray-300">{formatDate(report.created_at)}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-300" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-300" />
          )}
        </div>
      </button>

      {/* Expanded decoration - download options */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-3 py-2.5">
              <p className="text-[10px] text-gray-400 font-medium mb-2">تنزيل التقرير</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload("pdf")}
                  disabled={downloading === "pdf"}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#AF52DE]/10 text-[#AF52DE] text-[12px] font-semibold hover:bg-[#AF52DE]/20 active:scale-[0.97] transition-all disabled:opacity-50"
                >
                  {downloading === "pdf" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  PDF
                </button>
                <button
                  onClick={() => handleDownload("pptx")}
                  disabled={downloading === "pptx"}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#34C759]/10 text-[#34C759] text-[12px] font-semibold hover:bg-[#34C759]/20 active:scale-[0.97] transition-all disabled:opacity-50"
                >
                  {downloading === "pptx" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  PPTX
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ============================================================
   Reports Section Component (collapsible)
   ============================================================ */

function ReportsSection({
  title,
  reports,
  totalCount,
  totalDays,
  isLoading,
  accentColor = "#007AFF",
}: {
  title: string
  reports: ReportItem[]
  totalCount: number
  totalDays: number
  isLoading: boolean
  accentColor?: string
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.div variants={itemVariants}>
      {/* Section header - clickable to toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 mb-3 group"
      >
        <div className="h-px flex-1 bg-gray-100" />
        <div className="flex items-center gap-1.5 px-2">
          <h3 className="text-sm font-bold text-gray-700">{title}</h3>
          <Badge
            variant="outline"
            className="text-[10px] border-0 font-medium px-1.5 py-0"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            {totalCount}
          </Badge>
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
          )}
        </div>
        <div className="h-px flex-1 bg-gray-100" />
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {/* Stats summary */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <Badge
                variant="outline"
                className="bg-[#007AFF]/10 text-[#007AFF] border-0 text-[10px] font-medium px-1.5 py-0"
              >
                {totalCount} تقرير
              </Badge>
              <Badge
                variant="outline"
                className="bg-[#FF9500]/10 text-[#FF9500] border-0 text-[10px] font-medium px-1.5 py-0"
              >
                {totalDays} يوم
              </Badge>
            </div>

            {/* Reports list */}
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <FileBarChart className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs">لا توجد تقارير</p>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-1.5 max-h-80 overflow-y-auto pr-1"
              >
                {reports.map((report, index) => (
                  <ReportCard key={report.id} report={report} index={index} />
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ============================================================
   Main Component
   ============================================================ */

export default function UserDetailView({ userId, onBack }: UserDetailViewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null)
  const [allTimeStats, setAllTimeStats] = useState<AllTimeStats | null>(null)
  const [currentLimit, setCurrentLimit] = useState<CurrentLimit | null>(null)
  const [periodReports, setPeriodReports] = useState<ReportItem[]>([])
  const [allTimeReports, setAllTimeReports] = useState<ReportItem[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [suspensionHistory, setSuspensionHistory] = useState<SuspensionHistoryItem[]>([])
  const [currentSuspension, setCurrentSuspension] = useState<SuspensionHistoryItem | null>(null)

  // Dialogs
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [unsuspendOpen, setUnsuspendOpen] = useState(false)

  const supabase = createClientSupabaseClient()

  const fetchUserData = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      // 1. Fetch user basic info
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          "id, username, full_name, phone, email, role, created_at, is_suspended, limit_type, limit_value, limit_date, pptx_enabled"
        )
        .eq("id", userId)
        .single()

      if (userError) throw new Error("حدث خطأ أثناء جلب بيانات المستخدم")
      if (!userData) throw new Error("لم يتم العثور على المستخدم")

      setUserInfo(userData as unknown as UserInfo)

      // Fetch all remaining data in parallel
      const [periodStatsRes, allTimeStatsRes, currentLimitRes] =
        await Promise.all([
          // 2. Period stats
          supabase
            .from("user_period_stats")
            .select(
              "period_report_count, period_total_days, period_start, total_suspensions, last_report_at"
            )
            .eq("user_id", userId)
            .single(),

          // 3. All-time stats
          supabase
            .from("user_report_counts")
            .select("total_reports, active_reports, deleted_reports")
            .eq("user_id", userId)
            .single(),

          // 4. Current limit
          supabase
            .from("user_current_limit")
            .select(
              "limit_type, limit_value, limit_date, set_by_username, limit_set_at"
            )
            .eq("user_id", userId)
            .single(),
        ])

      if (periodStatsRes.data) {
        setPeriodStats(periodStatsRes.data as unknown as PeriodStats)
      }
      if (allTimeStatsRes.data) {
        setAllTimeStats(allTimeStatsRes.data as unknown as AllTimeStats)
      }
      if (currentLimitRes.data) {
        setCurrentLimit(currentLimitRes.data as unknown as CurrentLimit)
      }

      setLoading(false)

      // 5. & 6. Fetch reports (after loading finishes so skeleton resolves)
      setReportsLoading(true)

      const periodStart = periodStatsRes.data?.period_start
      const userCreatedAt = userData.created_at

      const [periodReportsRes, allTimeReportsRes] = await Promise.all([
        // Period reports (since last unsuspension)
        supabase
          .from("reports")
          .select("id, service_code, id_number, name_ar, name_en, days_count, entry_date_gregorian, exit_date_gregorian, entry_date_hijri, exit_date_hijri, report_issue_date, nationality_ar, nationality_en, doctor_name_ar, doctor_name_en, job_title_ar, job_title_en, hospital_name_ar, hospital_name_en, print_date, print_time, created_at")
          .eq("user_id", userId)
          .eq("is_disabled", false)
          .gte("created_at", periodStart || userCreatedAt)
          .order("created_at", { ascending: false }),

        // All-time reports
        supabase
          .from("reports")
          .select("id, service_code, id_number, name_ar, name_en, days_count, entry_date_gregorian, exit_date_gregorian, entry_date_hijri, exit_date_hijri, report_issue_date, nationality_ar, nationality_en, doctor_name_ar, doctor_name_en, job_title_ar, job_title_en, hospital_name_ar, hospital_name_en, print_date, print_time, created_at")
          .eq("user_id", userId)
          .eq("is_disabled", false)
          .gte("created_at", userCreatedAt)
          .order("created_at", { ascending: false }),
      ])

      if (periodReportsRes.data) {
        setPeriodReports(periodReportsRes.data as unknown as ReportItem[])
      }
      if (allTimeReportsRes.data) {
        setAllTimeReports(allTimeReportsRes.data as unknown as ReportItem[])
      }

      // 7. Fetch suspension history
      const { data: suspensionsData } = await supabase
        .from("user_suspensions")
        .select("id, suspended_at, suspension_reason, reactivated_at, days_count_at_suspension, reports_count_at_suspension")
        .eq("user_id", userId)
        .order("suspended_at", { ascending: false })

      if (suspensionsData) {
        setSuspensionHistory(suspensionsData as unknown as SuspensionHistoryItem[])
        const active = (suspensionsData as unknown as SuspensionHistoryItem[]).find((s) => !s.reactivated_at)
        setCurrentSuspension(active || null)
      }

      setReportsLoading(false)
    } catch (err: any) {
      console.error("UserDetailView fetch error:", err)
      setError(err.message || "حدث خطأ غير متوقع")
      setLoading(false)
      setReportsLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  /* ============================================================
     Error state
     ============================================================ */
  if (error) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 shadow-sm max-w-sm w-full text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-[#FF3B30]/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              حدث خطأ
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">{error}</p>
          </div>
          <Button
            onClick={onBack}
            className="bg-[#007AFF] hover:opacity-95 text-white shadow-md"
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
        </motion.div>
      </div>
    )
  }

  /* ============================================================
     Loading state
     ============================================================ */
  if (loading || !userInfo) {
    return (
      <div className="min-h-screen bg-[#f2f2f7]" dir="rtl">
        <LoadingSkeleton />
      </div>
    )
  }

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="min-h-screen bg-[#f2f2f7]" dir="rtl">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        {/* ── 1. Header ── */}
        <motion.div
          variants={itemVariants}
          className="space-y-3 mb-1"
        >
          {/* الصف الأول: رجوع + العملاء */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[#007AFF] hover:text-[#0062CC] transition-colors group"
          >
            <ArrowRight className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[13px] font-medium">العملاء</span>
          </button>

          {/* الصف الثاني: اسم العميل + الحالة */}
          <div className="flex items-center justify-between">
            <h1 className="text-[17px] font-bold text-[#1c1c1e] truncate">
              {userInfo.full_name || userInfo.username}
            </h1>
            <div className="flex items-center gap-1.5 shrink-0 mr-3">
              {userInfo.is_suspended ? (
                <>
                  <XCircle className="w-4 h-4 text-[#FF3B30]" />
                  <span className="text-[12px] font-medium text-[#FF3B30]">معلّق</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-[#34C759]" />
                  <span className="text-[12px] font-medium text-[#34C759]">نشط</span>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── 2. User Info Card ── */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="pb-2 px-3.5 pt-3 flex flex-row items-center justify-between">
              <CardTitle className="text-[15px] text-gray-800 flex items-center gap-2">
                <User className="w-4 h-4 text-[#007AFF]" />
                معلومات المستخدم
              </CardTitle>
              <div className="flex items-center gap-1">
                {userInfo.is_suspended ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-emerald-500 hover:text-emerald-600 hover:bg-emerald-100 transition-colors"
                    title="إلغاء التعليق"
                    onClick={() => setUnsuspendOpen(true)}
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-100 transition-colors"
                    title="تعليق الحساب"
                    onClick={() => setSuspendOpen(true)}
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-400 hover:text-[#007AFF] hover:bg-[#007AFF]/5 transition-colors"
                  title="تعديل (قريباً)"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-3.5 pb-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                {/* Full name */}
                <div className="flex items-center gap-2.5 py-1.5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-[#007AFF]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">الاسم الكامل</p>
                    <p className="text-[12px] font-semibold text-gray-800 truncate">
                      {userInfo.full_name || "—"}
                    </p>
                  </div>
                </div>

                {/* Username */}
                <div className="flex items-center gap-2.5 py-1.5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#AF52DE]/10 flex items-center justify-center">
                    <Hash className="w-3.5 h-3.5 text-[#AF52DE]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">اسم المستخدم</p>
                    <p className="text-[12px] font-semibold text-gray-800 truncate">
                      {userInfo.username}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-2.5 py-1.5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#34C759]/10 flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-[#34C759]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">الهاتف</p>
                    <p className="text-[12px] font-semibold text-gray-800 truncate" dir="ltr">
                      {userInfo.phone || "—"}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-2.5 py-1.5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#FF9500]/10 flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-[#FF9500]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">البريد</p>
                    <p className="text-[12px] font-semibold text-gray-800 truncate" dir="ltr">
                      {userInfo.email || "—"}
                    </p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-center gap-2.5 py-1.5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 text-[#007AFF]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">الدور</p>
                    <p className="text-[12px] font-semibold text-gray-800">
                      {getRoleLabel(userInfo.role)}
                    </p>
                  </div>
                </div>

                {/* Created at */}
                <div className="flex items-center gap-2.5 py-1.5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#34C759]/10 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-[#34C759]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">تاريخ الإنشاء</p>
                    <p className="text-[12px] font-semibold text-gray-800">
                      {formatDate(userInfo.created_at)}
                    </p>
                  </div>
                </div>

                {/* PPTX enabled */}
                <div className="flex items-center gap-2.5 py-1.5">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${userInfo.pptx_enabled ? "bg-[#34C759]/10" : "bg-[#FF3B30]/10"}`}>
                    <FileDown className={`w-3.5 h-3.5 ${userInfo.pptx_enabled ? "text-[#34C759]" : "text-[#FF3B30]"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">تنزيل PPTX</p>
                    <p className="text-[12px] font-semibold text-gray-800">
                      {userInfo.pptx_enabled ? "مسموح ✓" : "غير مسموح ✗"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 3. Stats Cards ── */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center justify-center py-3 bg-[#f2f2f7] rounded-xl">
              <span className="text-xl font-bold text-[#007AFF]">
                {periodStats?.period_report_count ?? 0}
              </span>
              <span className="text-[10px] text-[#007AFF] mt-0.5 font-medium">
                تقارير الفترة
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-3 bg-[#f2f2f7] rounded-xl">
              <span className="text-xl font-bold text-[#FF9500]">
                {periodStats?.period_total_days ?? 0}
              </span>
              <span className="text-[10px] text-[#FF9500] mt-0.5 font-medium">
                أيام الفترة
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-3 bg-[#f2f2f7] rounded-xl">
              <span className="text-xl font-bold text-[#FF3B30]">
                {periodStats?.total_suspensions ?? 0}
              </span>
              <span className="text-[10px] text-[#FF3B30] mt-0.5 font-medium">
                مرات التعليق
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── All-time summary badges ── */}
        {allTimeStats && (
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center gap-2 flex-wrap"
          >
            <Badge
              variant="outline"
              className="bg-[#007AFF]/10 text-[#007AFF] border-0 font-medium"
            >
              <FileBarChart className="w-3 h-3 ml-1" />
              إجمالي: {allTimeStats.total_reports}
            </Badge>
            <Badge
              variant="outline"
              className="bg-[#34C759]/10 text-[#34C759] border-0 font-medium"
            >
              نشط: {allTimeStats.active_reports}
            </Badge>
            <Badge
              variant="outline"
              className="bg-gray-50 text-gray-600 border-gray-200 font-medium"
            >
              محذوف: {allTimeStats.deleted_reports}
            </Badge>
          </motion.div>
        )}

        {/* ── 4. Current Limit Card ── */}
        {currentLimit && currentLimit.limit_type && (
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden bg-white rounded-2xl shadow-sm border-0">
              <CardHeader className="pb-1.5 px-3.5 pt-3">
                <CardTitle className="text-[13px] text-gray-800 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-[#FF9500]" />
                  الحد الحالي
                  <Badge
                    variant="outline"
                    className="bg-[#FF9500]/10 text-[#FF9500] border-0 text-[10px] font-medium mr-auto"
                  >
                    {getLimitTypeLabel(currentLimit.limit_type)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-3.5 pb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-[#f2f2f7]">
                    <p className="text-[10px] text-gray-400">
                      {currentLimit.limit_type === "specific_date"
                        ? "تاريخ الانتهاء"
                        : "قيمة الحد"}
                    </p>
                    <p className="text-[12px] font-bold text-gray-800">
                      {currentLimit.limit_type === "specific_date"
                        ? formatDate(currentLimit.limit_date)
                        : currentLimit.limit_value
                        ? `${currentLimit.limit_value}`
                        : "—"}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#f2f2f7]">
                    <p className="text-[10px] text-gray-400">تم التعيين بواسطة</p>
                    <p className="text-[12px] font-bold text-gray-800">
                      {currentLimit.set_by_username || "—"}
                    </p>
                  </div>
                </div>
                {currentLimit.limit_set_at && (
                  <p className="text-[10px] text-gray-400 text-center">
                    تاريخ التعيين: {formatDateTime(currentLimit.limit_set_at)}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── 5. Period Reports Section ── */}
        <ReportsSection
          title="تقارير الفترة الحالية"
          reports={periodReports}
          totalCount={periodStats?.period_report_count ?? 0}
          totalDays={periodStats?.period_total_days ?? 0}
          isLoading={reportsLoading}
          accentColor="#007AFF"
        />

        {/* ── 6. All-Time Reports Section ── */}
        <ReportsSection
          title="جميع التقارير"
          reports={allTimeReports}
          totalCount={allTimeStats?.total_reports ?? 0}
          totalDays={periodStats?.period_total_days ?? 0}
          isLoading={reportsLoading}
          accentColor="#34C759"
        />

        {/* ── 7. Suspension History Section ── */}
        {suspensionHistory.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-100" />
              <h3 className="text-base font-bold text-[#FF3B30] px-2">
                سجل التعليقات
              </h3>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              {suspensionHistory.map((record) => (
                <motion.div
                  key={record.id}
                  variants={itemVariants}
                  className={`rounded-xl border p-3 ${
                    record.reactivated_at
                      ? "bg-[#f2f2f7] border-0"
                      : "bg-[#FF3B30]/5 border-[#FF3B30]/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                          record.reactivated_at
                            ? "bg-gray-100"
                            : "bg-[#FF3B30]/10"
                        }`}
                      >
                        {record.reactivated_at ? (
                          <ShieldCheck className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ShieldOff className="w-4 h-4 text-[#FF3B30]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 ${
                              record.reactivated_at
                                ? "bg-gray-100 text-gray-600 border-gray-200"
                                : "bg-[#FF3B30]/10 text-[#FF3B30] border-0"
                            }`}
                          >
                            {record.reactivated_at ? "تم الإلغاء" : "معلّق حالياً"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                          {record.suspension_reason || "بدون سبب"}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {record.days_count_at_suspension} يوم
                          </span>
                          <span className="flex items-center gap-1">
                            <FileBarChart className="w-3 h-3" />
                            {record.reports_count_at_suspension} تقرير
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-[10px] text-gray-400">
                        {formatDateTime(record.suspended_at)}
                      </p>
                      {record.reactivated_at && (
                        <p className="text-[10px] text-emerald-500 mt-0.5">
                          إلغاء: {formatDateTime(record.reactivated_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Bottom spacing */}
        <div className="h-2" />
      </motion.div>

      {/* ── Suspend / Unsuspend Dialogs ── */}
      <SuspendUserDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        userId={userId}
        userFullName={userInfo.full_name || userInfo.username}
        currentStats={{
          periodReportCount: periodStats?.period_report_count ?? 0,
          periodTotalDays: periodStats?.period_total_days ?? 0,
        }}
        onSuccess={fetchUserData}
      />

      <UnsuspendUserDialog
        open={unsuspendOpen}
        onOpenChange={setUnsuspendOpen}
        userId={userId}
        userFullName={userInfo.full_name || userInfo.username}
        suspensionInfo={currentSuspension
          ? {
              suspendedAt: currentSuspension.suspended_at,
              reason: currentSuspension.suspension_reason,
              daysCount: currentSuspension.days_count_at_suspension,
              reportsCount: currentSuspension.reports_count_at_suspension,
            }
          : null
        }
        onSuccess={fetchUserData}
      />
    </div>
  )
}
