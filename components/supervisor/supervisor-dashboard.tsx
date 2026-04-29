"use client"

import { useState, useEffect } from "react"
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
  FileText,
  ChevronLeft,
  Loader2,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react"

/* ============================================================
   أنواع البيانات
   ============================================================ */
interface DashboardStats {
  totalClients: number
  activeClients: number
  suspendedClients: number
  totalReports: number
  monthReports: number
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
  limit_type: string | null
  limit_value: number | null
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
  type: "report" | "suspension" | "unsuspension"
  title: string
  description: string
  username: string
  full_name: string | null
  created_at: string
  icon: typeof FileBarChart
  color: string
}

/* ============================================================
   المكون الرئيسي - لوحة تحكم المشرف
   ============================================================ */
export function SupervisorDashboard() {
  const supabase = createClientSupabaseClient()
  const supervisorId =
    typeof window !== "undefined" ? localStorage.getItem("user_id") : ""

  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    suspendedClients: 0,
    totalReports: 0,
    monthReports: 0,
    totalDays: 0,
    totalSuspensions: 0,
  })
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [nearLimitClients, setNearLimitClients] = useState<NearLimitClient[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState({ text: "", icon: Sun, isMorning: true, date: "", motivational: "" })

  useEffect(() => {
    // تحية حسب الوقت
    const hour = new Date().getHours()
    const isMorning = hour >= 4 && hour < 17
    const fullName = localStorage.getItem("full_name") || localStorage.getItem("username") || "المشرف"
    const firstName = fullName.split(" ")[0]

    const motivationalPhrases = [
      "الإدارة الناجحة تبدأ بمتابعة دقيقة",
      "فريقك هو أعظم أصولك",
      "كل يوم هو فرصة لتحقيق إنجاز جديد",
      "النجاح ليس نهائياً والفشل ليس قاتلاً",
      "استمر في التطوير والتطوير سيستمر معك",
      "القيادة الحقيقية تبدأ بخدمة الفريق",
      "لا يوجد نجاح بدون عمل جاد",
      "التحديات هي فرص مقنّعة",
    ]
    const randomPhrase = motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)]

    const today = new Date()
    const dateStr = today.toLocaleDateString("ar-SA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    setGreeting({
      text: isMorning ? `صباح الخير، ${firstName}` : `مساء الخير، ${firstName}`,
      icon: isMorning ? Sun : Moon,
      isMorning,
      date: dateStr,
      motivational: randomPhrase,
    })
  }, [])

  useEffect(() => {
    if (!supervisorId) return
    fetchDashboardData()
  }, [supervisorId])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // 1. إحصائيات عامة من supervisor_users_stats
      const { data: clientsData, error: clientsError } = await supabase
        .from("supervisor_users_stats")
        .select("*")
        .eq("supervisor_id", supervisorId!)

      if (clientsError) throw clientsError

      const clients = clientsData || []

      // 2. إجمالي التقارير لعملاء المشرف
      const clientIds = clients.map((c) => c.user_id)
      let totalReports = 0
      let monthReports = 0
      let totalDays = 0
      let totalSuspensions = 0

      if (clientIds.length > 0) {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

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

        totalReports = totalReportCount || 0
        monthReports = monthReportCount || 0

        // 3. آخر 10 أنشطة من عملاء المشرف
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
          const mapped: RecentActivity[] = activitiesData.map((a: any) => {
            const user = a.user || {}
            let type: RecentActivity["type"] = "report"
            let icon = FileBarChart
            let color = "text-[#007AFF]"

            if (a.activity_type === "add") {
              type = "report"
              icon = FileText
              color = "text-[#34C759]"
            } else if (a.activity_type === "edit") {
              type = "report"
              icon = FileBarChart
              color = "text-[#FF9500]"
            } else if (a.activity_type === "delete") {
              type = "report"
              icon = XCircle
              color = "text-[#FF3B30]"
            } else if (a.activity_type === "download") {
              type = "report"
              icon = TrendingUp
              color = "text-[#AF52DE]"
            } else if (a.activity_type === "system") {
              type = "suspension"
              icon = Ban
              color = "text-[#FF3B30]"
            }

            return {
              id: a.id,
              type,
              title: a.title || "",
              description: a.description || "",
              username: user.username || "",
              full_name: user.full_name || null,
              created_at: a.created_at,
              icon,
              color,
            }
          })
          setRecentActivities(mapped)
        }
      }

      // 4. إحصائيات العملاء
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
        totalDays,
        totalSuspensions,
      })

      // 5. أفضل 5 عملاء حسب عدد التقارير
      const sorted = [...clients]
        .sort(
          (a, b) =>
            (b.period_report_count || 0) - (a.period_report_count || 0)
        )
        .slice(0, 5)
      setTopClients(sorted)

      // 6. العملاء القريبين من الحد (>= 70%)
      const nearLimit: NearLimitClient[] = []
      clients.forEach((c) => {
        if (c.limit_type && c.limit_value && !c.is_suspended) {
          let percentage = 0
          if (c.limit_type === "reports_count") {
            percentage =
              ((c.period_report_count || 0) / c.limit_value) * 100
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
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return ""
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
    return date.toLocaleDateString("ar-SA", {
      month: "short",
      day: "numeric",
    })
  }

  const getLimitLabel = (type: string) => {
    switch (type) {
      case "reports_count":
        return "تقرير"
      case "days_count":
        return "يوم"
      default:
        return ""
    }
  }

  const getPercentageColor = (pct: number) => {
    if (pct >= 100) return "#FF3B30"
    if (pct >= 90) return "#FF6B35"
    if (pct >= 70) return "#FF9500"
    return "#34C759"
  }

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
    <div dir="rtl" className="space-y-4">
      {/* ==========================================
          بطاقة التحية
          ========================================== */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative overflow-hidden rounded-2xl p-5"
          style={{ background: "linear-gradient(135deg, #007AFF 0%, #5856D6 50%, #AF52DE 100%)" }}
        >
          {/* زخرفة خلفية */}
          <div className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(-30%, -30%)" }} />
          <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(30%, 30%)" }} />

          {/* المحتوى */}
          <div className="relative z-10">
            {/* الصف الأول: الأيقونة + التاريخ */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <greeting.icon className="w-5 h-5 text-yellow-300" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-white/90">{greeting.text}</span>
                  <span className="text-[10px] text-white/60">{greeting.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-yellow-300/80" />
              </div>
            </div>

            {/* العبارة التحفيزية */}
            <div className="flex items-start gap-2 mb-5">
              <div className="w-1 h-8 rounded-full bg-white/30 mt-0.5 shrink-0" />
              <p className="text-[12px] text-white/80 leading-relaxed">{greeting.motivational}</p>
            </div>

            {/* إجمالي العملاء */}
            <div className="flex items-center justify-between bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <Users className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-white/60">إجمالي العملاء</p>
                  <p className="text-xl font-bold text-white">{loading ? "..." : stats.totalClients}</p>
                </div>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#34C759]" />
                  <span className="text-[11px] text-white/70">{loading ? "..." : stats.activeClients} نشط</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2 h-2 rounded-full bg-[#FF3B30]" />
                  <span className="text-[11px] text-white/70">{loading ? "..." : stats.suspendedClients} معلّق</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ==========================================
          بطاقات الإحصائيات الرئيسية
          ========================================== */}
      <motion.div
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <StatCard
          label="إجمالي العملاء"
          value={stats.totalClients}
          sublabel={`${stats.activeClients} نشط`}
          color="#007AFF"
          bgColor="bg-[#007AFF]/10"
          icon={Users}
          delay={0}
        />
        <StatCard
          label="التقارير المنشأة"
          value={stats.totalReports}
          sublabel={`${stats.monthReports} هذا الشهر`}
          color="#34C759"
          bgColor="bg-[#34C759]/10"
          icon={FileBarChart}
          delay={0.05}
        />
        <StatCard
          label="المعلّقون"
          value={stats.suspendedClients}
          sublabel={stats.suspendedClients === 0 ? "لا يوجد" : "يحتاج متابعة"}
          color="#FF3B30"
          bgColor="bg-[#FF3B30]/10"
          icon={Ban}
          delay={0.1}
        />
        <StatCard
          label="إجمالي الأيام"
          value={stats.totalDays}
          sublabel={`${stats.totalSuspensions} تعليق كلي`}
          color="#FF9500"
          bgColor="bg-[#FF9500]/10"
          icon={CalendarDays}
          delay={0.15}
        />
      </motion.div>

      {/* ==========================================
          تقارير هذا الشهر - شريط التقدم
          ========================================== */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white rounded-2xl p-4 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#AF52DE]/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#AF52DE]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1c1c1e]">نشاط الشهر</h3>
              <p className="text-[11px] text-gray-400">تقارير تم إنشاؤها هذا الشهر</p>
            </div>
          </div>
          <div className="text-left">
            <span className="text-lg font-bold text-[#1c1c1e]">{stats.monthReports}</span>
            <span className="text-[11px] text-gray-400 mr-1">تقرير</span>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-[#AF52DE] to-[#007AFF]"
            initial={{ width: 0 }}
            animate={{
              width: stats.totalReports > 0
                ? `${Math.min((stats.monthReports / stats.totalReports) * 100, 100)}%`
                : "0%",
            }}
            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-gray-400">0</span>
          <span className="text-[10px] text-gray-400">الإجمالي: {stats.totalReports} تقرير</span>
        </div>
      </motion.div>

      {/* ==========================================
          أفضل العملاء أداءً
          ========================================== */}
      {topClients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF9500]/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#FF9500]" />
              </div>
              <h3 className="text-sm font-bold text-[#1c1c1e]">أفضل العملاء أداءً</h3>
            </div>
            <span className="text-[11px] text-gray-400">حسب عدد التقارير</span>
          </div>

          <div className="space-y-3">
            {topClients.map((client, index) => {
              const maxReports = topClients[0]?.period_report_count || 1
              const barWidth = ((client.period_report_count || 0) / maxReports) * 100
              const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]

              return (
                <motion.div
                  key={client.user_id}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.06 }}
                >
                  <span className="text-sm w-6 text-center shrink-0">
                    {medals[index] || `${index + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[13px] font-semibold text-[#1c1c1e] truncate">
                          {client.full_name || client.username}
                        </span>
                        {client.is_suspended && (
                          <XCircle className="w-3 h-3 text-[#FF3B30] shrink-0" />
                        )}
                      </div>
                      <span className="text-[12px] font-bold text-[#007AFF] shrink-0 mr-2">
                        {client.period_report_count || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-l from-[#007AFF] to-[#5856D6]"
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.8, delay: 0.4 + index * 0.08, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ==========================================
          تحذير: عملاء قريبون من الحد
          ========================================== */}
      {nearLimitClients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF3B30]/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-[#FF3B30]" />
              </div>
              <h3 className="text-sm font-bold text-[#1c1c1e]">قريبون من الحد</h3>
            </div>
            <span className="text-[11px] text-[#FF3B30] font-medium bg-[#FF3B30]/10 px-2 py-0.5 rounded-full">
              {nearLimitClients.length}
            </span>
          </div>

          <div className="space-y-2">
            {nearLimitClients.map((client, index) => {
              const currentVal =
                client.limit_type === "reports_count"
                  ? client.period_report_count
                  : client.period_total_days
              const pctColor = getPercentageColor(client.percentage)

              return (
                <motion.div
                  key={client.user_id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#f2f2f7]"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.06 }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[11px] shrink-0"
                    style={{ background: pctColor }}
                  >
                    {Math.min(client.percentage, 100)}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[#1c1c1e] truncate">
                        {client.full_name || client.username}
                      </span>
                      <span className="text-[10px] text-gray-500 shrink-0 mr-2">
                        {currentVal} / {client.limit_value} {getLimitLabel(client.limit_type)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden mt-1">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: pctColor }}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(client.percentage, 100)}%`,
                        }}
                        transition={{ duration: 0.8, delay: 0.5 + index * 0.08 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ==========================================
          آخر النشاطات
          ========================================== */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="bg-white rounded-2xl p-4 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#007AFF]" />
            </div>
            <h3 className="text-sm font-bold text-[#1c1c1e]">آخر النشاطات</h3>
          </div>
        </div>

        {recentActivities.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-[12px] text-gray-400">لا توجد أنشطة حتى الآن</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-gray-50">
            {recentActivities.map((activity, index) => {
              const IconComp = activity.icon
              return (
                <motion.div
                  key={activity.id}
                  className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + index * 0.05 }}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      activity.type === "report"
                        ? "bg-[#f2f2f7]"
                        : activity.type === "suspension"
                        ? "bg-[#FF3B30]/10"
                        : "bg-[#34C759]/10"
                    }`}
                  >
                    <IconComp
                      className={`w-3.5 h-3.5 ${activity.color}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-medium text-[#1c1c1e] truncate">
                        {activity.title}
                      </p>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {formatRelativeTime(activity.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">
                      {activity.full_name || activity.username}
                      {activity.description && ` — ${activity.description}`}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* ==========================================
          ملخص سريع
          ========================================== */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="bg-white rounded-2xl p-4 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#34C759]/10 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-[#34C759]" />
          </div>
          <h3 className="text-sm font-bold text-[#1c1c1e]">ملخص سريع</h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#f2f2f7]">
            <div className="w-2 h-2 rounded-full bg-[#34C759]" />
            <div>
              <p className="text-[11px] text-gray-500">نسبة النشاط</p>
              <p className="text-[13px] font-bold text-[#1c1c1e]">
                {stats.totalClients > 0
                  ? Math.round(
                      (stats.activeClients / stats.totalClients) * 100
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#f2f2f7]">
            <div className="w-2 h-2 rounded-full bg-[#007AFF]" />
            <div>
              <p className="text-[11px] text-gray-500">متوسط التقارير</p>
              <p className="text-[13px] font-bold text-[#1c1c1e]">
                {stats.totalClients > 0
                  ? (stats.totalReports / stats.totalClients).toFixed(1)
                  : 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#f2f2f7]">
            <div className="w-2 h-2 rounded-full bg-[#FF9500]" />
            <div>
              <p className="text-[11px] text-gray-500">متوسط الأيام</p>
              <p className="text-[13px] font-bold text-[#1c1c1e]">
                {stats.activeClients > 0
                  ? Math.round(stats.totalDays / stats.activeClients)
                  : 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#f2f2f7]">
            <div className="w-2 h-2 rounded-full bg-[#FF3B30]" />
            <div>
              <p className="text-[11px] text-gray-500">معدل التعليق</p>
              <p className="text-[13px] font-bold text-[#1c1c1e]">
                {stats.totalClients > 0
                  ? (
                      (stats.suspendedClients / stats.totalClients) *
                      100
                    ).toFixed(0)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* مسافة سفلية */}
      <div className="h-4" />
    </div>
  )
}

/* ============================================================
   مكون بطاقة الإحصائيات
   ============================================================ */
function StatCard({
  label,
  value,
  sublabel,
  color,
  bgColor,
  icon: Icon,
  delay,
}: {
  label: string
  value: number
  sublabel: string
  color: string
  bgColor: string
  icon: typeof Users
  delay: number
}) {
  return (
    <motion.div
      className="bg-white rounded-2xl p-3.5 shadow-sm"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <ArrowUpRight className="w-4 h-4 text-gray-300" />
      </div>
      <div>
        <motion.p
          className="text-xl font-bold text-[#1c1c1e]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.15 }}
        >
          {value.toLocaleString("ar-SA")}
        </motion.p>
        <p className="text-[11px] text-gray-500 font-medium mt-0.5">{label}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{sublabel}</p>
      </div>
    </motion.div>
  )
}
