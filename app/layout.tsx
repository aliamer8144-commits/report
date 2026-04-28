import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Tajawal } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700", "800", "900"],
  display: "swap",
  variable: "--font-tajawal",
})

export const metadata: Metadata = {
  title: "نظام إدارة التقارير",
  description: "تطبيق ويب للهاتف لإدارة التقارير الطبية",
    generator: 'Amjad Alsabry'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="min-h-screen bg-gradient-to-b from-indigo-50 to-white font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <main className="flex min-h-screen flex-col">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
