"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
} from "lucide-react"
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
  id_number: string
  name_ar: string
  days_count: number
  created_at: string
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

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
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
      <Card className="glass-card overflow-hidden border-none shadow-xl">
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
   Report Card Component
   ============================================================ */

function ReportCard({ report, index }: { report: ReportItem; index: number }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover="hover"
      initial="rest"
      className="group"
    >
      <motion.div
        variants={cardHover}
        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white/60 backdrop-blur-sm hover:bg-gradient-to-l hover:from-indigo-50/80 hover:to-purple-50/80 hover:border-indigo-200/60 hover:shadow-md transition-all duration-300"
      >
        {/* Report icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center group-hover:from-indigo-200 group-hover:to-purple-200 transition-colors duration-300">
          <FileBarChart className="w-5 h-5 text-indigo-500" />
        </div>

        {/* Report info */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {report.name_ar}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {report.id_number}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {report.days_count} يوم
            </span>
          </div>
        </div>

        {/* Date */}
        <div className="flex-shrink-0 text-left">
          <p className="text-xs text-gray-400">{formatDate(report.created_at)}</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ============================================================
   Reports Section Component
   ============================================================ */

function ReportsSection({
  title,
  reports,
  totalCount,
  totalDays,
  isLoading,
}: {
  title: string
  reports: ReportItem[]
  totalCount: number
  totalDays: number
  isLoading: boolean
}) {
  return (
    <motion.div variants={itemVariants} className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-l from-indigo-200 to-transparent" />
        <h3 className="text-base font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent px-2">
          {title}
        </h3>
        <div className="h-px flex-1 bg-gradient-to-r from-indigo-200 to-transparent" />
      </div>

      {/* Stats summary */}
      <div className="flex items-center gap-3 px-1">
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 font-medium"
        >
          <FileBarChart className="w-3 h-3 ml-1" />
          {totalCount} تقرير
        </Badge>
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 font-medium"
        >
          <Clock className="w-3 h-3 ml-1" />
          {totalDays} يوم
        </Badge>
      </div>

      {/* Reports list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <FileBarChart className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">لا توجد تقارير في هذه الفترة</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar"
        >
          {reports.map((report, index) => (
            <ReportCard key={report.id} report={report} index={index} />
          ))}
        </motion.div>
      )}
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

      setUserInfo(userData as UserInfo)

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
        setPeriodStats(periodStatsRes.data as PeriodStats)
      }
      if (allTimeStatsRes.data) {
        setAllTimeStats(allTimeStatsRes.data as AllTimeStats)
      }
      if (currentLimitRes.data) {
        setCurrentLimit(currentLimitRes.data as CurrentLimit)
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
          .select("id, id_number, name_ar, days_count, created_at")
          .eq("user_id", userId)
          .eq("is_deleted", false)
          .gte("created_at", periodStart || userCreatedAt)
          .order("created_at", { ascending: false }),

        // All-time reports
        supabase
          .from("reports")
          .select("id, id_number, name_ar, days_count, created_at")
          .eq("user_id", userId)
          .eq("is_deleted", false)
          .gte("created_at", userCreatedAt)
          .order("created_at", { ascending: false }),
      ])

      if (periodReportsRes.data) {
        setPeriodReports(periodReportsRes.data as ReportItem[])
      }
      if (allTimeReportsRes.data) {
        setAllTimeReports(allTimeReportsRes.data as ReportItem[])
      }

      // 7. Fetch suspension history
      const { data: suspensionsData } = await supabase
        .from("user_suspensions")
        .select("id, suspended_at, suspension_reason, reactivated_at, days_count_at_suspension, reports_count_at_suspension")
        .eq("user_id", userId)
        .order("suspended_at", { ascending: false })

      if (suspensionsData) {
        setSuspensionHistory(suspensionsData as SuspensionHistoryItem[])
        const active = suspensionsData.find((s) => !s.reactivated_at)
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
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex items-center justify-center p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 max-w-sm w-full text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
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
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
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
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white" dir="rtl">
        <LoadingSkeleton />
      </div>
    )
  }

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white" dir="rtl">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container max-w-lg mx-auto p-4 pb-8 space-y-6"
      >
        {/* ── 1. Header ── */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            <Badge
              className={
                userInfo.is_suspended
                  ? "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 font-medium px-3 py-1"
                  : "bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 font-medium px-3 py-1"
              }
            >
              <span
                className={`w-2 h-2 rounded-full ml-1.5 ${
                  userInfo.is_suspended ? "bg-red-500" : "bg-emerald-500"
                }`}
              />
              {userInfo.is_suspended ? "معلق" : "نشط"}
            </Badge>
            <h1 className="text-lg font-bold text-gray-800 truncate max-w-[200px]">
              {userInfo.full_name || userInfo.username}
            </h1>
          </div>
        </motion.div>

        {/* ── 2. User Info Card ── */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card overflow-hidden border-none shadow-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-indigo-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
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
                  className="h-8 w-8 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                  title="تعديل (قريباً)"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Full name */}
                <div className="flex items-start gap-3 p-2">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">الاسم الكامل</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {userInfo.full_name || "—"}
                    </p>
                  </div>
                </div>

                {/* Username */}
                <div className="flex items-start gap-3 p-2">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Hash className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">اسم المستخدم</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {userInfo.username}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3 p-2">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">الهاتف</p>
                    <p className="text-sm font-semibold text-gray-800 truncate" dir="ltr">
                      {userInfo.phone || "—"}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3 p-2">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">البريد</p>
                    <p className="text-sm font-semibold text-gray-800 truncate" dir="ltr">
                      {userInfo.email || "—"}
                    </p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-start gap-3 p-2">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">الدور</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {getRoleLabel(userInfo.role)}
                    </p>
                  </div>
                </div>

                {/* Created at */}
                <div className="flex items-start gap-3 p-2">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-teal-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">تاريخ الإنشاء</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {formatDate(userInfo.created_at)}
                    </p>
                  </div>
                </div>

                {/* PPTX enabled */}
                <div className="flex items-start gap-3 p-2">
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${userInfo.pptx_enabled ? "bg-green-100" : "bg-red-100"}`}>
                    <FileDown className={`w-4 h-4 ${userInfo.pptx_enabled ? "text-green-500" : "text-red-500"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">تنزيل PPTX</p>
                    <p className="text-sm font-semibold text-gray-800">
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
          <div className="grid grid-cols-3 gap-3">
            {/* Period reports */}
            <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-sm">
              <span className="text-2xl font-bold text-blue-600">
                {periodStats?.period_report_count ?? 0}
              </span>
              <span className="text-xs text-blue-700 mt-1 font-medium">
                تقارير الفترة
              </span>
            </div>

            {/* Period total days */}
            <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 shadow-sm">
              <span className="text-2xl font-bold text-amber-600">
                {periodStats?.period_total_days ?? 0}
              </span>
              <span className="text-xs text-amber-700 mt-1 font-medium">
                أيام الفترة
              </span>
            </div>

            {/* Total suspensions */}
            <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 shadow-sm">
              <span className="text-2xl font-bold text-red-600">
                {periodStats?.total_suspensions ?? 0}
              </span>
              <span className="text-xs text-red-700 mt-1 font-medium">
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
              className="bg-indigo-50 text-indigo-700 border-indigo-200 font-medium"
            >
              <FileBarChart className="w-3 h-3 ml-1" />
              إجمالي: {allTimeStats.total_reports}
            </Badge>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium"
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
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-200/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-amber-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-500" />
                  الحد الحالي
                  <Badge
                    variant="outline"
                    className="bg-amber-100 text-amber-700 border-amber-200 font-medium mr-auto"
                  >
                    {getLimitTypeLabel(currentLimit.limit_type)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Limit value or date */}
                  <div className="p-3 rounded-lg bg-white/70 border border-amber-100">
                    <p className="text-xs text-gray-400 mb-1">
                      {currentLimit.limit_type === "specific_date"
                        ? "تاريخ الانتهاء"
                        : "قيمة الحد"}
                    </p>
                    <p className="text-sm font-bold text-gray-800">
                      {currentLimit.limit_type === "specific_date"
                        ? formatDate(currentLimit.limit_date)
                        : currentLimit.limit_value
                        ? `${currentLimit.limit_value}`
                        : "—"}
                    </p>
                  </div>

                  {/* Set by */}
                  <div className="p-3 rounded-lg bg-white/70 border border-amber-100">
                    <p className="text-xs text-gray-400 mb-1">تم التعيين بواسطة</p>
                    <p className="text-sm font-bold text-gray-800">
                      {currentLimit.set_by_username || "—"}
                    </p>
                  </div>
                </div>

                {currentLimit.limit_set_at && (
                  <p className="text-xs text-gray-400 text-center">
                    تاريخ التعيين: {formatDateTime(currentLimit.limit_set_at)}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Separator className="bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />

        {/* ── 5. Period Reports Section ── */}
        <ReportsSection
          title="تقارير الفترة الحالية"
          reports={periodReports}
          totalCount={periodStats?.period_report_count ?? 0}
          totalDays={periodStats?.period_total_days ?? 0}
          isLoading={reportsLoading}
        />

        <Separator className="bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

        {/* ── 6. All-Time Reports Section ── */}
        <ReportsSection
          title="جميع التقارير"
          reports={allTimeReports}
          totalCount={allTimeStats?.total_reports ?? 0}
          totalDays={periodStats?.period_total_days ?? 0}
          isLoading={reportsLoading}
        />

        {/* ── 7. Suspension History Section ── */}
        {suspensionHistory.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-l from-red-200 to-transparent" />
              <h3 className="text-base font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent px-2">
                سجل التعليقات
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-red-200 to-transparent" />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              {suspensionHistory.map((record) => (
                <motion.div
                  key={record.id}
                  variants={itemVariants}
                  className={`rounded-xl border p-3 ${
                    record.reactivated_at
                      ? "border-gray-100 bg-gray-50/50"
                      : "border-red-200 bg-red-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                          record.reactivated_at
                            ? "bg-gray-100"
                            : "bg-red-100"
                        }`}
                      >
                        {record.reactivated_at ? (
                          <ShieldCheck className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ShieldOff className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 ${
                              record.reactivated_at
                                ? "bg-gray-100 text-gray-600 border-gray-200"
                                : "bg-red-100 text-red-700 border-red-200"
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
        <div className="h-4" />
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
