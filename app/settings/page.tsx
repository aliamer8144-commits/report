"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { PageHeader } from "@/components/ui-custom/page-header"
import { BackButton } from "@/components/ui-custom/back-button"
import { Settings, Fingerprint, Info, User, Github, Code, Shield } from "lucide-react"
import { motion } from "framer-motion"

export default function SettingsPage() {
  const router = useRouter()
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    // التحقق من تسجيل الدخول
    const userId = localStorage.getItem("user_id")
    if (!userId) {
      router.push("/")
      return
    }

    // التحقق من حالة تفعيل البصمة
    const biometricStatus = localStorage.getItem("biometric_enabled")
    setBiometricEnabled(biometricStatus === "true")

    // جلب نوع الحساب واسم المستخدم
    setUserRole(localStorage.getItem("user_role"))
    setUsername(localStorage.getItem("username"))
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

      <motion.div variants={itemVariants}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Info className="ml-2 h-5 w-5 text-indigo-600" />
              معلومات التطبيق
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="font-medium">إصدار التطبيق</p>
              <p className="text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded-lg inline-block">1.0.0</p>
            </div>

            <div className="space-y-1">
              <p className="font-medium">المطور</p>
              <div className="flex items-center space-x-2 space-x-reverse">
                <User className="h-5 w-5 text-indigo-600" />
                <p className="text-sm">امجد الصبري</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-medium">التقنيات المستخدمة</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-lg">Next.js</span>
                <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-lg">Supabase</span>
                <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded-lg">Tailwind CSS</span>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-lg">TypeScript</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm" className="text-indigo-600">
              <Github className="ml-2 h-4 w-4" />
              GitHub
            </Button>
            <Button variant="outline" size="sm" className="text-indigo-600">
              <Code className="ml-2 h-4 w-4" />
              API
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  )
}
