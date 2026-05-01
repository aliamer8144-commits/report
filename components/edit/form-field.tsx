"use client"

import type React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"

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

export function FormField({
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
}: FormFieldProps) {
  return (
    <motion.div className="space-y-2" variants={itemVariants}>
      <Label htmlFor={name} className="text-amber-900 flex items-center gap-1.5">
        {Icon && <Icon className="h-4 w-4 text-amber-600" />}
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
          className={`border-amber-200 focus:border-amber-400 ${readOnly ? "bg-gray-50" : ""} ${inputClassName || ""}`}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </motion.div>
  )
}
