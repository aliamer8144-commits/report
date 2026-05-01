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

  const getRedirectPath = (_role: string | null): string => {
    return "/home"
  }

  useEffect(() => {
    // التحقق من الجلسة عبر API بدل localStorage
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        if (res.ok) {
          const data = await res.json()
          router.push(getRedirectPath(data.user.role))
        }
      } catch {
        // لا توجد جلسة صالحة - إبقاء المستخدم في صفحة الدخول
      }
    }
    checkSession()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const deviceId = generateDeviceId()

      // استدعاء API تسجيل الدخول (التحقق + JWT cookie يتم على السيرفر)
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const loginData = await loginRes.json()

      if (!loginRes.ok) {
        throw new Error(loginData.error || "حدث خطأ أثناء تسجيل الدخول")
      }

      const user = loginData.user

      // التحقق من الجهاز المصرح به
      const { data: devices, error: deviceError } = await supabase
        .from("authorized_devices")
        .select("*")
        .eq("user_id", user.id)
        .eq("device_id", deviceId)
        .single()

      if (deviceError && deviceError.code !== "PGRST116") {
        throw new Error("حدث خطأ أثناء التحقق من الجهاز")
      }

      if (!devices) {
        const { error: insertError } = await supabase.from("authorized_devices").insert({
          user_id: user.id,
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

      // تخزين بيانات العرض فقط في localStorage (الجلسة الحقيقية في cookie)
      localStorage.setItem("username", user.username)
      localStorage.setItem("full_name", user.full_name || user.username)
      localStorage.setItem("device_id", deviceId)
      localStorage.setItem("user_role", user.role || "user")

      // الانتقال إلى الصفحة المناسبة
      router.push(getRedirectPath(user.role))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateDeviceId = () => {
    let deviceId = localStorage.getItem("device_id")
    if (!deviceId) {
      deviceId = `web_${Math.random().toString(36).substring(2, 15)}`
      localStorage.setItem("device_id", deviceId)
    }
    return deviceId
  }

  const handleBiometricLogin = async () => {
    const storedUsername = localStorage.getItem("username")
    const deviceId = localStorage.getItem("device_id")
    const userRole = localStorage.getItem("user_role")
    const biometricEnabled = localStorage.getItem("biometric_enabled")

    if (!storedUsername || !deviceId) {
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
      // التحقق من وجود جلسة صالحة
      const sessionRes = await fetch("/api/auth/session")
      if (!sessionRes.ok) {
        throw new Error("انتهت صلاحية الجلسة. يرجى تسجيل الدخول بكلمة المرور.")
      }

      const sessionData = await sessionRes.json()
      const userId = sessionData.user.id

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

      router.push(getRedirectPath(userRole))
    } catch (err: any) {
      setError(err.message)
      // مسح بيانات العرض في حالة الخطأ
      localStorage.removeItem("username")
      localStorage.removeItem("full_name")
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
