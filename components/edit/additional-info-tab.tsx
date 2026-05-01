"use client"

import { Calendar, Clock, Flag, Building, UserCheck } from "lucide-react"
import { TabsContent } from "@/components/ui/tabs"
import { FormField } from "@/components/edit/form-field"
import type { EditFormState } from "@/components/edit/types"

interface AdditionalInfoTabProps {
  formData: EditFormState
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function AdditionalInfoTab({ formData, handleChange }: AdditionalInfoTabProps) {
  return (
    <TabsContent value="additional" className="space-y-4">
      <FormField
        label="الجنسية (عربي)"
        name="nationalityAr"
        value={formData.nationalityAr}
        onChange={handleChange}
        placeholder="أدخل الجنسية باللغة العربية"
        required
        icon={Flag}
      />

      <FormField
        label="الجنسية (إنجليزي)"
        name="nationalityEn"
        value={formData.nationalityEn}
        onChange={handleChange}
        placeholder="أدخل الجنسية باللغة الإنجليزية"
        required
        icon={Flag}
      />

      <FormField
        label="اسم الطبيب (عربي)"
        name="doctorNameAr"
        value={formData.doctorNameAr}
        onChange={handleChange}
        placeholder="أدخل اسم الطبيب باللغة العربية"
        required
        icon={UserCheck}
      />

      <FormField
        label="اسم الطبيب (إنجليزي)"
        name="doctorNameEn"
        value={formData.doctorNameEn}
        onChange={handleChange}
        placeholder="أدخل اسم الطبيب باللغة الإنجليزية"
        required
        icon={UserCheck}
        inputClassName="uppercase"
      />

      <FormField
        label="المسمى الوظيفي (عربي)"
        name="jobTitleAr"
        value={formData.jobTitleAr}
        onChange={handleChange}
        placeholder="أدخل المسمى الوظيفي باللغة العربية"
        required
        icon={UserCheck}
      />

      <FormField
        label="المسمى الوظيفي (إنجليزي)"
        name="jobTitleEn"
        value={formData.jobTitleEn}
        onChange={handleChange}
        placeholder="أدخل المسمى الوظيفي باللغة الإنجليزية"
        required
        icon={UserCheck}
      />

      <FormField
        label="اسم المستشفى (عربي)"
        name="hospitalNameAr"
        value={formData.hospitalNameAr}
        onChange={handleChange}
        placeholder="أدخل اسم المستشفى باللغة العربية"
        required
        icon={Building}
      />

      <FormField
        label="اسم المستشفى (إنجليزي)"
        name="hospitalNameEn"
        value={formData.hospitalNameEn}
        onChange={handleChange}
        placeholder="أدخل اسم المستشفى باللغة الإنجليزية"
        required
        icon={Building}
      />

      <FormField
        label="تاريخ الطباعة"
        name="printDate"
        value={formData.printDate}
        onChange={handleChange}
        placeholder="مثال: Tuesday, 22 April 2025"
        required
        icon={Calendar}
      />

      <FormField
        label="وقت الطباعة"
        name="printTime"
        value={formData.printTime}
        onChange={handleChange}
        placeholder="مثال: 12:32 PM"
        required
        icon={Clock}
      />
    </TabsContent>
  )
}
