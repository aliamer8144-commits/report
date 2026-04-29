import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Cairo } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-cairo",
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
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-screen bg-[#f2f2f7] font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <main className="flex min-h-screen flex-col">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
