"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface ReportFormFields {
  service_code: string
  id_number: string
  name_ar: string
  name_en: string
  days_count: string
  entry_date_gregorian: string
  exit_date_gregorian: string
  entry_date_hijri: string
  exit_date_hijri: string
  report_issue_date: string
  nationality_ar: string
  nationality_en: string
  doctor_name_ar: string
  doctor_name_en: string
  job_title_ar: string
  job_title_en: string
  hospital_name_ar: string
  hospital_name_en: string
  print_date: string
  print_time: string
}

interface FormFieldProps {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  required?: boolean
  readOnly?: boolean
  icon?: React.ElementType
  hint?: string
  inputClassName?: string
}

export const FormField = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  readOnly = false,
  icon: Icon,
  hint,
  inputClassName,
}: FormFieldProps) => (
  <motion.div className="space-y-2 text-right" variants={{
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
  }}>
    <Label htmlFor={name} className="text-indigo-900 flex items-center gap-1.5 justify-end flex-row-reverse w-full">
      {Icon && <Icon className="h-4 w-4 text-indigo-600" />}
      {label}
      {required && <span className="text-red-500">*</span>}
    </Label>
    <div className="relative">
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        className={`text-right border-indigo-200 focus:border-indigo-400 ${readOnly ? "bg-gray-50" : ""} ${inputClassName || ""}`}
      />
    </div>
    {hint && <p className="text-xs text-muted-foreground text-right">{hint}</p>}
  </motion.div>
)
