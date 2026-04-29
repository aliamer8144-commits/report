"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShieldOff,
  ShieldCheck,
  Loader2,
  Search,
  Filter,
  Clock,
  Calendar,
  User,
  FileBarChart,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Ban,
  CheckCircle2,
  RotateCcw,
  X,
} from "lucide-react"
import { UnsuspendUserDialog } from "./unsuspend-user-dialog"

/* ============================================================
   الأنواع
   ============================================================ */

interface SuspensionRecord {
  id: string
  user_id: string
  username: string
  full_name: string | null
  suspended_by: string | null
  suspended_by_name: string | null
  suspension_reason: string | null
  suspended_at: string
  reactivated_at: string | null
  reactivated_by: string | null
  reactivated_by_name: string | null
  reports_count_at_suspension: number
  days_count_at_suspension: number
  // fields from users table
  is_currently_suspended: boolean
}

/* ============================================================
   المكون الرئيسي
   ============================================================ */

export function SuspensionsTab({}: {}) {
  const supabase = createClientSupabaseClient()
  const supervisorId = typeof window !== "undefined" ? localStorage.getItem("user_id") : ""

  const [suspensions, setSuspensions] = useState<SuspensionRecord[]>([])
  const [filteredSuspensions, setFilteredSuspensions] = useState<SuspensionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [activeOnly, setActiveOnly] = useState(true)

  // حالة الفلترة
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDaysMin, setFilterDaysMin] = useState("")
  const [filterDaysMax, setFilterDaysMax] = useState("")

  // Dialog
  const [unsuspendTarget, setUnsuspendTarget] = useState<{
    id: string
    fullName: string
    suspensionInfo: {
      suspendedAt: string | null
      reason: string | null
      daysCount: number | null
      reportsCount: number | null
    }
  } | null>(null)

  // عدد المعلّقين النشطين (للإشعار)
  const activeCount = suspensions.filter((s) => !s.reactivated_at).length

  /* ------ جلب بيانات التعليقات ------ */
  const fetchSuspensions = useCallback(async () => {
    if (!supervisorId) return
    setLoading(true)
    try {
      // جلب المستخدمين التابعين للمشرف
      const { data: managedUsers, error: usersError } = await supabase
        .from("users")
        .select("id")
        .eq("supervisor_id", supervisorId)

      if (usersError) throw usersError
      if (!managedUsers || managedUsers.length === 0) {
        setSuspensions([])
        setFilteredSuspensions([])
        setLoading(false)
        return
      }

      const userIds = managedUsers.map((u) => u.id)

      // جلب جميع سجلات التعليقات للمستخدمين التابعين
      const { data: suspensionData, error: suspError } = await supabase
        .from("user_suspensions")
        .select(`
          id,
          user_id,
          suspended_by,
          suspension_reason,
          suspended_at,
          reactivated_at,
          reactivated_by,
          reports_count_at_suspension,
          days_count_at_suspension
        `)
        .in("user_id", userIds)
        .order("suspended_at", { ascending: false })

      if (suspError) throw suspError

      // جلب بيانات المستخدمين
      const { data: allUsers, error: allUsersError } = await supabase
        .from("users")
        .select("id, username, full_name, is_suspended")

      if (allUsersError) throw allUsersError

      const userMap = new Map(allUsers?.map((u) => [u.id, u]) || [])

      // دمج البيانات
      const records: SuspensionRecord[] = (suspensionData || []).map((s) => {
        const user = userMap.get(s.user_id)
        const suspendedByUser = userMap.get(s.suspended_by || "")
        const reactivatedByUser = userMap.get(s.reactivated_by || "")
        return {
          id: s.id,
          user_id: s.user_id,
          username: user?.username || "—",
          full_name: user?.full_name,
          suspended_by: s.suspended_by,
          suspended_by_name: suspendedByUser?.full_name || suspendedByUser?.username || "النظام",
          suspension_reason: s.suspension_reason,
          suspended_at: s.suspended_at,
          reactivated_at: s.reactivated_at,
          reactivated_by: s.reactivated_by,
          reactivated_by_name: reactivatedByUser?.full_name || reactivatedByUser?.username || null,
          reports_count_at_suspension: s.reports_count_at_suspension || 0,
          days_count_at_suspension: s.days_count_at_suspension || 0,
          is_currently_suspended: user?.is_suspended ?? false,
        }
      })

      setSuspensions(records)
      setFilteredSuspensions(records)
    } catch (err) {
      console.error("Error fetching suspensions:", err)
    } finally {
      setLoading(false)
    }
  }, [supervisorId])

  useEffect(() => {
    fetchSuspensions()
  }, [fetchSuspensions])

  /* ------ الفلترة ------ */
  useEffect(() => {
    let result = [...suspensions]

    // فلتر: نشط فقط
    if (activeOnly) {
      result = result.filter((s) => !s.reactivated_at)
    }

    // فلتر: البحث بالاسم أو اسم المستخدم
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(q) ||
          s.username?.toLowerCase().includes(q) ||
          s.suspension_reason?.toLowerCase().includes(q)
      )
    }

    // فلتر: عدد الأيام (من - إلى)
    if (filterDaysMin) {
      const min = parseInt(filterDaysMin)
      if (!isNaN(min)) {
        result = result.filter((s) => s.days_count_at_suspension >= min)
      }
    }
    if (filterDaysMax) {
      const max = parseInt(filterDaysMax)
      if (!isNaN(max)) {
        result = result.filter((s) => s.days_count_at_suspension <= max)
      }
    }

    setFilteredSuspensions(result)
  }, [suspensions, activeOnly, searchQuery, filterDaysMin, filterDaysMax])

  /* ------ مساعدات ------ */
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const getRelativeTime = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "الآن"
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`
    if (diffHours < 24) return `منذ ${diffHours} ساعة`
    if (diffDays < 30) return `منذ ${diffDays} يوم`
    return `منذ ${Math.floor(diffDays / 30)} شهر`
  }

  const getReasonBadge = (reason: string | null) => {
    if (!reason) return null
    const lower = reason.toLowerCase()
    if (lower.includes("أيام")) {
      return { label: "تجاوز الأيام", color: "bg-blue-100 text-blue-700 border-blue-200" }
    }
    if (lower.includes("تقارير")) {
      return { label: "تجاوز التقارير", color: "bg-purple-100 text-purple-700 border-purple-200" }
    }
    if (lower.includes("صلاحية") || lower.includes("تاريخ")) {
      return { label: "انتهت الصلاحية", color: "bg-amber-100 text-amber-700 border-amber-200" }
    }
    return { label: "أخرى", color: "bg-gray-100 text-gray-700 border-gray-200" }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setFilterDaysMin("")
    setFilterDaysMax("")
  }

  /* ------ تصدير عدد المعلّقين ------ */
  // نستخدم useEffect لتحديث العدد في التبويب
  useEffect(() => {
    // إرسال الحدث المخصص لتحديث رقم الإشعار في الشريط السفلي
    window.dispatchEvent(
      new CustomEvent("suspension-count-update", { detail: { count: activeCount } })
    )
  }, [activeCount])

  /* ============================================================
     واجهة التحميل
     ============================================================ */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">جاري تحميل سجل التعليقات...</p>
        </div>
      </div>
    )
  }

  /* ============================================================
     واجهة فارغة
     ============================================================ */
  if (suspensions.length === 0) {
    return (
      <div dir="rtl">
        <motion.div
          className="flex flex-col items-center justify-center py-20 px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shadow-lg mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">لا توجد تعليقات</h3>
          <p className="text-sm text-gray-500">جميع الحسابات التابعة لك تعمل بشكل طبيعي</p>
        </motion.div>
      </div>
    )
  }

  /* ============================================================
     الواجهة الرئيسية
     ============================================================ */
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
          <h2 className="text-lg font-bold text-gray-800">التعليقات</h2>
          {activeCount > 0 && (
            <Badge className="bg-red-500 text-white border-red-500 hover:bg-red-600 text-xs px-2">
              {activeCount} معلّق
            </Badge>
          )}
          <Badge variant="outline" className="bg-gray-50 text-gray-600 hover:bg-gray-100 text-xs">
            {filteredSuspensions.length} سجل
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:bg-gray-100"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>

      {/* أزرار التبديل: نشط / الكل */}
      <motion.div
        className="flex gap-2 mb-4"
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Button
          size="sm"
          variant={activeOnly ? "default" : "outline"}
          className={
            activeOnly
              ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm text-xs"
              : "border-gray-200 text-gray-600 text-xs"
          }
          onClick={() => setActiveOnly(true)}
        >
          <ShieldOff className="h-3.5 w-3.5 ml-1" />
          معلّقين حالياً
          {activeCount > 0 && (
            <span className="bg-white/20 rounded-full px-1.5 py-0 text-[10px] mr-1">
              {activeCount}
            </span>
          )}
        </Button>
        <Button
          size="sm"
          variant={!activeOnly ? "default" : "outline"}
          className={
            !activeOnly
              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm text-xs"
              : "border-gray-200 text-gray-600 text-xs"
          }
          onClick={() => setActiveOnly(false)}
        >
          <RotateCcw className="h-3.5 w-3.5 ml-1" />
          كل السجلات
        </Button>
      </motion.div>

      {/* لوحة الفلترة */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 overflow-hidden"
          >
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Filter className="h-4 w-4" />
                    تصفية النتائج
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500 hover:text-gray-700 h-7"
                    onClick={clearFilters}
                  >
                    <X className="h-3 w-3 ml-1" />
                    مسح
                  </Button>
                </div>
                <div className="space-y-2">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم، اسم المستخدم، أو السبب..."
                    className="border-gray-200 text-sm h-9"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">أيام (من)</label>
                      <Input
                        type="number"
                        value={filterDaysMin}
                        onChange={(e) => setFilterDaysMin(e.target.value)}
                        placeholder="الحد الأدنى"
                        className="border-gray-200 text-sm h-9"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">أيام (إلى)</label>
                      <Input
                        type="number"
                        value={filterDaysMax}
                        onChange={(e) => setFilterDaysMax(e.target.value)}
                        placeholder="الحد الأقصى"
                        className="border-gray-200 text-sm h-9"
                        min={0}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* قائمة التعليقات */}
      {filteredSuspensions.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-16 px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-base font-bold text-gray-700 mb-1">لا توجد نتائج</h3>
          <p className="text-sm text-gray-500 mb-3">جرب تعديل معايير البحث أو الفلترة</p>
          <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs">
            مسح الفلاتر
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredSuspensions.map((suspension, index) => {
              const isActive = !suspension.reactivated_at
              const reasonBadge = getReasonBadge(suspension.suspension_reason)

              return (
                <motion.div
                  key={suspension.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                >
                  <Card
                    className={`glass-card overflow-hidden border-none shadow-lg transition-shadow duration-300 hover:shadow-xl ${
                      isActive ? "border-r-4 border-r-red-400" : "border-r-4 border-r-green-400 opacity-75"
                    }`}
                  >
                    <CardContent className="p-4">
                      {/* الرأس: اسم المستخدم + الحالة */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* صورة رمزية */}
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ${
                              isActive
                                ? "bg-gradient-to-br from-red-400 to-red-500"
                                : "bg-gradient-to-br from-green-400 to-emerald-500"
                            }`}
                          >
                            {isActive ? (
                              <Ban className="h-5 w-5" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm">
                              {suspension.full_name || suspension.username}
                            </h3>
                            <p className="text-xs text-gray-500">@{suspension.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isActive ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-[10px] px-2 py-0.5">
                              <ShieldOff className="h-3 w-3 ml-0.5" />
                              معلّق
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-[10px] px-2 py-0.5">
                              <ShieldCheck className="h-3 w-3 ml-0.5" />
                              مفعّل
                            </Badge>
                          )}
                          {reasonBadge && (
                            <Badge
                              variant="outline"
                              className={`${reasonBadge.color} text-[10px] px-2 py-0.5`}
                            >
                              {reasonBadge.label}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* سبب التعليق */}
                      {suspension.suspension_reason && (
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100 mb-3">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {suspension.suspension_reason}
                          </p>
                        </div>
                      )}

                      {/* إحصائيات */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100/80">
                          <FileBarChart className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-blue-500">التقارير</p>
                            <p className="text-sm font-bold text-blue-700">
                              {suspension.reports_count_at_suspension}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100/80">
                          <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-amber-500">الأيام</p>
                            <p className="text-sm font-bold text-amber-700">
                              {suspension.days_count_at_suspension}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* التواريخ */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-[11px]">
                          <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-500">تاريخ التعليق:</span>
                          <span className="font-medium text-gray-700">
                            {formatDate(suspension.suspended_at)}
                          </span>
                          <span className="text-gray-400">({getRelativeTime(suspension.suspended_at)})</span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-500">بواسطة:</span>
                          <span className="font-medium text-gray-700">
                            {suspension.suspended_by_name}
                          </span>
                        </div>

                        {!isActive && suspension.reactivated_at && (
                          <>
                            <Separator className="my-1.5" />
                            <div className="flex items-center gap-2 text-[11px]">
                              <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                              <span className="text-gray-500">إلغاء التعليق:</span>
                              <span className="font-medium text-green-700">
                                {formatDate(suspension.reactivated_at)}
                              </span>
                              {suspension.reactivated_by_name && (
                                <span className="text-gray-400">
                                  ({suspension.reactivated_by_name})
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* زر إلغاء التعليق */}
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Button
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-sm h-9 text-sm"
                            onClick={() =>
                              setUnsuspendTarget({
                                id: suspension.user_id,
                                fullName: suspension.full_name || suspension.username,
                                suspensionInfo: {
                                  suspendedAt: suspension.suspended_at,
                                  reason: suspension.suspension_reason,
                                  daysCount: suspension.days_count_at_suspension,
                                  reportsCount: suspension.reports_count_at_suspension,
                                },
                              })
                            }
                          >
                            <ShieldCheck className="h-4 w-4 ml-1.5" />
                            إلغاء التعليق وإعادة التفعيل
                          </Button>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* حوار إلغاء التعليق */}
      {unsuspendTarget && (
        <UnsuspendUserDialog
          open={!!unsuspendTarget}
          onOpenChange={(open) => {
            if (!open) setUnsuspendTarget(null)
          }}
          userId={unsuspendTarget.id}
          userFullName={unsuspendTarget.fullName}
          suspensionInfo={unsuspendTarget.suspensionInfo}
          onSuccess={() => {
            setUnsuspendTarget(null)
            fetchSuspensions()
          }}
        />
      )}
    </div>
  )
}
