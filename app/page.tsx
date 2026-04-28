import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">نظام إدارة التقارير</h1>
          <p className="mt-2 text-muted-foreground">قم بتسجيل الدخول للوصول إلى النظام</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
