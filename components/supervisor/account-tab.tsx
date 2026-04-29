"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"
import {
  UserCircle,
  User,
  Phone,
  Mail,
  Calendar,
  Shield,
  Users,
  FileBarChart,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Edit3,
  Save,
  X,
  AlertCircle,
  Clock,
  LogOut,
  Settings,
} from "lucide-react"

/* ============================================================
   الأنواع
   ============================================================ */

interface AccountData {
  id: string
  username: string
  full_name: string | null
  phone: string | null
  email: string | null
  role: string
  created_at: string
  supervisor_id: string | null
}

/* ============================================================
   المكون الرئيسي
   ============================================================ */

export function AccountTab() {
  const supabase = createClientSupabaseClient()
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : ""

  // بيانات الحساب
  const [account, setAccount] = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(true)

  // الإحصائيات
  const [stats, setStats] = useState({
    managedUsers: 0,
    totalReports: 0,
    suspendedUsers: 0,
  })

  // تعديل البيانات
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    email: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // تغيير كلمة المرور
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  /* ------ جلب بيانات الحساب ------ */
  const fetchAccount = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single()

      if (error) throw error
      setAccount(data as AccountData)
      setEditForm({
        full_name: data.full_name || "",
        phone: data.phone || "",
        email: data.email || "",
      })
    } catch (err) {
      console.error("Error fetching account:", err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  /* ------ جلب الإحصائيات ------ */
  const fetchStats = useCallback(async () => {
    if (!userId) return
    try {
      // عدد المستخدمين التابعين
      const { count: userCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("supervisor_id", userId)

      // عدد المعلّقين
      const { count: suspendedCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("supervisor_id", userId)
        .eq("is_suspended", true)

      // عدد التقارير الإجمالي للمستخدمين التابعين
      const { data: managedUserIds } = await supabase
        .from("users")
        .select("id")
        .eq("supervisor_id", userId)

      if (managedUserIds && managedUserIds.length > 0) {
        const ids = managedUserIds.map((u) => u.id)
        const { count: reportCount } = await supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .in("user_id", ids)
          .eq("is_deleted", false)

        setStats({
          managedUsers: userCount || 0,
          totalReports: reportCount || 0,
          suspendedUsers: suspendedCount || 0,
        })
      } else {
        setStats({
          managedUsers: userCount || 0,
          totalReports: 0,
          suspendedUsers: suspendedCount || 0,
        })
      }
    } catch (err) {
      console.error("Error fetching stats:", err)
    }
  }, [userId])

  useEffect(() => {
    fetchAccount()
    fetchStats()
  }, [fetchAccount, fetchStats])

  /* ------ حفظ البيانات ------ */
  const handleSaveProfile = async () => {
    if (!userId) return
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: editForm.full_name || null,
          phone: editForm.phone || null,
          email: editForm.email || null,
        })
        .eq("id", userId)

      if (error) throw error

      setSaveMessage({ type: "success", text: "تم تحديث البيانات بنجاح" })
      setIsEditing(false)
      fetchAccount()
      // تحديث اسم العرض في الشريط العلوي
      if (editForm.full_name) {
        localStorage.setItem("username", editForm.full_name)
        window.dispatchEvent(new CustomEvent("profile-name-update", { detail: { name: editForm.full_name } }))
      }

      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err: any) {
      setSaveMessage({ type: "error", text: "حدث خطأ أثناء تحديث البيانات" })
    } finally {
      setIsSaving(false)
    }
  }

  /* ------ تغيير كلمة المرور ------ */
  const handleChangePassword = async () => {
    if (!userId) return

    // التحقق من المدخلات
    if (!passwordForm.currentPassword) {
      setPasswordMessage({ type: "error", text: "يرجى إدخال كلمة المرور الحالية" })
      return
    }
    if (!passwordForm.newPassword) {
      setPasswordMessage({ type: "error", text: "يرجى إدخال كلمة المرور الجديدة" })
      return
    }
    if (passwordForm.newPassword.length < 4) {
      setPasswordMessage({ type: "error", text: "كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل" })
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "كلمة المرور الجديدة غير متطابقة" })
      return
    }

    setIsChangingPassword(true)
    setPasswordMessage(null)

    try {
      // التحقق من كلمة المرور الحالية
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("password")
        .eq("id", userId)
        .single()

      if (fetchError) throw fetchError

      if (userData.password !== passwordForm.currentPassword) {
        setPasswordMessage({ type: "error", text: "كلمة المرور الحالية غير صحيحة" })
        return
      }

      // تحديث كلمة المرور
      const { error: updateError } = await supabase
        .from("users")
        .update({ password: passwordForm.newPassword })
        .eq("id", userId)

      if (updateError) throw updateError

      setPasswordMessage({ type: "success", text: "تم تغيير كلمة المرور بنجاح" })
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })

      setTimeout(() => {
        setPasswordMessage(null)
        setShowPasswordDialog(false)
      }, 2000)
    } catch (err: any) {
      setPasswordMessage({ type: "error", text: "حدث خطأ أثناء تغيير كلمة المرور" })
    } finally {
      setIsChangingPassword(false)
    }
  }

  /* ------ مساعدات ------ */
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "أدمن"
      case "supervisor": return "مشرف"
      case "user": return "مستخدم"
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-[#FF3B30]/10 text-[#FF3B30] border-0"
      case "supervisor": return "bg-[#007AFF]/10 text-[#007AFF] border-0"
      case "user": return "bg-gray-100 text-gray-700 border-gray-200"
      default: return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  /* ============================================================
     واجهة التحميل
     ============================================================ */
  if (loading || !account) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#007AFF] mx-auto mb-3" />
          <p className="text-sm text-gray-500">جاري تحميل بيانات الحساب...</p>
        </div>
      </div>
    )
  }

  /* ============================================================
     الواجهة الرئيسية
     ============================================================ */
  return (
    <div dir="rtl">
      {/* بطاقة الملف الشخصي */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-white rounded-2xl shadow-sm">
          <div className="h-2 bg-[#007AFF]" />
          <CardContent className="p-5">
            <div className="flex items-center gap-4 mb-5">
              {/* صورة رمزية كبيرة */}
              <div className="w-16 h-16 rounded-2xl bg-[#007AFF] flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {(account.full_name || account.username || "م").charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800">
                  {account.full_name || account.username}
                </h2>
                <p className="text-sm text-gray-500">@{account.username}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className={`${getRoleColor(account.role)} text-[11px] px-2 py-0.5`}>
                    <Shield className="h-3 w-3 ml-1" />
                    {getRoleLabel(account.role)}
                  </Badge>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    انضم {formatDate(account.created_at)}
                  </span>
                </div>
              </div>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[#007AFF] hover:bg-[#007AFF]/5"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* بيانات الحساب */}
            {isEditing ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-sm text-gray-600 flex items-center gap-1.5 justify-end">
                    <User className="h-3.5 w-3.5" />
                    الاسم الكامل
                  </Label>
                  <Input
                    id="full_name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    placeholder="أدخل الاسم الكامل"
                    className="bg-[#f2f2f7] border-0 h-9 focus:ring-2 focus:ring-[#007AFF]/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm text-gray-600 flex items-center gap-1.5 justify-end">
                    <Phone className="h-3.5 w-3.5" />
                    رقم الهاتف
                  </Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="أدخل رقم الهاتف"
                    className="bg-[#f2f2f7] border-0 h-9 focus:ring-2 focus:ring-[#007AFF]/30"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm text-gray-600 flex items-center gap-1.5 justify-end">
                    <Mail className="h-3.5 w-3.5" />
                    البريد الإلكتروني
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="أدخل البريد الإلكتروني"
                    className="bg-[#f2f2f7] border-0 h-9 focus:ring-2 focus:ring-[#007AFF]/30"
                    dir="ltr"
                  />
                </div>

                {/* رسالة النجاح/الخطأ */}
                <AnimatePresence>
                  {saveMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className={`flex items-center gap-2 rounded-lg p-2.5 text-sm ${
                        saveMessage.type === "success"
                          ? "bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20"
                          : "bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20"
                      }`}
                    >
                      {saveMessage.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      )}
                      {saveMessage.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex-1 bg-[#007AFF] text-white hover:opacity-95 font-semibold h-9 text-sm"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 ml-1" />
                        حفظ
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setEditForm({
                        full_name: account.full_name || "",
                        phone: account.phone || "",
                        email: account.email || "",
                      })
                      setSaveMessage(null)
                    }}
                    disabled={isSaving}
                    className="border-gray-200 text-gray-600 hover:bg-gray-100 h-9 text-sm"
                  >
                    <X className="h-4 w-4 ml-1" />
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#f2f2f7] border-0">
                  <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-[#007AFF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-400">الاسم الكامل</p>
                    <p className="text-sm text-gray-700 truncate">
                      {account.full_name || "لم يتم التحديد"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#f2f2f7] border-0">
                  <div className="w-8 h-8 rounded-lg bg-[#34C759]/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 text-[#34C759]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-400">رقم الهاتف</p>
                    <p className="text-sm text-gray-700 truncate" dir="ltr">
                      {account.phone || "لم يتم التحديد"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#f2f2f7] border-0">
                  <div className="w-8 h-8 rounded-lg bg-[#FF9500]/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-[#FF9500]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-400">البريد الإلكتروني</p>
                    <p className="text-sm text-gray-700 truncate" dir="ltr">
                      {account.email || "لم يتم التحديد"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* بطاقة الإحصائيات */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="bg-white rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="text-gray-800 flex items-center gap-2">
                <FileBarChart className="h-4 w-4 text-[#007AFF]" />
                إحصائيات الحساب
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center p-3 bg-[#f2f2f7] rounded-xl border-0">
                <Users className="h-5 w-5 text-[#007AFF] mb-1" />
                <span className="text-xl font-bold text-[#007AFF]">{stats.managedUsers}</span>
                <span className="text-[10px] text-[#007AFF] leading-tight">العملاء</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-[#f2f2f7] rounded-xl border-0">
                <FileBarChart className="h-5 w-5 text-[#007AFF] mb-1" />
                <span className="text-xl font-bold text-[#007AFF]">{stats.totalReports}</span>
                <span className="text-[10px] text-[#007AFF] leading-tight">تقارير</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-[#f2f2f7] rounded-xl border-0">
                <AlertCircle className="h-5 w-5 text-[#FF3B30] mb-1" />
                <span className="text-xl font-bold text-[#FF3B30]">{stats.suspendedUsers}</span>
                <span className="text-[10px] text-[#FF3B30] leading-tight">معلّقين</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* تغيير كلمة المرور */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="bg-white rounded-2xl shadow-sm">
          <CardContent className="p-4">
            {!showPasswordDialog ? (
              <Button
                variant="outline"
                className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-800 flex items-center justify-between h-12"
                onClick={() => setShowPasswordDialog(true)}
              >
                <span className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">تغيير كلمة المرور</span>
                </span>
                <Settings className="h-4 w-4 text-gray-400" />
              </Button>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Key className="h-4 w-4 text-[#007AFF]" />
                  تغيير كلمة المرور
                </h3>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">كلمة المرور الحالية</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="أدخل كلمة المرور الحالية"
                      className="bg-[#f2f2f7] border-0 h-9 pr-10 focus:ring-2 focus:ring-[#007AFF]/30"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="أدخل كلمة المرور الجديدة"
                      className="bg-[#f2f2f7] border-0 h-9 pr-10 focus:ring-2 focus:ring-[#007AFF]/30"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">تأكيد كلمة المرور الجديدة</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    className="bg-[#f2f2f7] border-0 h-9 focus:ring-2 focus:ring-[#007AFF]/30"
                    dir="ltr"
                  />
                </div>

                {/* رسالة النجاح/الخطأ */}
                <AnimatePresence>
                  {passwordMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className={`flex items-center gap-2 rounded-lg p-2.5 text-sm ${
                        passwordMessage.type === "success"
                          ? "bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20"
                          : "bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20"
                      }`}
                    >
                      {passwordMessage.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      )}
                      {passwordMessage.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="flex-1 bg-[#007AFF] text-white hover:opacity-95 font-semibold h-9 text-sm"
                  >
                    {isChangingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Key className="h-4 w-4 ml-1" />
                        تحديث
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPasswordDialog(false)
                      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
                      setPasswordMessage(null)
                    }}
                    disabled={isChangingPassword}
                    className="border-gray-200 text-gray-600 hover:bg-gray-100 h-9 text-sm"
                  >
                    <X className="h-4 w-4 ml-1" />
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* معلومات عامة */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="bg-white rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              معلومات عامة
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#f2f2f7] border-0">
                <span className="text-sm text-gray-600 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  تاريخ إنشاء الحساب
                </span>
                <span className="text-sm font-medium text-gray-800">
                  {formatDate(account.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#f2f2f7] border-0">
                <span className="text-sm text-gray-600 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  الدور
                </span>
                <Badge className={`${getRoleColor(account.role)} text-[11px]`}>
                  {getRoleLabel(account.role)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
