"use client"

import type React from "react"

import { TabsContent } from "@/components/ui/tabs"
import { Flag, UserCheck, Building, Calendar, Clock } from "lucide-react"
import { FormField } from "@/components/report/form-field"
import type { ReportFormFields } from "@/components/report/form-field"

interface AdditionalInfoTabProps {
  formData: ReportFormFields
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function AdditionalInfoTab({ formData, handleChange }: AdditionalInfoTabProps) {
  return (
    <TabsContent value="additional" className="space-y-4">
      <FormField
        label="الجنسية (عربي)"
        name="nationality_ar"
        value={formData.nationality_ar}
        onChange={handleChange}
        placeholder="أدخل الجنسية باللغة العربية"
        required
        icon={Flag}
      />

      <FormField
        label="الجنسية (إنجليزي)"
        name="nationality_en"
        value={formData.nationality_en}
        onChange={handleChange}
        placeholder="أدخل الجنسية باللغة الإنجليزية"
        required
        icon={Flag}
      />

      <FormField
        label="اسم الطبيب (عربي)"
        name="doctor_name_ar"
        value={formData.doctor_name_ar}
        onChange={handleChange}
        placeholder="أدخل اسم الطبيب باللغة العربية"
        required
        icon={UserCheck}
      />

      <FormField
        label="اسم الطبيب (إنجليزي)"
        name="doctor_name_en"
        value={formData.doctor_name_en}
        onChange={handleChange}
        placeholder="أدخل اسم الطبيب باللغة الإنجليزية"
        required
        icon={UserCheck}
        inputClassName="uppercase"
      />

      <FormField
        label="المسمى الوظيفي (عربي)"
        name="job_title_ar"
        value={formData.job_title_ar}
        onChange={handleChange}
        placeholder="أدخل المسمى الوظيفي باللغة العربية"
        required
        icon={UserCheck}
      />

      <FormField
        label="المسمى الوظيفي (إنجليزي)"
        name="job_title_en"
        value={formData.job_title_en}
        onChange={handleChange}
        placeholder="أدخل المسمى الوظيفي باللغة الإنجليزية"
        required
        icon={UserCheck}
      />

      <FormField
        label="اسم المستشفى (عربي)"
        name="hospital_name_ar"
        value={formData.hospital_name_ar}
        onChange={handleChange}
        placeholder="أدخل اسم المستشفى باللغة العربية"
        required
        icon={Building}
      />

      <FormField
        label="اسم المستشفى (إنجليزي)"
        name="hospital_name_en"
        value={formData.hospital_name_en}
        onChange={handleChange}
        placeholder="أدخل اسم المستشفى باللغة الإنجليزية"
        required
        icon={Building}
      />

      <FormField
        label="تاريخ الطباعة"
        name="print_date"
        value={formData.print_date}
        onChange={handleChange}
        placeholder="مثال: Tuesday, 22 April 2025"
        required
        icon={Calendar}
      />

      <FormField
        label="وقت الطباعة"
        name="print_time"
        value={formData.print_time}
        onChange={handleChange}
        placeholder="مثال: 12:32 PM"
        required
        icon={Clock}
      />
    </TabsContent>
  )
}
