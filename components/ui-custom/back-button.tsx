"use client"

import { Home, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function BackButton() {
  const router = useRouter()

  return (
    <div className="absolute top-4 right-4 flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => router.push("/home")}
        className="bg-white text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 border-indigo-200 rounded-full shadow-sm"
        aria-label="العودة إلى الصفحة الرئيسية"
      >
        <Home className="h-5 w-5" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={() => router.back()}
        className="bg-white text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 border-indigo-200 rounded-full shadow-sm"
        aria-label="العودة للخلف"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}
