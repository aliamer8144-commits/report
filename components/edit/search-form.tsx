"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { SearchIcon, Hash, Loader2 } from "lucide-react"
import { motion } from "framer-motion"

interface SearchFormProps {
  serviceCode: string
  idNumber: string
  setServiceCode: (value: string) => void
  setIdNumber: (value: string) => void
  loading: boolean
  error: string | null
  onSubmit: (e: React.FormEvent) => void
  setError: (error: string | null) => void
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
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

export function SearchForm({
  serviceCode,
  idNumber,
  setServiceCode,
  setIdNumber,
  loading,
  error,
  onSubmit,
  setError,
}: SearchFormProps) {
  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <Card className="glass-card overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 to-amber-600"></div>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <SearchIcon className="ml-2 h-5 w-5 text-amber-600" />
            البحث عن تقرير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <AlertMessage type="error" title="خطأ في البحث" message={error} onClose={() => setError(null)} />
            )}

            <motion.div className="space-y-2" variants={itemVariants}>
              <Label htmlFor="serviceCode" className="text-amber-900 flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-amber-600" />
                رمز الخدمة
              </Label>
              <Input
                id="serviceCode"
                value={serviceCode}
                onChange={(e) => setServiceCode(e.target.value)}
                placeholder="أدخل رمز الخدمة"
                className="border-amber-200 focus:border-amber-400"
              />
            </motion.div>

            <motion.div className="space-y-2" variants={itemVariants}>
              <Label htmlFor="idNumber" className="text-amber-900 flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-amber-600" />
                رقم الهوية
              </Label>
              <Input
                id="idNumber"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="أدخل رقم الهوية"
                className="border-amber-200 focus:border-amber-400"
              />
            </motion.div>

            <motion.div className="text-sm text-muted-foreground mb-4" variants={itemVariants}>
              أدخل رمز الخدمة أو رقم الهوية أو كليهما للبحث عن التقرير
            </motion.div>

            <motion.div variants={itemVariants}>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري البحث...
                  </>
                ) : (
                  <>
                    <SearchIcon className="ml-2 h-4 w-4" />
                    بحث
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
