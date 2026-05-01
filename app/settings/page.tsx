"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { PageHeader } from "@/components/ui-custom/page-header"
import { BackButton } from "@/components/ui-custom/back-button"
import { Settings, Fingerprint, Shield } from "lucide-react"
import { motion } from "framer-motion"

export default function SettingsPage() {
  const router = useRouter()
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        if (!res.ok) {
          router.push("/")
          return
        }
      } catch (_err) {
        router.push("/")
        return
      }

    // التحقق من حالة تفعيل البصمة
    const biometricStatus = localStorage.getItem("biometric_enabled")
    setBiometricEnabled(biometricStatus === "true")

    // جلب نوع الحساب واسم المستخدم
    setUserRole(localStorage.getItem("user_role"))
    setUsername(localStorage.getItem("username"))
    }
    checkSession()
  }, [router])

  const handleBiometricToggle = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const newStatus = !biometricEnabled

      // في التطبيق الحقيقي، سنقوم بالتحقق من دعم البصمة وتسجيلها
      // هنا نقوم فقط بتخزين الحالة في التخزين المحلي
      localStorage.setItem("biometric_enabled", newStatus.toString())

      setBiometricEnabled(newStatus)
      setSuccess(newStatus ? "تم تفعيل تسجيل الدخول بالبصمة بنجاح" : "تم إلغاء تفعيل تسجيل الدخول بالبصمة")
    } catch (err: any) {
      setError("حدث خطأ أثناء تغيير إعدادات البصمة")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  }

  return (
    <motion.div className="page-container" initial="hidden" animate="visible" variants={containerVariants}>
      <BackButton />
      <PageHeader
        title="الإعدادات"
        description="تخصيص إعدادات التطبيق"
        icon={<Settings className="h-8 w-8 text-indigo-600" />}
      />

      {error && <AlertMessage type="error" title="خطأ" message={error} />}
      {success && <AlertMessage type="success" title="تم بنجاح" message={success} />}

      <motion.div variants={itemVariants}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Fingerprint className="ml-2 h-5 w-5 text-indigo-600" />
              تسجيل الدخول بالبصمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p>تفعيل تسجيل الدخول باستخدام البصمة</p>
                <p className="text-sm text-muted-foreground">
                  يمكنك تسجيل الدخول باستخدام بصمة الإصبع بدلاً من إدخال اسم المستخدم وكلمة المرور
                </p>
              </div>
              <Switch
                checked={biometricEnabled}
                onCheckedChange={handleBiometricToggle}
                disabled={loading}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Shield className="ml-2 h-5 w-5 text-indigo-600" />
              نوع الحساب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">اسم المستخدم</p>
                <p className="font-semibold">{username || "—"}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">نوع الحساب</p>
                <div>
                  {userRole === "admin" && (
                    <span className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-lg font-medium">مسؤول النظام (Admin)</span>
                  )}
                  {userRole === "supervisor" && (
                    <span className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded-lg font-medium">مشرف (Supervisor)</span>
                  )}
                  {userRole === "user" && (
                    <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-medium">مستخدم عادي (User)</span>
                  )}
                  {!userRole && (
                    <span className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-lg font-medium">مستخدم عادي (User)</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
