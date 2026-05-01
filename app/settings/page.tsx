"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { PageHeader } from "@/components/ui-custom/page-header"
import { BackButton } from "@/components/ui-custom/back-button"
import { Settings, Fingerprint, Shield, Loader2, CheckCircle, XCircle } from "lucide-react"
import { motion } from "framer-motion"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

/**
 * Check if the browser supports WebAuthn (PublicKeyCredential)
 */
function isWebAuthnSupported(): boolean {
  if (typeof window === "undefined") return false
  return !!window.PublicKeyCredential
}

export default function SettingsPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // WebAuthn state
  const [webAuthnSupported, setWebAuthnSupported] = useState(false)
  const [fingerprintRegistered, setFingerprintRegistered] = useState(false)
  const [fingerprintLoading, setFingerprintLoading] = useState(false)

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

      // Check WebAuthn support
      setWebAuthnSupported(isWebAuthnSupported())

      // جلب نوع الحساب واسم المستخدم
      setUserRole(localStorage.getItem("user_role"))
      setUsername(localStorage.getItem("username"))

      // Check if user has a registered fingerprint
      await checkFingerprintStatus()
    }
    checkSession()
  }, [router])

  const checkFingerprintStatus = async () => {
    try {
      const res = await fetch("/api/auth/webauthn/status")
      if (res.ok) {
        const data = await res.json()
        setFingerprintRegistered(data.registered === true)
      }
    } catch {
      // Ignore errors during initial check — default to not registered
      setFingerprintRegistered(false)
    }
  }

  const handleRegisterFingerprint = async () => {
    if (!webAuthnSupported) {
      setError("المتصفح لا يدعم تسجيل الدخول بالبصمة")
      return
    }

    setFingerprintLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { startRegistration } = await import("@simplewebauthn/browser")

      // Step 1: Get registration options from server
      const optionsRes = await fetchWithCsrf("/api/auth/webauthn/register/options", {
        method: "POST",
      })

      const optionsData = await optionsRes.json()

      if (!optionsRes.ok) {
        throw new Error(optionsData.error || "حدث خطأ أثناء تجهيز تسجيل البصمة")
      }

      // Step 2: Use browser WebAuthn API to create credential
      const registrationResponse = await startRegistration({
        optionsJSON: optionsData.options,
      })

      // Step 3: Verify and store the credential
      const verifyRes = await fetchWithCsrf("/api/auth/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: optionsData.challengeId,
          response: registrationResponse,
          transports: registrationResponse.response?.transports,
        }),
      })

      const verifyData = await verifyRes.json()

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "فشل التحقق من البصمة")
      }

      setFingerprintRegistered(true)
      setSuccess("تم تسجيل البصمة بنجاح! يمكنك الآن استخدامها لتسجيل الدخول")
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("تم إلغاء تسجيل البصمة")
      } else {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء تسجيل البصمة")
      }
    } finally {
      setFingerprintLoading(false)
    }
  }

  const handleUnregisterFingerprint = async () => {
    setFingerprintLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetchWithCsrf("/api/auth/webauthn/register/unregister", {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "حدث خطأ أثناء حذف البصمة")
      }

      setFingerprintRegistered(false)
      setSuccess("تم حذف البصمة بنجاح")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء حذف البصمة")
    } finally {
      setFingerprintLoading(false)
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

      {/* WebAuthn Fingerprint Registration Card */}
      {webAuthnSupported && (
        <motion.div variants={itemVariants}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Fingerprint className="ml-2 h-5 w-5 text-indigo-600" />
                تسجيل الدخول بالبصمة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="font-medium">تسجيل بصمة الإصبع</p>
                <p className="text-sm text-muted-foreground">
                  {fingerprintRegistered
                    ? "بصمتك مسجلة. يمكنك استخدامها لتسجيل الدخول بسرعة من صفحة الدخول."
                    : "سجّل بصمة إصبعك لتتمكن من تسجيل الدخول بسرعة دون إدخال كلمة المرور."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {fingerprintRegistered ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      البصمة مسجلة
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={handleUnregisterFingerprint}
                      disabled={fingerprintLoading}
                    >
                      {fingerprintLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="ml-1 h-4 w-4" />
                      )}
                      حذف البصمة
                    </Button>
                  </>
                ) : (
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={handleRegisterFingerprint}
                    disabled={fingerprintLoading}
                  >
                    {fingerprintLoading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري تسجيل البصمة...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="ml-2 h-4 w-4" />
                        تسجيل البصمة
                      </>
                    )}
                  </Button>
                )}
              </div>

              {!webAuthnSupported && (
                <p className="text-xs text-muted-foreground">
                  المتصفح الحالي لا يدعم المصادقة البيومترية
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Legacy Biometric Toggle (only shown if WebAuthn is NOT supported) */}
      {!webAuthnSupported && (
        <motion.div variants={itemVariants}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Fingerprint className="ml-2 h-5 w-5 text-indigo-600" />
                تسجيل الدخول بالبصمة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  هذا المتصفح لا يدعم المصادقة البيومترية (WebAuthn). استخدم متصفحاً حديثاً يدعم هذه الميزة.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Account Type Card */}
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
