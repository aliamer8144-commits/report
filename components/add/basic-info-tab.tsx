"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TabsContent } from "@/components/ui/tabs"
import { Hash, User, Calendar, RefreshCw } from "lucide-react"
import { FormField } from "@/components/report/form-field"
import type { ReportFormFields } from "@/components/report/form-field"

interface BasicInfoTabProps {
  formData: ReportFormFields
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isGeneratingCode: boolean
  loadServiceCode: () => void
}

export function BasicInfoTab({ formData, handleChange, isGeneratingCode, loadServiceCode }: BasicInfoTabProps) {
  return (
    <TabsContent value="basic" className="space-y-4">
      <div className="space-y-2 text-right">
        <Label htmlFor="service_code" className="text-indigo-900 flex items-center gap-1.5 justify-end flex-row-reverse w-full">
          <Hash className="h-4 w-4 text-indigo-600" />
          رمز الخدمة
          <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2 items-center">
          <Input
            id="service_code"
            name="service_code"
            value={formData.service_code}
            readOnly
            required
            className={`flex-1 text-right border-indigo-200 bg-gray-50 font-mono tracking-wider ${isGeneratingCode ? 'animate-pulse' : ''}`}
            dir="ltr"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 flex-shrink-0"
            onClick={loadServiceCode}
            disabled={isGeneratingCode}
            title="توليد رمز جديد"
          >
            <RefreshCw className={`h-4 w-4 ${isGeneratingCode ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-right">يتم توليد رمز الخدمة تلقائياً</p>
      </div>

      <FormField
        label="رقم الهوية"
        name="id_number"
        value={formData.id_number}
        onChange={handleChange}
        placeholder="أدخل رقم الهوية"
        required
        icon={Hash}
      />

      <FormField
        label="الاسم (عربي)"
        name="name_ar"
        value={formData.name_ar}
        onChange={handleChange}
        placeholder="أدخل الاسم باللغة العربية"
        required
        icon={User}
      />

      <FormField
        label="الاسم (إنجليزي)"
        name="name_en"
        value={formData.name_en}
        onChange={handleChange}
        placeholder="أدخل الاسم باللغة الإنجليزية"
        required
        icon={User}
        inputClassName="uppercase"
      />

      <FormField
        label="عدد الأيام"
        name="days_count"
        type="number"
        value={formData.days_count}
        onChange={handleChange}
        placeholder="أدخل عدد الأيام"
        required
        icon={Calendar}
      />
    </TabsContent>
  )
}
