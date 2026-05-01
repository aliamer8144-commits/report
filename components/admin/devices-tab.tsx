"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Smartphone, Check, X } from "lucide-react"

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Device {
  id: string
  user_id: string
  device_id: string
  is_approved: boolean
  created_at: string
  username?: string
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface DevicesTabProps {
  devices: Device[]
  onApprove: (deviceId: string) => void
  onReject: (deviceId: string) => void
  formatDate: (dateString: string) => string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DevicesTab({ devices, onApprove, onReject, formatDate }: DevicesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Smartphone className="mr-2 h-5 w-5" />
          طلبات الأجهزة
        </CardTitle>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">لا توجد طلبات أجهزة</p>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <div key={device.id} className="p-4 border rounded-md">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{device.username}</p>
                    <p className="text-xs text-muted-foreground">
                      معرف الجهاز: {device.device_id.substring(0, 10)}...
                    </p>
                    <p className="text-xs text-muted-foreground">تاريخ الطلب: {formatDate(device.created_at)}</p>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-xs ${device.is_approved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                  >
                    {device.is_approved ? "تمت الموافقة" : "في الانتظار"}
                  </div>
                </div>
                {!device.is_approved && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={() => onApprove(device.id)}
                      className="flex-1 bg-green-500 hover:bg-green-600"
                      size="sm"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      موافقة
                    </Button>
                    <Button
                      onClick={() => onReject(device.id)}
                      className="flex-1 bg-red-500 hover:bg-red-600"
                      size="sm"
                    >
                      <X className="mr-2 h-4 w-4" />
                      رفض
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
