"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import {
  UserPlus,
  Search,
  Users,
  Loader2,
  ChevronLeft,
  Settings,
  Shield,
  ShieldOff,
  FileBarChart,
  Clock,
  Hash,
  Ban,
  ShieldCheck,
} from "lucide-react"
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
        <div className="space-y-3">
          <AnimatePresence>
            {filteredUsers.map((user, index) => {
              const limitInfo = getLimitDisplay(user)
              return (
                <motion.div
                  key={user.user_id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200"
                    onClick={() => setSelectedUserId(user.user_id)}
                  >
                    <CardContent className="p-4">
                      {/* الرأس: الاسم + الحالة + زر الضبط */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* صورة رمزية */}
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ${
                              user.is_suspended
                                ? "bg-[#FF3B30]"
                                : "bg-[#007AFF]"
                            }`}
                          >
                            {(user.full_name || user.username || "ع").charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm">
                              {user.full_name || user.username}
                            </h3>
                            <p className="text-xs text-gray-500">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.is_suspended ? (
                            <Badge className="bg-[#FF3B30]/10 text-[#FF3B30] border-0 text-[10px] px-2 py-0.5">
                              <ShieldOff className="h-3 w-3 ml-0.5" />
                              معلّق
                            </Badge>
                          ) : (
                            <Badge className="bg-[#34C759]/10 text-[#34C759] border-0 text-[10px] px-2 py-0.5">
                              <Shield className="h-3 w-3 ml-0.5" />
                              نشط
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#007AFF] hover:bg-[#007AFF]/5"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSetLimitUser({
                                id: user.user_id,
                                fullName: user.full_name || user.username,
                                limitType: user.limit_type,
                              })
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          {user.is_suspended ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#34C759] hover:bg-[#34C759]/5"
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
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#FF3B30] hover:bg-[#FF3B30]/5"
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
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* الإحصائيات */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="flex flex-col items-center bg-[#f2f2f7] rounded-lg p-2">
                          <span className="text-lg font-bold text-[#007AFF]">
                            {user.period_report_count || 0}
                          </span>
                          <span className="text-[10px] text-[#007AFF] leading-tight">تقرير</span>
                        </div>
                        <div className="flex flex-col items-center bg-[#f2f2f7] rounded-lg p-2">
                          <span className="text-lg font-bold text-[#FF9500]">
                            {user.period_total_days || 0}
                          </span>
                          <span className="text-[10px] text-[#FF9500] leading-tight">يوم</span>
                        </div>
                        <div className="flex flex-col items-center bg-[#f2f2f7] rounded-lg p-2">
                          <span className="text-lg font-bold text-[#FF3B30]">
                            {user.total_suspensions || 0}
                          </span>
                          <span className="text-[10px] text-[#FF3B30] leading-tight">تعليق</span>
                        </div>
                      </div>

                      {/* الحد المسموح + تاريخ آخر تقرير */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {limitInfo ? (
                            <>
                              <limitInfo.icon className={`h-3.5 w-3.5 ${limitInfo.color}`} />
                              <span className="text-[11px] text-gray-600">
                                {limitInfo.label}: <span className="font-medium">{limitInfo.value}</span>
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-gray-400">بدون حد</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(user.last_report_at)}</span>
                        </div>
                      </div>

                      {/* سهم العرض */}
                      <div className="flex justify-center mt-2">
                        <ChevronLeft className="h-4 w-4 text-gray-300" />
                      </div>
                    </CardContent>
                  </Card>
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
