"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldOff, AlertTriangle } from "lucide-react"

interface SuspensionBannerProps {
  reason: string | null
}

export function SuspensionBanner({ reason }: SuspensionBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      <Card className="border-red-200 bg-gradient-to-b from-red-50 to-white overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-red-500 to-red-600"></div>
        <CardContent className="p-6 text-center space-y-4">
          <div className="bg-red-100 p-4 rounded-full inline-flex">
            <ShieldOff className="h-10 w-10 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-700 mb-2">
              حسابك معلق
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {reason || "لا يمكنك إنشاء تقارير جديدة حالياً. يرجى التواصل مع المشرف لتفعيل حسابك."}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <p className="text-xs">لتفعيل حسابك، يرجى التواصل مع المشرف المسؤول عنك.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
