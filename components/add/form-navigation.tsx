"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, Loader2, Save } from "lucide-react"

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
    },
  },
}

interface FormNavigationProps {
  activeTab: string
  loading: boolean
  handlePrevTab: () => void
  handleNextTab: () => void
}

export function FormNavigation({ activeTab, loading, handlePrevTab, handleNextTab }: FormNavigationProps) {
  return (
    <motion.div className="flex gap-2" variants={itemVariants}>
      {activeTab !== "basic" && (
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          onClick={handlePrevTab}
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          السابق
        </Button>
      )}

      {activeTab !== "additional" ? (
        <Button
          type="button"
          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
          onClick={handleNextTab}
        >
          <ArrowLeft className="ml-2 h-4 w-4" />
          التالي
        </Button>
      ) : (
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save className="ml-2 h-4 w-4" />
              حفظ التقرير
            </>
          )}
        </Button>
      )}
    </motion.div>
  )
}
