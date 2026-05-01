"use client"

import type React from "react"

import { TabsContent } from "@/components/ui/tabs"
import { Calendar } from "lucide-react"
import { FormField } from "@/components/report/form-field"
import type { ReportFormFields } from "@/components/report/form-field"

interface DatesTabProps {
  formData: ReportFormFields
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function DatesTab({ formData, handleChange }: DatesTabProps) {
  return (
    <TabsContent value="dates" className="space-y-4">
      <FormField
        label="تاريخ الدخول (ميلادي)"
        name="entry_date_gregorian"
        type="date"
        value={formData.entry_date_gregorian}
        onChange={handleChange}
        required
        icon={Calendar}
      />

      <FormField
        label="تاريخ الخروج (ميلادي)"
        name="exit_date_gregorian"
        type="date"
        value={formData.exit_date_gregorian}
        onChange={handleChange}
        readOnly
        icon={Calendar}
        hint="(يتم حسابه تلقائيًا بناءً على تاريخ الدخول وعدد الأيام)"
      />

      <FormField
        label="تاريخ الدخول (هجري)"
        name="entry_date_hijri"
        value={formData.entry_date_hijri}
        onChange={handleChange}
        placeholder="يتم حسابه تلقائيًا"
        readOnly
        icon={Calendar}
        hint="(يتم حسابه تلقائيًا من تاريخ الدخول الميلادي)"
      />

      <FormField
        label="تاريخ الخروج (هجري)"
        name="exit_date_hijri"
        value={formData.exit_date_hijri}
        onChange={handleChange}
        placeholder="يتم حسابه تلقائيًا"
        readOnly
        icon={Calendar}
        hint="(يتم حسابه تلقائيًا من تاريخ الخروج الميلادي)"
      />

      <FormField
        label="تاريخ إصدار التقرير"
        name="report_issue_date"
        type="date"
        value={formData.report_issue_date}
        onChange={handleChange}
        required
        icon={Calendar}
      />
    </TabsContent>
  )
}
