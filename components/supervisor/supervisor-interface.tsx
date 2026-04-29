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
  FileX,
  ChevronRight,
  Construction,
  Sparkles,
} from "lucide-react"
import { ClientsTab } from "./clients-tab"
import { SuspensionsTab } from "./suspensions-tab"

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
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-lg">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
            <Construction className="w-10 h-10 text-indigo-500" />
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
          className="bg-indigo-50 text-indigo-600 border-indigo-200 px-4 py-1.5 text-sm font-medium"
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
    deletedReports: 0,
    activeReports: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const userId = localStorage.getItem("user_id")
    if (userId) fetchReportStats(userId)
  }, [])

  const fetchReportStats = async (userId: string) => {
    setIsLoading(true)
    try {
      const { count: totalCount, error: totalError } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      const { count: deletedCount, error: deletedError } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_deleted", true)

      if (totalError || deletedError) {
        throw new Error("حدث خطأ أثناء جلب الإحصائيات")
      }

      setStats({
        totalReports: totalCount || 0,
        deletedReports: deletedCount || 0,
        activeReports: (totalCount || 0) - (deletedCount || 0),
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
        setError("لم يتم العثور على نتائج")
        return
      }

      localStorage.setItem("search_results", JSON.stringify(data))
      router.push("/search")
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
        <Card className="glass-card overflow-hidden border-none shadow-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="text-indigo-900">لوحة التحكم</span>
              <Badge variant="outline" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                {isLoading ? "جاري التحميل..." : `${stats.totalReports} تقرير`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-sm">
                <span className="text-2xl font-bold text-blue-600">{stats.totalReports}</span>
                <span className="text-xs text-blue-700">إجمالي</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-sm">
                <span className="text-2xl font-bold text-green-600">{stats.activeReports}</span>
                <span className="text-xs text-green-700">نشط</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 shadow-sm">
                <span className="text-2xl font-bold text-red-600">{stats.deletedReports}</span>
                <span className="text-xs text-red-700">محذوف</span>
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
                indicatorClassName="bg-gradient-to-r from-indigo-500 to-purple-500"
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
            className="text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 p-1 h-auto"
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
              <Card className="glass-card overflow-hidden border-none shadow-lg bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
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
                        className="border-indigo-200 focus:border-indigo-400 bg-white/70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        placeholder="رقم الهوية"
                        className="border-indigo-200 focus:border-indigo-400 bg-white/70"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
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
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="col-span-2">
            <Button
              onClick={() => router.push("/add")}
              className="w-full h-auto py-4 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-blue-400/30 p-2 rounded-lg mr-3">
                  <FilePlus className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">إضافة تقرير</div>
                  <div className="text-xs text-blue-100">إنشاء تقرير جديد</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => router.push("/edit")}
              className="w-full h-auto py-4 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-amber-400/30 p-2 rounded-lg mr-3">
                  <FileEdit className="h-5 w-5" />
                </div>
                <span className="font-bold">تعديل</span>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => router.push("/delete")}
              className="w-full h-auto py-4 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg shadow-red-500/20 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-red-400/30 p-2 rounded-lg mr-3">
                  <FileX className="h-5 w-5" />
                </div>
                <span className="font-bold">حذف</span>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="col-span-2">
            <Button
              onClick={() => router.push("/reports")}
              className="w-full h-auto py-4 px-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-purple-400/30 p-2 rounded-lg mr-3">
                  <FileBarChart className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">التقارير</div>
                  <div className="text-xs text-purple-100">عرض جميع التقارير</div>
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
        <Card className="glass-card overflow-hidden border-none shadow-lg bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="text-indigo-900">آخر النشاطات</span>
              <Badge variant="outline" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
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
                <Button variant="ghost" size="sm" className="h-8 text-indigo-600">
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
                <Button variant="ghost" size="sm" className="h-8 text-indigo-600">
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
  const [mounted, setMounted] = useState(false)
  const [suspensionCount, setSuspensionCount] = useState(0)

  useEffect(() => {
    const storedUsername = localStorage.getItem("username")
    if (storedUsername) setUsername(storedUsername)
    setMounted(true)

    // الاستماع لتحديث عدد المعلّقين من SuspensionsTab
    const handleSuspensionCount = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.count !== undefined) {
        setSuspensionCount(detail.count)
      }
    }
    window.addEventListener("suspension-count-update", handleSuspensionCount)
    return () => window.removeEventListener("suspension-count-update", handleSuspensionCount)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("user_id")
    localStorage.removeItem("username")
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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex flex-col relative">
      {/* المحتوى الرئيسي */}
      <main className="flex-1 pb-20">
        <div className="container max-w-md mx-auto p-4">
          {/* الشريط العلوي */}
          <motion.div
            className="flex justify-between items-center mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg">
                <AvatarFallback>{getInitials(username || "مشرف")}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  مرحباً
                </h1>
                <p className="text-gray-600">{username || "المشرف"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-full"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
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
                    className="text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-full"
                  >
                    <User className="h-5 w-5" />
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
                <ComingSoonContent description="سيتم إنشاء هذه الواجهة قريباً لتوفير تجربة أفضل لإدارة المشرفين" />
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
                <ComingSoonContent description="سيتم إنشاء هذه الواجهة قريباً لتوفير تجربة أفضل لإدارة الحساب والملف الشخصي" />
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
            <div className="absolute inset-0" style={{ background: "linear-gradient(to left, #2196F3, #673AB7)" }} />
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
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
                          {suspensionCount}
                        </span>
                      </motion.span>
                    )}
                    {/* خلفية التبويب النشط - شكل دائري مضيء */}
                    {isActive && (
                      <motion.div
                        layoutId="supervisor-active-bg"
                        className="absolute rounded-full"
                        style={{ width: "48px", height: "48px", background: "rgba(255,255,255,0.2)", top: "0px" }}
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
