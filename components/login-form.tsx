"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { Fingerprint, Lock, User, Loader2 } from "lucide-react"
import { motion } from "framer-motion"

export function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientSupabaseClient()

  // جميع المستخدمين ينتقلون إلى /home بعد تسجيل الدخول
  // صفحة /home تعرض الواجهة المناسبة حسب نوع الحساب
  const getRedirectPath = (_role: string | null): string => {
    return "/home"
  }

  useEffect(() => {
    // تحقق مما إذا كان المستخدم قد قام بتسجيل الدخول بالفعل
    const userId = localStorage.getItem("user_id")
    if (userId) {
      const userRole = localStorage.getItem("user_role")
      router.push(getRedirectPath(userRole))
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // في الواقع، سنحتاج إلى الحصول على معرف الجهاز (IMEI)
      // لكن في بيئة الويب، سنستخدم معرف فريد آخر
      const deviceId = generateDeviceId()

      // التحقق من بيانات المستخدم
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, username, full_name, password, role, is_suspended")
        .eq("username", username)
        .single()

      if (userError || !users) {
        throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة")
      }

      // التحقق من كلمة المرور (في التطبيق الحقيقي، يجب استخدام تشفير أفضل)
      if (users.password !== password) {
        throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة")
      }

      // التحقق من حالة التعليق
      if (users.is_suspended) {
        throw new Error("تم تعليق هذا الحساب. يرجى التواصل مع المشرف لتفعيل الحساب.")
      }

      // التحقق من الجهاز المصرح به
      const { data: devices, error: deviceError } = await supabase
        .from("authorized_devices")
        .select("*")
        .eq("user_id", users.id)
        .eq("device_id", deviceId)
        .single()

      if (deviceError && deviceError.code !== "PGRST116") {
        throw new Error("حدث خطأ أثناء التحقق من الجهاز")
      }

      if (!devices) {
        // إضافة طلب تصريح للجهاز الجديد
        const { error: insertError } = await supabase.from("authorized_devices").insert({
          user_id: users.id,
          device_id: deviceId,
          is_approved: false,
        })

        if (insertError) {
          throw new Error("حدث خطأ أثناء تسجيل الجهاز")
        }

        throw new Error("هذا الجهاز غير مصرح به. يرجى الانتظار حتى يتم الموافقة عليه من قبل المسؤول")
      }

      if (!devices.is_approved) {
        throw new Error("هذا الجهاز في انتظار الموافقة من قبل المسؤول")
      }

      // تخزين معلومات المستخدم في الجلسة
      localStorage.setItem("user_id", users.id)
      localStorage.setItem("username", users.username)
      localStorage.setItem("full_name", users.full_name || users.username)
      localStorage.setItem("device_id", deviceId)
      localStorage.setItem("user_role", users.role || "user")

      // الانتقال إلى الصفحة المناسبة حسب نوع الحساب
      router.push(getRedirectPath(users.role))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // توليد معرف فريد للجهاز (في التطبيق الحقيقي، سنستخدم IMEI)
  const generateDeviceId = () => {
    let deviceId = localStorage.getItem("device_id")
    if (!deviceId) {
      deviceId = `web_${Math.random().toString(36).substring(2, 15)}`
      localStorage.setItem("device_id", deviceId)
    }
    return deviceId
  }

  const handleBiometricLogin = async () => {
    // في التطبيق الحقيقي، سنستخدم واجهة برمجة التطبيقات للبصمة
    // لكن هنا سنتحقق فقط من وجود معلومات المستخدم في التخزين المحلي
    const userId = localStorage.getItem("user_id")
    const storedUsername = localStorage.getItem("username")
    const deviceId = localStorage.getItem("device_id")
    const userRole = localStorage.getItem("user_role")
    const biometricEnabled = localStorage.getItem("biometric_enabled")

    if (!userId || !storedUsername || !deviceId) {
      setError("لم يتم العثور على بيانات تسجيل الدخول السابقة")
      return
    }

    if (biometricEnabled !== "true") {
      setError("لم يتم تفعيل تسجيل الدخول بالبصمة. يرجى تفعيله من الإعدادات أولاً")
      return
    }

    setBiometricLoading(true)
    setError(null)

    try {
      // محاكاة تأخير للتحقق من البصمة
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // التحقق من الجهاز المصرح به
      const { data: devices, error: deviceError } = await supabase
        .from("authorized_devices")
        .select("*")
        .eq("user_id", userId)
        .eq("device_id", deviceId)
        .eq("is_approved", true)
        .single()

      if (deviceError || !devices) {
        throw new Error("هذا الجهاز غير مصرح به أو تم إلغاء التصريح")
      }

      // الانتقال إلى الصفحة المناسبة حسب نوع الحساب
      router.push(getRedirectPath(userRole))
    } catch (err: any) {
      setError(err.message)
      // مسح بيانات الجلسة في حالة الخطأ
      localStorage.removeItem("user_id")
      localStorage.removeItem("username")
      localStorage.removeItem("device_id")
      localStorage.removeItem("user_role")
    } finally {
      setBiometricLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="glass-card border-indigo-100 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center gradient-heading">تسجيل الدخول</CardTitle>
          <CardDescription className="text-center">أدخل بيانات الدخول الخاصة بك</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <AlertMessage type="error" title="خطأ في تسجيل الدخول" message={error} />}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-indigo-900">
                اسم المستخدم
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  required
                  className="pr-10 border-indigo-200 focus:border-indigo-400"
                />
                <User className="absolute top-2.5 right-3 h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-indigo-900">
                كلمة المرور
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  required
                  className="pr-10 border-indigo-200 focus:border-indigo-400"
                />
                <Lock className="absolute top-2.5 right-3 h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            onClick={handleBiometricLogin}
            disabled={biometricLoading}
          >
            {biometricLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري التحقق...
              </>
            ) : (
              <>
                <Fingerprint className="ml-2 h-5 w-5 text-indigo-500" />
                تسجيل الدخول باستخدام البصمة
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
