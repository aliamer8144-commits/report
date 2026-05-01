"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Home,
  FileBarChart,
  Users,
  MessageSquare,
  UserCircle,
  SearchIcon,
  LogOut,
  SettingsIcon,
  Loader2,
  User,
  Bell,
  FilePlus,
  FileEdit,
  Ban,
  ChevronRight,
  Construction,
  Sparkles,
} from "lucide-react"
import { ClientsTab } from "./clients-tab"
import { SuspensionsTab } from "./suspensions-tab"
import { AccountTab } from "./account-tab"
import { SupervisorDashboard } from "./supervisor-dashboard"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

const tabs = [
  { id: "home", label: "الرئيسية", icon: Home },
  { id: "reports", label: "التقارير", icon: FileBarChart },
  { id: "clients", label: "العملاء", icon: Users },
  { id: "comments", label: "التعليقات", icon: MessageSquare },
  { id: "account", label: "الحساب", icon: UserCircle },
]

/* ============================================================
   مكون "قريباً" - يعرض للمستخدم أن الواجهة قيد التطوير
   ============================================================ */
function ComingSoonContent({ description }: { description: string }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 px-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <motion.div
        className="relative mb-8"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#007AFF]/10 to-[#5856D6]/10 flex items-center justify-center shadow-lg">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#007AFF]/20 to-[#5856D6]/20 flex items-center justify-center">
            <Construction className="w-10 h-10 text-[#007AFF]" />
          </div>
        </div>
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="w-6 h-6 text-amber-400" />
        </motion.div>
      </motion.div>

      <motion.div
        className="text-center space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Badge
          variant="outline"
          className="bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20 px-4 py-1.5 text-sm font-medium"
        >
          قريباً
        </Badge>
        <h2 className="text-xl font-bold text-gray-800">
          هذه الواجهة قيد التطوير
        </h2>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          {description}
        </p>
      </motion.div>
    </motion.div>
  )
}

/* ============================================================
   مكون لوحة التحكم (تبويب التقارير) - نفس محتوى الصفحة الرئيسية
   ============================================================ */
function DashboardContent() {
  const router = useRouter()
  const [serviceCode, setServiceCode] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalReports: 0,
    disabledReports: 0,
    activeReports: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const initStats = async () => {
      try {
        const res = await fetch("/api/auth/session")
        if (!res.ok) return
        const { user } = await res.json()
        fetchReportStats(user.id)
      } catch { /* ignore */ }
    }
    initStats()
  }, [])

  const fetchReportStats = async (userId: string) => {
    setIsLoading(true)
    try {
      const { count: totalCount, error: totalError } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      const { count: disabledCount, error: disabledError } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_disabled", true)

      if (totalError || disabledError) {
        throw new Error("حدث خطأ أثناء جلب الإحصائيات")
      }

      setStats({
        totalReports: totalCount || 0,
        disabledReports: disabledCount || 0,
        activeReports: (totalCount || 0) - (disabledCount || 0),
      })
    } catch (err: any) {
      console.error(err)
    } finally {
      setIsLoading(false)
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
        setError("لم يتم العثور على نتائج")
        return
      }

      const params = new URLSearchParams()
      if (serviceCode) params.set("service_code", serviceCode)
      if (idNumber) params.set("id_number", idNumber)
      router.push(`/search?${params.toString()}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getCompletionPercentage = () => {
    if (stats.totalReports === 0) return 0
    return Math.round((stats.activeReports / stats.totalReports) * 100)
  }

  return (
    <>
      {/* لوحة التحكم */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="bg-white rounded-2xl p-4 shadow-sm overflow-hidden border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="text-[#1c1c1e]">لوحة التحكم</span>
              <Badge variant="outline" className="bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20">
                {isLoading ? "جاري التحميل..." : `${stats.totalReports} تقرير`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="flex flex-col items-center justify-center p-3 bg-[#f2f2f7] rounded-xl">
                <span className="text-2xl font-bold text-[#007AFF]">{stats.totalReports}</span>
                <span className="text-xs text-[#007AFF]">إجمالي</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-[#f2f2f7] rounded-xl">
                <span className="text-2xl font-bold text-[#34C759]">{stats.activeReports}</span>
                <span className="text-xs text-[#34C759]">نشط</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-[#f2f2f7] rounded-xl">
                <span className="text-2xl font-bold text-[#FF3B30]">{stats.disabledReports}</span>
                <span className="text-xs text-[#FF3B30]">معطل</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">نسبة الإنجاز</span>
                <span className="text-sm font-medium">{getCompletionPercentage()}%</span>
              </div>
              <Progress
                value={getCompletionPercentage()}
                className="h-2 bg-gray-100"
                indicatorClassName="bg-[#007AFF]"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* الإجراءات السريعة */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-800">الإجراءات السريعة</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#007AFF] hover:bg-[#007AFF]/5 p-1 h-auto"
            onClick={() => setShowSearch(!showSearch)}
          >
            <SearchIcon className="h-5 w-5" />
          </Button>
        </div>

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-4 overflow-hidden"
            >
              <Card className="bg-white rounded-2xl p-4 shadow-sm overflow-hidden border-none">
                <CardContent className="p-4">
                  <form onSubmit={handleSearch} className="space-y-3">
                    {error && (
                      <AlertMessage type="error" title="خطأ في البحث" message={error} onClose={() => setError(null)} />
                    )}
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={serviceCode}
                        onChange={(e) => setServiceCode(e.target.value)}
                        placeholder="رمز الخدمة"
                        className="bg-[#f2f2f7] border-0 focus:ring-2 focus:ring-[#007AFF]/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        placeholder="رقم الهوية"
                        className="bg-[#f2f2f7] border-0 focus:ring-2 focus:ring-[#007AFF]/30"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-[#007AFF] hover:opacity-95 text-white shadow-md"
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
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-3">
          <motion.div whileTap={{ scale: 0.97 }} className="col-span-2">
            <Button
              onClick={() => router.push("/add")}
              className="w-full h-auto py-4 px-4 bg-[#007AFF] text-white rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-white/20 p-2 rounded-lg mr-3">
                  <FilePlus className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">إضافة تقرير</div>
                  <div className="text-xs text-white/70">إنشاء تقرير جديد</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </Button>
          </motion.div>

          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => router.push("/edit")}
              className="w-full h-auto py-4 px-4 bg-[#FF9500] text-white rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-white/20 p-2 rounded-lg mr-3">
                  <FileEdit className="h-5 w-5" />
                </div>
                <span className="font-bold">تعديل</span>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </Button>
          </motion.div>

          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => router.push("/delete")}
              className="w-full h-auto py-4 px-4 bg-[#FF3B30] text-white rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-red-400/30 p-2 rounded-lg mr-3">
                  <Ban className="h-5 w-5" />
                </div>
                <span className="font-bold">تعطيل</span>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </Button>
          </motion.div>

          <motion.div whileTap={{ scale: 0.97 }} className="col-span-2">
            <Button
              onClick={() => router.push("/reports")}
              className="w-full h-auto py-4 px-4 bg-[#AF52DE] text-white rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-white/20 p-2 rounded-lg mr-3">
                  <FileBarChart className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">التقارير</div>
                  <div className="text-xs text-white/70">عرض جميع التقارير</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* آخر النشاطات */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="bg-white rounded-2xl p-4 shadow-sm overflow-hidden border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="text-[#1c1c1e]">آخر النشاطات</span>
              <Badge variant="outline" className="bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20">
                جديد
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-full ml-3">
                    <FilePlus className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">تم إضافة تقرير جديد</p>
                    <p className="text-xs text-gray-500">منذ 30 دقيقة</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-[#007AFF]">
                  عرض
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <div className="bg-amber-100 p-2 rounded-full ml-3">
                    <FileEdit className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">تم تعديل تقرير</p>
                    <p className="text-xs text-gray-500">منذ ساعتين</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-[#007AFF]">
                  عرض
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  )
}

/* ============================================================
   المكون الرئيسي - واجهة المشرف
   ============================================================ */
export default function SupervisorInterface() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("home")
  const [username, setUsername] = useState("")
  const [fullName, setFullName] = useState("")
  const [mounted, setMounted] = useState(false)
  const [suspensionCount, setSuspensionCount] = useState(0)

  useEffect(() => {
    const storedUsername = localStorage.getItem("username")
    const storedFullName = localStorage.getItem("full_name")
    if (storedUsername) setUsername(storedUsername)
    if (storedFullName) setFullName(storedFullName)
    setMounted(true)

    // الاستماع لتحديث عدد المعلّقين من SuspensionsTab
    const handleSuspensionCount = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.count !== undefined) {
        setSuspensionCount(detail.count)
      }
    }
    window.addEventListener("suspension-count-update", handleSuspensionCount)

    // الاستماع للتنقل بين التبويبات من الداشبورد
    const handleNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.tab) {
        setActiveTab(detail.tab)
      }
    }
    window.addEventListener("supervisor-navigate", handleNavigate)

    return () => {
      window.removeEventListener("suspension-count-update", handleSuspensionCount)
      window.removeEventListener("supervisor-navigate", handleNavigate)
    }
  }, [])

  const handleLogout = async () => {
    try { await fetchWithCsrf("/api/auth/logout", { method: "POST" }) } catch {}
    localStorage.removeItem("username")
    localStorage.removeItem("full_name")
    localStorage.removeItem("user_role")
    router.push("/")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getFirstName = () => {
    const name = fullName || username || "المشرف"
    return name.split(" ")[0]
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#007AFF] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex flex-col relative">
      {/* الشريط العلوي الثابت */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-100/50">
        <div className="max-w-md mx-auto px-4">
          <motion.div
            className="flex justify-between items-center h-14"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Avatar className="h-9 w-9 bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white shadow-sm">
                  <AvatarFallback className="text-[11px] font-medium bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white">
                    {getInitials(fullName || username || "مشرف")}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#34C759] rounded-full border-2 border-white" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#1c1c1e] leading-tight">
                  مرحباً، {getFirstName()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-[#007AFF] hover:bg-[#007AFF]/5 rounded-full h-9 w-9"
                  >
                    <Bell className="h-[18px] w-[18px]" />
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF3B30] text-[10px] text-white font-medium">
                      2
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <div className="flex flex-col">
                      <span className="font-medium">تم إضافة تقرير جديد</span>
                      <span className="text-xs text-muted-foreground">منذ 5 دقائق</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <div className="flex flex-col">
                      <span className="font-medium">تمت الموافقة على جهازك</span>
                      <span className="text-xs text-muted-foreground">منذ ساعة</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-[#007AFF] hover:bg-[#007AFF]/5 rounded-full h-9 w-9"
                  >
                    <User className="h-[18px] w-[18px]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/settings")}>
                    <SettingsIcon className="ml-2 h-4 w-4" />
                    <span>الإعدادات</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                    <LogOut className="ml-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 pb-20">
        <div className="container max-w-md mx-auto p-4">

          {/* محتوى التبويبات */}
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SupervisorDashboard />
              </motion.div>
            )}
            {activeTab === "reports" && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <DashboardContent />
              </motion.div>
            )}
            {activeTab === "clients" && (
              <motion.div
                key="clients"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ClientsTab />
              </motion.div>
            )}
            {activeTab === "comments" && (
              <motion.div
                key="comments"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SuspensionsTab />
              </motion.div>
            )}
            {activeTab === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <AccountTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* الشريط السفلي */}
      <motion.nav
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        <div className="mx-6 mb-4">
          <div
            className="relative flex items-center justify-around px-1 overflow-hidden"
            style={{ borderRadius: "16px", paddingTop: "6px", paddingBottom: "6px" }}
          >
            {/* خلفية التدرج */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to left, #007AFF, #5856D6)" }} />
            {/* تأثير زجاجي خفيف */}
            <div className="absolute inset-0 backdrop-blur-md" />
            {/* لمعة علوية */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(255,255,255,0.3), transparent)" }} />
            {/* ظل */}
            <div className="absolute inset-x-0 -bottom-px h-1.5 rounded-b-2xl" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.15)" }} />

            <div className="relative flex items-center justify-around w-full">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                const Icon = tab.icon
                const showBadge = tab.id === "comments" && suspensionCount > 0

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex flex-col items-center justify-center py-1 px-2 min-w-0 flex-1 transition-all duration-300"
                  >
                    {/* رقم إشعار التعليقات */}
                    {showBadge && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 left-1/2 z-20 flex items-center justify-center"
                      >
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[9px] font-bold text-white shadow-sm">
                          {suspensionCount}
                        </span>
                      </motion.span>
                    )}
                    {/* خلفية التبويب النشط - شكل دائري مضيء */}
                    {isActive && (
                      <motion.div
                        layoutId="supervisor-active-bg"
                        className="absolute bg-white/20 rounded-xl"
                        style={{ width: "48px", height: "48px", top: "0px" }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}

                    <Icon
                      className={`relative z-10 transition-all duration-300 ${
                        isActive
                          ? "text-white"
                          : "text-white/60"
                      }`}
                      style={{ width: "24px", height: "24px", strokeWidth: isActive ? "2" : "1.5" }}
                    />

                    <span
                      className={`relative z-10 transition-all duration-300 leading-none ${
                        isActive ? "text-white font-semibold" : "text-white/60"
                      }`}
                      style={{ fontSize: "11px", marginTop: "2px" }}
                    >
                      {tab.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </motion.nav>
    </div>
  )
}
