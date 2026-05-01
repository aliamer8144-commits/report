"use client"

import { Hash, User, Calendar } from "lucide-react"
import { TabsContent } from "@/components/ui/tabs"
import { FormField } from "@/components/edit/form-field"
import type { EditFormState } from "@/components/edit/types"

interface BasicInfoTabProps {
  formData: EditFormState
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function BasicInfoTab({ formData, handleChange }: BasicInfoTabProps) {
  return (
    <TabsContent value="basic" className="space-y-4">
      <FormField
        label="رمز الخدمة"
        name="serviceCode"
        value={formData.serviceCode}
        onChange={handleChange}
        placeholder="رمز الخدمة"
        required
        readOnly
        icon={Hash}
        inputClassName="font-mono tracking-wider"
        hint="(لا يمكن تعديل رمز الخدمة)"
      />

      <FormField
        label="رقم الهوية"
        name="idNumber"
        value={formData.idNumber}
        onChange={handleChange}
        placeholder="أدخل رقم الهوية"
        required
        icon={Hash}
      />

      <FormField
        label="الاسم (عربي)"
        name="nameAr"
        value={formData.nameAr}
        onChange={handleChange}
        placeholder="أدخل الاسم باللغة العربية"
        required
        icon={User}
      />

      <FormField
        label="الاسم (إنجليزي)"
        name="nameEn"
        value={formData.nameEn}
        onChange={handleChange}
        placeholder="أدخل الاسم باللغة الإنجليزية"
        required
        icon={User}
        inputClassName="uppercase"
      />

      <FormField
        label="عدد الأيام"
        name="daysCount"
        type="number"
        value={formData.daysCount}
        onChange={handleChange}
        placeholder="أدخل عدد الأيام"
        required
        icon={Calendar}
      />
    </TabsContent>
  )
}
