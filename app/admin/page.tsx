"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { PageHeader } from "@/components/ui-custom/page-header"
import { Shield } from "lucide-react"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersTab } from "@/components/admin/users-tab"
import type { User, UserCountSummary, SelectedUserReport, NewUserForm, EditForm } from "@/components/admin/users-tab"
import { DevicesTab } from "@/components/admin/devices-tab"
import type { Device } from "@/components/admin/devices-tab"
import { UsageTab } from "@/components/admin/usage-tab"
import type { UsageStats, UsageLog } from "@/components/admin/usage-tab"

export default function AdminPage() {
  // ─── Users state ───────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([])
  const [userCounts, setUserCounts] = useState<UserCountSummary[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserReports, setSelectedUserReports] = useState<SelectedUserReport[]>([])
  const [loadingUserReports, setLoadingUserReports] = useState(false)
  const [newUser, setNewUser] = useState<NewUserForm>({
    username: "",
    password: "",
    confirmPassword: "",
    role: "user",
  })
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    username: "",
    password: "",
    role: "user",
  })
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // ─── Devices state ─────────────────────────────────────────────────────────
  const [devices, setDevices] = useState<Device[]>([])

  // ─── Usage state ───────────────────────────────────────────────────────────
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [loadingUsage, setLoadingUsage] = useState(false)

  // ─── Shared state ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const supabase = createClientSupabaseClient()

  // ─── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        if (!res.ok) {
          window.location.href = "/"
          return
        }
        const { user } = await res.json()
        if (user.role !== "admin") {
          window.location.href = "/home"
          return
        }
      } catch (_err) {
        window.location.href = "/"
        return
      }
      setIsCheckingAuth(false)
    }
    checkAdminSession()
  }, [])

  // ─── Fetch functions ───────────────────────────────────────────────────────

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, role, created_at")
        .order("created_at", { ascending: false })

      if (error) {
        throw new Error("حدث خطأ أثناء جلب المستخدمين")
      }

      setUsers((data as unknown as User[]) || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from("authorized_devices")
        .select(`
          id,
          user_id,
          device_id,
          is_approved,
          created_at,
          users:user_id (username)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        throw new Error("حدث خطأ أثناء جلب الأجهزة")
      }

      const formattedDevices =
        (data as unknown as Array<Record<string, unknown>>)?.map((device) => ({
          ...device,
          username: (device.users as Record<string, unknown> | null)?.username,
        })) || []

      setDevices(formattedDevices as unknown as Device[])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchUserCounts = async () => {
    try {
      const { data, error } = await supabase.from("user_report_counts").select("*").order("username", { ascending: true })
      if (error) throw error
      setUserCounts((data as unknown as UserCountSummary[]) || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchReportsForUser = async (userId: string) => {
    setLoadingUserReports(true)
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      if (error) throw error
      setSelectedUserReports((data as unknown as SelectedUserReport[]) || [])
    } catch (err) {
      console.error(err)
      setSelectedUserReports([])
    } finally {
      setLoadingUserReports(false)
    }
  }

  const fetchUsageStats = async () => {
    setLoadingUsage(true)
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [
        totalRes,
        todayRes,
        thisMonthRes,
        successRes,
        errorRes,
        logsRes,
      ] = await Promise.all([
        supabase.from("api_usage_logs").select("id", { count: "exact", head: true }),
        supabase.from("api_usage_logs").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
        supabase.from("api_usage_logs").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        supabase.from("api_usage_logs").select("id", { count: "exact", head: true }).eq("status", "success"),
        supabase.from("api_usage_logs").select("id", { count: "exact", head: true }).eq("status", "error"),
        supabase.from("api_usage_logs").select("*").order("created_at", { ascending: false }).limit(50),
      ])

      const thisMonth = thisMonthRes.count || 0
      const MONTHLY_QUOTA = 150
      const remaining = Math.max(0, MONTHLY_QUOTA - thisMonth)

      setUsageStats({
        total: totalRes.count || 0,
        today: todayRes.count || 0,
        thisMonth,
        successCount: successRes.count || 0,
        errorCount: errorRes.count || 0,
        remaining,
        monthlyQuota: MONTHLY_QUOTA,
        usagePercent: Math.round((thisMonth / MONTHLY_QUOTA) * 100),
        recentLogs: (logsRes.data as unknown as UsageLog[]) || [],
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingUsage(false)
    }
  }

  // ─── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (isCheckingAuth) return
    fetchUsers()
    fetchDevices()
    fetchUserCounts()
    fetchUsageStats()
  }, [isCheckingAuth])

  // ─── Handler functions ─────────────────────────────────────────────────────

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (newUser.password !== newUser.confirmPassword) {
        throw new Error("كلمة المرور وتأكيد كلمة المرور غير متطابقين")
      }

      const { data: existingUser, error: _checkError } = await supabase
        .from("users")
        .select("id")
        .eq("username", newUser.username)
        .single()

      if (existingUser) {
        throw new Error("اسم المستخدم موجود بالفعل")
      }

      const registerRes = await fetchWithCsrf("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          role: newUser.role,
        }),
      })

      const registerData = await registerRes.json()
      if (!registerRes.ok) {
        throw new Error(registerData.error || "حدث خطأ أثناء إضافة المستخدم")
      }

      setSuccess("تمت إضافة المستخدم بنجاح")
      setNewUser({
        username: "",
        password: "",
        confirmPassword: "",
        role: "user",
      })

      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const updateRes = await fetchWithCsrf("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          username: editForm.username,
          password: editForm.password,
          role: editForm.role,
        }),
      })

      const updateData = await updateRes.json()
      if (!updateRes.ok) {
        throw new Error(updateData.error || "حدث خطأ أثناء تحديث بيانات المستخدم")
      }

      setSuccess("تم تحديث بيانات المستخدم بنجاح")
      setIsEditDialogOpen(false)
      fetchUsers()
      fetchUserCounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleLogoutAllDevices = async (userId: string) => {
    if (!confirm("هل أنت متأكد من تسجيل خروج هذا المستخدم من جميع أجهزته؟")) return

    setActionLoading(userId)
    setSuccess(null)
    setError(null)

    try {
      const { error } = await supabase.from("authorized_devices").delete().eq("user_id", userId)

      if (error) throw error

      setSuccess("تم تسجيل خروج المستخدم من جميع الأجهزة بنجاح")
      fetchDevices()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActionLoading(null)
    }
  }

  const handleApproveDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase.from("authorized_devices").update({ is_approved: true }).eq("id", deviceId)

      if (error) {
        throw new Error("حدث خطأ أثناء الموافقة على الجهاز")
      }

      fetchDevices()
    } catch (err) {
      console.error(err)
    }
  }

  const handleRejectDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase.from("authorized_devices").delete().eq("id", deviceId)

      if (error) {
        throw new Error("حدث خطأ أثناء رفض الجهاز")
      }

      fetchDevices()
    } catch (err) {
      console.error(err)
    }
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setEditForm({
      username: user.username,
      password: "",
      role: user.role || "user",
    })
    setIsEditDialogOpen(true)
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // ─── Auth loading state ────────────────────────────────────────────────────

  if (isCheckingAuth) {
    return (
      <div className="container max-w-md mx-auto p-4 pb-20 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // ─── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      <PageHeader
        title="لوحة تحكم المسؤول"
        description="إدارة المستخدمين والأجهزة"
        icon={<Shield className="h-8 w-8" />}
      />

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">المستخدمين</TabsTrigger>
          <TabsTrigger value="devices">الأجهزة</TabsTrigger>
          <TabsTrigger value="usage">API</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="space-y-4">
          <UsersTab
            users={users}
            userCounts={userCounts}
            selectedUserId={selectedUserId}
            selectedUserReports={selectedUserReports}
            loadingUserReports={loadingUserReports}
            newUser={newUser}
            loading={loading}
            error={error}
            success={success}
            isEditDialogOpen={isEditDialogOpen}
            editForm={editForm}
            actionLoading={actionLoading}
            setNewUser={setNewUser}
            setEditForm={setEditForm}
            setIsEditDialogOpen={setIsEditDialogOpen}
            setSelectedUserId={setSelectedUserId}
            onAddUser={handleAddUser}
            onFetchReports={fetchReportsForUser}
            onOpenEditDialog={openEditDialog}
            onUpdateUser={handleUpdateUser}
            onLogoutAllDevices={handleLogoutAllDevices}
            formatDate={formatDate}
          />
        </TabsContent>
        <TabsContent value="devices" className="space-y-4">
          <DevicesTab
            devices={devices}
            onApprove={handleApproveDevice}
            onReject={handleRejectDevice}
            formatDate={formatDate}
          />
        </TabsContent>
        <TabsContent value="usage" className="space-y-4">
          <UsageTab
            usageStats={usageStats}
            loadingUsage={loadingUsage}
            onRefresh={fetchUsageStats}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
