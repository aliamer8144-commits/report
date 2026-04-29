"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { motion } from "framer-motion"
import {
  Users,
  FileBarChart,
  Ban,
  TrendingUp,
  Clock,
  CalendarDays,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Loader2,
  Sun,
  Moon,
  Shield,
  Zap,
  UserPlus,
  ScrollText,
  FilePlus,
  Settings,
  BarChart3,
  RefreshCw,
  Eye,
} from "lucide-react"

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
}
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

/* ============================================================
   AnimatedNumber - عداد متحرك
   ============================================================ */
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const startTime = performance.now()
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplayValue(Math.round(value * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return <>{displayValue.toLocaleString("ar-SA")}</>
}

/* ============================================================
   أنواع البيانات
   ============================================================ */
interface DashboardStats {
  totalClients: number
  activeClients: number
  suspendedClients: number
  totalReports: number
  monthReports: number
  todayReports: number
  totalDays: number
  totalSuspensions: number
}

interface TopClient {
  user_id: string
  username: string
  full_name: string | null
  period_report_count: number
  period_total_days: number
  is_suspended: boolean
  last_report_at: string | null
}

interface NearLimitClient {
  user_id: string
  username: string
  full_name: string | null
  limit_type: string
  limit_value: number
  period_report_count: number
  period_total_days: number
  percentage: number
}

interface RecentActivity {
  id: string
  activity_type: string
  title: string
  description: string | null
  username: string
  full_name: string | null
  created_at: string
}

/* ============================================================
   مساعدات
   ============================================================ */
function getTodayArabicDate() {
  return new Date().toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatRelativeTime(dateStr: string) {
  if (!dateStr) return "الآن"
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMinutes < 1) return "الآن"
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`
  if (diffHours < 24) return `منذ ${diffHours} ساعة`
  if (diffDays < 7) return `منذ ${diffDays} يوم`
  return date.toLocaleDateString("ar-SA", { month: "short", day: "numeric" })
}

function getActivityMeta(action: string) {
  const lower = action.toLowerCase()
  if (lower.includes("حذف") || lower.includes("delete"))
    return { icon: XCircle, color: "#FF3B30", borderColor: "border-r-[#FF3B30]" }
  if (lower.includes("تعديل") || lower.includes("تحديث") || lower.includes("edit"))
    return { icon: RefreshCw, color: "#FF9500", borderColor: "border-r-[#FF9500]" }
  if (lower.includes("إضافة") || lower.includes("add"))
    return { icon: FileText, color: "#34C759", borderColor: "border-r-[#34C759]" }
  if (lower.includes("تعليق") || lower.includes("system"))
    return { icon: Ban, color: "#FF3B30", borderColor: "border-r-[#FF3B30]" }
  return { icon: FileText, color: "#007AFF", borderColor: "border-r-[#007AFF]" }
}

function getLimitLabel(type: string) {
  switch (type) {
    case "reports_count":
      return "تقرير"
    case "days_count":
      return "يوم"
    default:
      return ""
  }
}

function getPercentageColor(pct: number) {
  if (pct >= 100) return "#FF3B30"
  if (pct >= 90) return "#FF6B35"
  if (pct >= 70) return "#FF9500"
  return "#34C759"
}

/* ============================================================
   المكون الرئيسي - لوحة تحكم المشرف
   ============================================================ */
export function SupervisorDashboard() {
  const supabase = createClientSupabaseClient()
  const supervisorId =
    typeof window !== "undefined" ? localStorage.getItem("user_id") : ""
  const fullName =
    typeof window !== "undefined"
      ? localStorage.getItem("full_name") || localStorage.getItem("username") || "المشرف"
      : "المشرف"

  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    suspendedClients: 0,
    totalReports: 0,
    monthReports: 0,
    todayReports: 0,
    totalDays: 0,
    totalSuspensions: 0,
  })
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [nearLimitClients, setNearLimitClients] = useState<NearLimitClient[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [connectionStatus, setConnectionStatus] = useState<"fresh" | "stale" | "lost">("fresh")

  const refreshData = useCallback(async (showLoading = false) => {
    if (!supervisorId) return
    if (showLoading) setIsRefreshing(true)
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from("supervisor_users_stats")
        .select("*")
        .eq("supervisor_id", supervisorId!)
      if (clientsError) throw clientsError
      const clients = clientsData || []
      const clientIds = clients.map((c) => c.user_id)

      let totalReports = 0
      let monthReports = 0
      let todayReports = 0
      let totalDays = 0
      let totalSuspensions = 0

      if (clientIds.length > 0) {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const { count: totalReportCount } = await supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .in("user_id", clientIds)
          .eq("is_deleted", false)
        const { count: monthReportCount } = await supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .in("user_id", clientIds)
          .eq("is_deleted", false)
          .gte("created_at", startOfMonth.toISOString())
        const { count: todayReportCount } = await supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .in("user_id", clientIds)
          .eq("is_deleted", false)
          .gte("created_at", startOfDay.toISOString())

        totalReports = totalReportCount || 0
        monthReports = monthReportCount || 0
        todayReports = todayReportCount || 0

        const { data: activitiesData } = await supabase
          .from("activities")
          .select(
            `
            id,
            activity_type,
            title,
            description,
            created_at,
            user:users!activities_user_id_fkey(id, username, full_name)
          `
          )
          .in("user_id", clientIds)
          .order("created_at", { ascending: false })
          .limit(10)

        if (activitiesData) {
          const mapped: RecentActivity[] = activitiesData.map((a: any) => ({
            id: a.id,
            activity_type: a.activity_type,
            title: a.title || "",
            description: a.description,
            username: a.user?.username || "",
            full_name: a.user?.full_name || null,
            created_at: a.created_at,
          }))
          setRecentActivities(mapped)
        }
      }

      const activeClients = clients.filter((c) => !c.is_suspended).length
      const suspendedClients = clients.filter((c) => c.is_suspended).length
      clients.forEach((c) => {
        totalDays += c.period_total_days || 0
        totalSuspensions += c.total_suspensions || 0
      })

      setStats({
        totalClients: clients.length,
        activeClients,
        suspendedClients,
        totalReports,
        monthReports,
        todayReports,
        totalDays,
        totalSuspensions,
      })

      const sorted = [...clients]
        .sort((a, b) => (b.period_report_count || 0) - (a.period_report_count || 0))
        .slice(0, 5)
      setTopClients(sorted)

      const nearLimit: NearLimitClient[] = []
      clients.forEach((c) => {
        if (c.limit_type && c.limit_value && !c.is_suspended) {
          let percentage = 0
          if (c.limit_type === "reports_count") {
            percentage = ((c.period_report_count || 0) / c.limit_value) * 100
          } else if (c.limit_type === "days_count") {
            percentage = ((c.period_total_days || 0) / c.limit_value) * 100
          }
          if (percentage >= 70) {
            nearLimit.push({
              user_id: c.user_id,
              username: c.username,
              full_name: c.full_name,
              limit_type: c.limit_type,
              limit_value: c.limit_value,
              period_report_count: c.period_report_count || 0,
              period_total_days: c.period_total_days || 0,
              percentage: Math.round(percentage),
            })
          }
        }
      })
      setNearLimitClients(nearLimit)

      setLastRefreshed(new Date())
      setConnectionStatus("fresh")
    } catch {
      setConnectionStatus("lost")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [supervisorId])

  useEffect(() => {
    refreshData(true)
  }, [refreshData])

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refreshData(false)
    }, 30000)
    return () => clearInterval(interval)
  }, [refreshData])

  const [, setRefreshTick] = useState(0)
  useEffect(() => {
    const statusInterval = setInterval(() => {
      const elapsed = (Date.now() - lastRefreshed.getTime()) / 1000
      if (elapsed < 30) setConnectionStatus("fresh")
      else if (elapsed < 60) setConnectionStatus("stale")
      else setConnectionStatus("lost")
      setRefreshTick((t) => t + 1)
    }, 10000)
    return () => clearInterval(statusInterval)
  }, [lastRefreshed])

  const formatLastRefreshed = () => {
    const diff = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000)
    if (diff < 5) return "الآن"
    if (diff < 60) return `منذ ${diff} ثانية`
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`
    return `منذ ${Math.floor(diff / 3600)} ساعة`
  }

  const navigateTo = (tab: string) => {
    window.dispatchEvent(new CustomEvent("supervisor-navigate", { detail: { tab } }))
  }

  // بطاقات الإحصائيات
  const statCards = [
    { label: "إجمالي العملاء", value: stats.totalClients, icon: Users, color: "#007AFF", circleColor: "#5856D6" },
    { label: "التقارير المنشأة", value: stats.totalReports, icon: FileBarChart, color: "#34C759", circleColor: "#28A745" },
    { label: "المعلّقون", value: stats.suspendedClients, icon: Ban, color: "#FF3B30", circleColor: "#D70015", clickable: true },
    { label: "إجمالي الأيام", value: stats.totalDays, icon: CalendarDays, color: "#FF9500", circleColor: "#E68A00" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#007AFF] mx-auto mb-3" />
          <p className="text-sm text-gray-500">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* ==========================================
          بطاقة التحية - Gradient Mesh Background
          ========================================== */}
      <motion.div variants={fadeUp}>
        <div
          className="rounded-2xl p-5 text-white shadow-lg shadow-[#007AFF]/20 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #007AFF 0%, #0055D4 50%, #5856D6 100%)" }}
        >
          {/* زخارف */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/[0.03] rounded-full blur-2xl" />
          <div className="absolute top-3 right-3 w-3 h-3 bg-white/20 rounded-full animate-pulse" />
          <div className="absolute top-3 right-10 w-2 h-2 bg-white/15 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
          <div className="absolute bottom-4 left-4 w-20 h-20 border border-white/10 rounded-full" />
          <div className="absolute bottom-6 left-6 w-12 h-12 border border-white/5 rounded-full" />

          <div className="relative z-10">
            {/* الصف الأول: أيقونة + تحية | التاريخ + شمس/قمر */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#FFD60A]" />
                <p className="text-sm opacity-80">
                  {new Date().getHours() < 12 ? "صباح الخير،" : "مساء الخير،"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] opacity-60">{getTodayArabicDate()}</p>
                {new Date().getHours() < 12 ? (
                  <Sun className="w-4 h-4 text-[#FFD60A]" />
                ) : (
                  <Moon className="w-4 h-4 text-[#FFD60A]" />
                )}
              </div>
            </div>
            {/* الاسم */}
            <h2 className="text-2xl font-bold mt-1 drop-shadow-sm">
              {fullName.split(" ")[0]}
            </h2>
            {/* حالة الاتصال + تحديث */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs opacity-70 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <motion.div
                  animate={{ scale: connectionStatus === "lost" ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 1.5, repeat: connectionStatus === "lost" ? Infinity : 0 }}
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "fresh"
                      ? "bg-[#34C759]"
                      : connectionStatus === "stale"
                      ? "bg-[#FF9500]"
                      : "bg-[#FF3B30]"
                  }`}
                />
                <span>{formatLastRefreshed()}</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => refreshData(true)}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 text-xs opacity-70 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <motion.span
                  animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                  transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0 }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </motion.span>
                <span>تحديث</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ==========================================
          بطاقات الإحصائيات (2×2)
          ========================================== */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.08 + 0.1, duration: 0.4, ease: "easeOut" }}
              whileTap={{ scale: 0.97 }}
              onClick={card.clickable ? () => navigateTo("comments") : undefined}
              className={`relative rounded-xl p-3 overflow-hidden shadow-sm border border-gray-100/50 ${
                card.clickable ? "cursor-pointer" : ""
              }`}
              style={{ backgroundColor: "#FAFAFA" }}
            >
              <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full" style={{ backgroundColor: `${card.circleColor}10` }} />
              <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full" style={{ backgroundColor: `${card.circleColor}08` }} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: card.color }} />
                  </div>
                  {card.clickable && <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />}
                </div>
                <p className="text-xl font-bold leading-none" style={{ color: card.color }}>
                  <AnimatedNumber value={card.value || 0} />
                </p>
                <p className="text-[10px] text-gray-600 mt-1 font-bold">{card.label}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ==========================================
          إجراءات سريعة
          ========================================== */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[#FF9500]" />
          <h3 className="text-base font-bold text-[#1c1c1e]">إجراءات سريعة</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "إضافة عميل", icon: UserPlus, tab: "clients", gradient: "from-[#007AFF] to-[#0055D4]", shadow: "shadow-[#007AFF]/20" },
            { label: "التعليقات", icon: Ban, tab: "comments", gradient: "from-[#FF3B30] to-[#D70015]", shadow: "shadow-[#FF3B30]/20", badge: stats.suspendedClients },
            { label: "التقارير", icon: BarChart3, tab: "reports", gradient: "from-[#AF52DE] to-[#9B30D9]", shadow: "shadow-[#AF52DE]/20" },
            { label: "إدارة العملاء", icon: Settings, tab: "clients", gradient: "from-[#FF9500] to-[#E68A00]", shadow: "shadow-[#FF9500]/20" },
            { label: "ملخص عام", icon: TrendingUp, tab: "home", gradient: "from-[#34C759] to-[#28A745]", shadow: "shadow-[#34C759]/20" },
            { label: "سجل النشاطات", icon: ScrollText, tab: "home", gradient: "from-[#5856D6] to-[#4A48C5]", shadow: "shadow-[#5856D6]/20" },
          ].map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 25 }}
              whileHover={{ y: -3, boxShadow: `0 12px 28px ${action.shadow}` }}
              whileTap={{ scale: 0.93 }}
              onClick={() => navigateTo(action.tab)}
              className={`relative bg-gradient-to-br ${action.gradient} text-white rounded-2xl p-3 flex flex-col items-center justify-center gap-2 shadow-lg transition-all duration-300 ${action.shadow}`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <action.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold leading-tight text-center">{action.label}</span>
              {action.badge && action.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {action.badge}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ==========================================
          إحصائيات اليوم
          ========================================== */}
      <motion.div variants={fadeUp}>
        <div
          className="bg-gradient-to-l from-[#007AFF] to-[#0055D4] rounded-2xl p-5 text-white shadow-lg shadow-[#007AFF]/20 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -translate-x-1/2 translate-y-1/2" />
          <h3 className="text-sm font-medium opacity-80 mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            إحصائيات اليوم
          </h3>
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-2xl font-bold">
                <AnimatedNumber value={stats.todayReports} duration={800} />
              </p>
              <p className="text-xs opacity-70">تقرير اليوم</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-2xl font-bold">
                <AnimatedNumber value={stats.activeClients} duration={800} />
              </p>
              <p className="text-xs opacity-70">عملاء نشطون</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ==========================================
          اتجاهات الأداء (2×2)
          ========================================== */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-[#007AFF]" />
          <h3 className="text-base font-bold text-[#1c1c1e]">اتجاهات الأداء</h3>
          <span className="text-[10px] bg-[#007AFF]/10 text-[#007AFF] px-2 py-0.5 rounded-full font-medium mr-auto">
            هذا الشهر
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "تقارير الشهر", value: stats.monthReports.toString(), icon: FileText, color: "#34C759", bgColor: "from-[#34C759]/5 to-white" },
            { label: "عملاء نشطون", value: stats.activeClients.toString(), icon: Users, color: "#007AFF", bgColor: "from-[#007AFF]/5 to-white" },
            { label: "إجمالي الأيام", value: stats.totalDays.toString(), icon: CalendarDays, color: "#FF9500", bgColor: "from-[#FF9500]/5 to-white" },
            { label: "نسبة النشاط", value: `${stats.totalClients > 0 ? Math.round((stats.activeClients / stats.totalClients) * 100) : 0}%`, icon: Activity, color: "#AF52DE", bgColor: "from-[#AF52DE]/5 to-white", noChange: true },
          ].map((trend, i) => (
            <motion.div
              key={trend.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 25 }}
              className={`bg-gradient-to-br ${trend.bgColor} rounded-2xl p-3.5 shadow-sm border border-gray-100/50`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${trend.color}12` }}>
                  <trend.icon className="w-4 h-4" style={{ color: trend.color }} />
                </div>
              </div>
              <p className="text-lg font-bold text-[#1c1c1e]">{trend.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{trend.label}</p>
              {!trend.noChange && (
                <div className="mt-1.5 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${i === 0 ? Math.min((stats.monthReports / (stats.totalReports || 1)) * 100, 100) : 75}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: trend.color, opacity: 0.3 }}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ==========================================
          أفضل العملاء - Glassmorphism
          ========================================== */}
      {topClients.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="rounded-2xl p-[1px] bg-gradient-to-br from-[#007AFF]/20 via-[#34C759]/20 to-[#AF52DE]/20">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#007AFF]" />
                  أفضل العملاء أداءً
                </h3>
                <button
                  onClick={() => navigateTo("clients")}
                  className="flex items-center gap-1 text-xs text-[#007AFF] font-medium hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  عرض الكل
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {topClients.map((client, i) => (
                  <motion.div
                    key={client.user_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0"
                        style={{
                          background:
                            i === 0
                              ? "linear-gradient(135deg, #FFD700, #FFA500)"
                              : i === 1
                              ? "linear-gradient(135deg, #C0C0C0, #A0A0A0)"
                              : i === 2
                              ? "linear-gradient(135deg, #CD7F32, #A0522D)"
                              : "linear-gradient(135deg, #007AFF, #5856D6)",
                          boxShadow: i < 3 ? `0 2px 8px ${i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : "#CD7F32"}30` : undefined,
                        }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1c1c1e] truncate">
                          {client.full_name || client.username}
                          {client.is_suspended && (
                            <XCircle className="w-3 h-3 text-[#FF3B30] inline mr-1" />
                          )}
                        </p>
                        <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-l from-[#007AFF] to-[#5856D6]"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${((client.period_report_count || 0) / (topClients[0]?.period_report_count || 1)) * 100}%`,
                            }}
                            transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-left shrink-0 mr-3">
                      <p className="text-sm font-bold text-[#007AFF]">{client.period_report_count || 0} <span className="text-[10px] text-gray-400 font-normal">تقرير</span></p>
                      <p className="text-[10px] text-gray-400">{formatRelativeTime(client.last_report_at)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="px-4 py-2.5 bg-gradient-to-l from-[#007AFF]/5 to-transparent border-t border-gray-100">
                <p className="text-[11px] text-gray-500 text-center">
                  إجمالي تقارير أعلى {topClients.length} عملاء:{" "}
                  <span className="font-bold text-[#007AFF]">
                    {topClients.reduce((sum, c) => sum + (c.period_report_count || 0), 0)} تقرير
                  </span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ==========================================
          عملاء قريبون من الحد - Glassmorphism
          ========================================== */}
      {nearLimitClients.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="rounded-2xl p-[1px] bg-gradient-to-br from-[#FF3B30]/20 via-[#FF9500]/20 to-[#AF52DE]/20">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FF3B30]" />
                  قريبون من الحد
                </h3>
                <span className="text-[10px] bg-[#FF3B30]/10 text-[#FF3B30] px-2 py-0.5 rounded-full font-bold">
                  {nearLimitClients.length}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {nearLimitClients.map((client, i) => {
                  const currentVal =
                    client.limit_type === "reports_count"
                      ? client.period_report_count
                      : client.period_total_days
                  const pctColor = getPercentageColor(client.percentage)
                  return (
                    <motion.div
                      key={client.user_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm shrink-0"
                          style={{ background: pctColor, boxShadow: `0 2px 8px ${pctColor}30` }}
                        >
                          {Math.min(client.percentage, 100)}%
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1c1c1e] truncate">
                            {client.full_name || client.username}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {currentVal} / {client.limit_value} {getLimitLabel(client.limit_type)}
                          </p>
                          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: pctColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(client.percentage, 100)}%` }}
                              transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ==========================================
          آخر النشاطات
          ========================================== */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-[#007AFF]" />
          <h3 className="text-base font-bold text-[#1c1c1e]">آخر النشاطات</h3>
        </div>

        {recentActivities.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-[12px] text-gray-400">لا توجد أنشطة حتى الآن</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
            {recentActivities.slice(0, 5).map((activity, index) => {
              const meta = getActivityMeta(activity.activity_type || activity.title)
              const IconComp = meta.icon
              return (
                <motion.div
                  key={activity.id}
                  className={`px-4 py-3 flex items-start gap-3 border-r-[3px] ${meta.borderColor}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${meta.color}12` }}
                  >
                    <IconComp className="w-4 h-4" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1c1c1e] truncate">
                      {activity.title}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {activity.full_name || activity.username}
                      {activity.description && ` — ${activity.description}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">
                    {formatRelativeTime(activity.created_at)}
                  </span>
                </motion.div>
              )
            })}
            {recentActivities.length > 5 && (
              <button className="w-full py-2.5 text-[11px] text-[#007AFF] font-medium hover:bg-gray-50 transition-colors">
                عرض المزيد
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* مسافة سفلية */}
      <div className="h-4" />
    </div>
  )
}
