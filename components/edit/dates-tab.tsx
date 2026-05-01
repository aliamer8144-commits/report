"use client"

import { Calendar } from "lucide-react"
import { TabsContent } from "@/components/ui/tabs"
import { FormField } from "@/components/edit/form-field"
import type { EditFormState } from "@/components/edit/types"

interface DatesTabProps {
  formData: EditFormState
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function DatesTab({ formData, handleChange }: DatesTabProps) {
  return (
    <TabsContent value="dates" className="space-y-4">
      <FormField
        label="تاريخ الدخول (ميلادي)"
        name="entryDateGregorian"
        type="date"
        value={formData.entryDateGregorian}
        onChange={handleChange}
        required
        icon={Calendar}
      />

      <FormField
        label="تاريخ الخروج (ميلادي)"
        name="exitDateGregorian"
        type="date"
        value={formData.exitDateGregorian}
        onChange={handleChange}
        readOnly
        icon={Calendar}
        hint="(يتم حسابه تلقائيًا بناءً على تاريخ الدخول وعدد الأيام)"
      />

      <FormField
        label="تاريخ الدخول (هجري)"
        name="entryDateHijri"
        value={formData.entryDateHijri}
        onChange={handleChange}
        placeholder="يتم حسابه تلقائيًا"
        readOnly
        icon={Calendar}
        hint="(يتم حسابه تلقائيًا من تاريخ الدخول الميلادي)"
      />

      <FormField
        label="تاريخ الخروج (هجري)"
        name="exitDateHijri"
        value={formData.exitDateHijri}
        onChange={handleChange}
        placeholder="يتم حسابه تلقائيًا"
        readOnly
        icon={Calendar}
        hint="(يتم حسابه تلقائيًا من تاريخ الخروج الميلادي)"
      />

      <FormField
        label="تاريخ إصدار التقرير"
        name="reportIssueDate"
        type="date"
        value={formData.reportIssueDate}
        onChange={handleChange}
        required
        icon={Calendar}
      />
    </TabsContent>
  )
}
