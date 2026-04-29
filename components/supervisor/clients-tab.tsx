"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import {
  UserPlus,
  Search,
  Users,
  Loader2,
  Settings,
  FileBarChart,
  Clock,
  Hash,
  Ban,
  ShieldCheck,
  CheckCircle,
  XCircle,
  MoreVertical,
  FileText,
  CalendarDays,
  AlertTriangle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AddUserDialog } from "./add-user-dialog"
import SetLimitDialog from "./set-limit-dialog"
import UserDetailView from "./user-detail-view"
import { SuspendUserDialog } from "./suspend-user-dialog"
import { UnsuspendUserDialog } from "./unsuspend-user-dialog"
import { AutoSuspendDialog } from "./auto-suspend-dialog"
import { checkSuspension, type SuspensionCheckResult } from "@/lib/suspension-check"

interface UserCardData {
  user_id: string
  username: string
  full_name: string | null
  phone: string | null
  email: string | null
  user_created_at: string
  period_report_count: number | null
  period_total_days: number | null
  total_suspensions: number | null
  last_report_at: string | null
  is_suspended: boolean | null
  limit_type: string | null
  limit_value: number | null
  limit_date: string | null
}

export function ClientsTab() {
  const supabase = createClientSupabaseClient()
  const [users, setUsers] = useState<UserCardData[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  // Dialogs
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [setLimitUser, setSetLimitUser] = useState<{
    id: string
    fullName: string
    limitType: string | null
  } | null>(null)

  // Detail view
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  // Suspend / Unsuspend dialogs
  const [suspendTarget, setSuspendTarget] = useState<{
    id: string
    fullName: string
    stats: { periodReportCount: number; periodTotalDays: number }
  } | null>(null)
  const [unsuspendTarget, setUnsuspendTarget] = useState<{
    id: string
    fullName: string
    suspensionInfo: { suspendedAt: string | null; reason: string | null } | null
  } | null>(null)

  // Auto-suspend dialog
  const [autoSuspendOpen, setAutoSuspendOpen] = useState(false)
  const [usersToAutoSuspend, setUsersToAutoSuspend] = useState<SuspensionCheckResult[]>([])

  const supervisorId = typeof window !== "undefined" ? localStorage.getItem("user_id") : ""

  const fetchUsers = useCallback(async () => {
    if (!supervisorId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("supervisor_users_stats")
        .select("*")
        .eq("supervisor_id", supervisorId)
        .order("user_created_at", { ascending: false })

      if (error) throw error
      setUsers(data || [])
      setFilteredUsers(data || [])

      // فحص التعليق التلقائي
      const toSuspend: SuspensionCheckResult[] = []
      data?.forEach((u) => {
        const result = checkSuspension(
          {
            limit_type: u.limit_type,
            limit_value: u.limit_value,
            limit_date: u.limit_date,
            is_suspended: u.is_suspended ?? false,
          },
          {
            period_report_count: u.period_report_count ?? 0,
            period_total_days: u.period_total_days ?? 0,
            last_report_at: u.last_report_at,
          }
        )
        if (result) {
          toSuspend.push({ ...result, userId: u.user_id, userName: u.full_name || u.username })
        }
      })

      if (toSuspend.length > 0) {
        setUsersToAutoSuspend(toSuspend)
        setAutoSuspendOpen(true)
      }
    } catch (err) {
      console.error("Error fetching users:", err)
    } finally {
      setLoading(false)
    }
  }, [supervisorId])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users)
      return
    }
    const q = searchQuery.toLowerCase()
    const filtered = users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
    )
    setFilteredUsers(filtered)
  }, [searchQuery, users])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    const d = new Date(dateStr)
    return d.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getLimitDisplay = (user: UserCardData) => {
    if (!user.limit_type) return null
    switch (user.limit_type) {
      case "days_count":
        return { label: "حد بالأيام", value: `${user.limit_value} يوم`, icon: Clock, color: "text-blue-600" }
      case "reports_count":
        return { label: "حد بالتقارير", value: `${user.limit_value} تقرير`, icon: FileBarChart, color: "text-purple-600" }
      case "specific_date":
        return { label: "حد بالتاريخ", value: formatDate(user.limit_date), icon: Hash, color: "text-amber-600" }
      default:
        return null
    }
  }

  // Detail view
  if (selectedUserId) {
    return (
      <UserDetailView
        userId={selectedUserId}
        onBack={() => setSelectedUserId(null)}
      />
    )
  }

  return (
    <div dir="rtl">
      {/* الشريط العلوي */}
      <motion.div
        className="flex justify-between items-center mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-800">العملاء</h2>
          <Badge variant="outline" className="bg-[#007AFF]/10 text-[#007AFF]">
            {loading ? "..." : `${filteredUsers.length} عميل`}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-[#007AFF] hover:bg-[#007AFF]/5"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            onClick={() => setAddUserOpen(true)}
            className="bg-[#007AFF] text-white hover:opacity-95 font-semibold"
            size="sm"
          >
            <UserPlus className="h-4 w-4 ml-1" />
            <span className="text-sm">إضافة عميل</span>
          </Button>
        </div>
      </motion.div>

      {/* شريط البحث */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <form onSubmit={handleSearch}>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، اسم المستخدم، أو رقم الهاتف..."
                className="bg-[#f2f2f7] border-0 focus:ring-2 focus:ring-[#007AFF]/30"
                autoFocus
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* قائمة المستخدمين */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#007AFF] mx-auto mb-3" />
            <p className="text-sm text-gray-500">جاري تحميل العملاء...</p>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-20 px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 rounded-3xl bg-[#f2f2f7] flex items-center justify-center shadow-lg mb-4">
            <Users className="h-10 w-10 text-[#007AFF]/50" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            {searchQuery ? "لا توجد نتائج" : "لا يوجد عملاء بعد"}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery
              ? "جرب البحث بكلمات مختلفة"
              : "ابدأ بإضافة عميل جديد لإدارة حسابه"}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => setAddUserOpen(true)}
              className="bg-[#007AFF] text-white hover:opacity-95 font-semibold"
            >
              <UserPlus className="h-4 w-4 ml-1" />
              إضافة عميل جديد
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredUsers.map((user, index) => {
              const limitInfo = getLimitDisplay(user)
              return (
                <motion.div
                  key={user.user_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25, delay: index * 0.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="bg-white rounded-2xl px-3.5 py-2.5 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    {/* الصف الأول: التاريخ + أيقونة الحالة + القائمة */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-[11px] text-gray-400">
                          {formatDate(user.last_report_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {user.is_suspended ? (
                          <XCircle className="w-[18px] h-[18px] text-[#FF3B30]" />
                        ) : (
                          <CheckCircle className="w-[18px] h-[18px] text-[#34C759]" />
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-1.5 rounded-full hover:bg-[#f2f2f7] transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-44 rounded-xl">
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSetLimitUser({
                                  id: user.user_id,
                                  fullName: user.full_name || user.username,
                                  limitType: user.limit_type,
                                })
                              }}
                            >
                              <Settings className="w-4 h-4 text-[#007AFF]" />
                              <span className="text-sm">تحديد الحد المسموح</span>
                            </DropdownMenuItem>
                            {user.is_suspended ? (
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  const supabaseClient = createClientSupabaseClient()
                                  const { data: susp } = await supabaseClient
                                    .from("user_suspensions")
                                    .select("suspended_at, suspension_reason")
                                    .eq("user_id", user.user_id)
                                    .is("reactivated_at", null)
                                    .order("suspended_at", { ascending: false })
                                    .limit(1)
                                    .maybeSingle()
                                  setUnsuspendTarget({
                                    id: user.user_id,
                                    fullName: user.full_name || user.username,
                                    suspensionInfo: susp
                                      ? { suspendedAt: susp.suspended_at, reason: susp.suspension_reason }
                                      : null,
                                  })
                                }}
                              >
                                <ShieldCheck className="w-4 h-4 text-[#34C759]" />
                                <span className="text-sm">إلغاء التعليق</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSuspendTarget({
                                    id: user.user_id,
                                    fullName: user.full_name || user.username,
                                    stats: {
                                      periodReportCount: user.period_report_count ?? 0,
                                      periodTotalDays: user.period_total_days ?? 0,
                                    },
                                  })
                                }}
                              >
                                <Ban className="w-4 h-4 text-[#FF3B30]" />
                                <span className="text-sm">تعليق المستخدم</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* الصف الثاني: الأيقونة + الاسم + اسم المستخدم */}
                    <div className="flex items-start gap-2.5 mb-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0 mt-[-2px] ${
                          user.is_suspended
                            ? "bg-gradient-to-br from-[#FF3B30] to-[#D63028] shadow-[#FF3B30]/15"
                            : "bg-gradient-to-br from-[#007AFF] to-[#0055D4] shadow-[#007AFF]/15"
                        }`}
                      >
                        {(user.full_name || user.username || "ع").charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[15px] text-[#1c1c1e] leading-tight truncate">
                          {user.full_name || user.username}
                        </h3>
                        <p className="text-[12px] text-gray-400 truncate">
                          @{user.username}
                        </p>
                      </div>
                    </div>

                    {/* خط فاصل */}
                    <div className="border-t border-gray-100 pt-2.5">
                      {/* صف الإحصائيات - مكونات في صف واحد */}
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-[#007AFF]" />
                          <span className="text-[11px] font-semibold text-[#007AFF]">{user.period_report_count || 0}</span>
                          <span className="text-[11px] text-gray-400">تقرير</span>
                        </div>
                        <div className="w-px h-3 bg-gray-200" />
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 text-[#FF9500]" />
                          <span className="text-[11px] font-semibold text-[#FF9500]">{user.period_total_days || 0}</span>
                          <span className="text-[11px] text-gray-400">يوم</span>
                        </div>
                        <div className="w-px h-3 bg-gray-200" />
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#FF3B30]" />
                          <span className="text-[11px] font-semibold text-[#FF3B30]">{user.total_suspensions || 0}</span>
                          <span className="text-[11px] text-gray-400">تعليق</span>
                        </div>
                      </div>

                      {/* الصف الأخير: الحد + عرض التفاصيل */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {limitInfo ? (
                            <>
                              <limitInfo.icon className={`w-3 h-3 ${limitInfo.color}`} />
                              <span className="text-[11px] text-gray-500">
                                {limitInfo.label}: <span className="font-semibold text-gray-700">{limitInfo.value}</span>
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-[#FF3B30] font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              بدون حد
                            </span>
                          )}
                        </div>
                        <button
                          className="text-[11px] font-semibold text-[#007AFF] hover:text-[#0062CC] transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedUserId(user.user_id)
                          }}
                        >
                          عرض التفاصيل
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Dialogs */}
      {supervisorId && (
        <AddUserDialog
          open={addUserOpen}
          onOpenChange={setAddUserOpen}
          supervisorId={supervisorId}
          onSuccess={fetchUsers}
        />
      )}

      {setLimitUser && (
        <SetLimitDialog
          open={!!setLimitUser}
          onOpenChange={(open) => {
            if (!open) setSetLimitUser(null)
          }}
          userId={setLimitUser.id}
          userFullName={setLimitUser.fullName}
          currentLimitType={setLimitUser.limitType}
          onSuccess={fetchUsers}
        />
      )}

      {suspendTarget && (
        <SuspendUserDialog
          open={!!suspendTarget}
          onOpenChange={(open) => {
            if (!open) setSuspendTarget(null)
          }}
          userId={suspendTarget.id}
          userFullName={suspendTarget.fullName}
          currentStats={suspendTarget.stats}
          onSuccess={fetchUsers}
        />
      )}

      {unsuspendTarget && (
        <UnsuspendUserDialog
          open={!!unsuspendTarget}
          onOpenChange={(open) => {
            if (!open) setUnsuspendTarget(null)
          }}
          userId={unsuspendTarget.id}
          userFullName={unsuspendTarget.fullName}
          suspensionInfo={unsuspendTarget.suspensionInfo}
          onSuccess={fetchUsers}
        />
      )}

      {autoSuspendOpen && usersToAutoSuspend.length > 0 && (
        <AutoSuspendDialog
          open={autoSuspendOpen}
          onOpenChange={setAutoSuspendOpen}
          usersToSuspend={usersToAutoSuspend.map((u) => ({
            userId: (u as SuspensionCheckResult & { userId: string }).userId,
            userName: (u as SuspensionCheckResult & { userName: string }).userName,
            reason: u.reason,
            reasonType: u.reasonType,
            currentValue: u.currentValue,
            limitValue: u.limitValue,
          }))}
          onConfirm={() => {
            setUsersToAutoSuspend([])
            fetchUsers()
          }}
          onDismiss={() => {
            setUsersToAutoSuspend([])
          }}
        />
      )}
    </div>
  )
}
