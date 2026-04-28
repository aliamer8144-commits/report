"use client"

import { AlertCircle, CheckCircle, XCircle } from "lucide-react"

interface AlertMessageProps {
  type: "success" | "error"
  title: string
  message: string
  onClose?: () => void
}

export function AlertMessage({ type, title, message, onClose }: AlertMessageProps) {
  const successStyles = "bg-green-50 border-l-4 border-green-500 text-green-800"
  const errorStyles = "bg-red-50 border-l-4 border-red-500 text-red-800"

  return (
    <div className="mb-4">
      <div className={`rounded-lg shadow-md p-4 pr-10 relative ${type === "success" ? successStyles : errorStyles}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0 mt-0.5">
            {type === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div className="mr-3">
            <h3 className="text-sm font-medium">{title}</h3>
            <div className="mt-1 text-sm opacity-90">{message}</div>
          </div>
        </div>

        {onClose && (
          <button type="button" className="absolute top-4 left-4 text-gray-400 hover:text-gray-500" onClick={onClose}>
            <span className="sr-only">إغلاق</span>
            <XCircle
              className={`h-5 w-5 ${type === "success" ? "text-green-400 hover:text-green-500" : "text-red-400 hover:text-red-500"}`}
            />
          </button>
        )}
      </div>
    </div>
  )
}
