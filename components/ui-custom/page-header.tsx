"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
}

export function PageHeader({ title, description, icon }: PageHeaderProps) {
  return (
    <motion.div
      className="flex items-center space-x-4 space-x-reverse mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {icon && <div className="text-primary bg-indigo-100 p-2 rounded-xl">{icon}</div>}
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
    </motion.div>
  )
}
