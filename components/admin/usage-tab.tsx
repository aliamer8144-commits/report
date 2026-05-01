"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Activity, Clock, CheckCircle2, XCircle, TrendingUp, RefreshCw, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface UsageLog {
  id: string
  type: string
  status: string
  details: string | null
  created_at: string
}

export interface UsageStats {
  total: number
  today: number
  thisMonth: number
  successCount: number
  errorCount: number
  remaining: number
  monthlyQuota: number
  usagePercent: number
  recentLogs: UsageLog[]
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface UsageTabProps {
  usageStats: UsageStats | null
  loadingUsage: boolean
  onRefresh: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UsageTab({ usageStats, loadingUsage, onRefresh }: UsageTabProps) {
  return (
    <>
      {/* Summary Stats Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              استخدام واجهة برمجة التطبيقات
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={onRefresh}
              disabled={loadingUsage}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingUsage ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingUsage && !usageStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : usageStats ? (
            <div className="space-y-5">
              {/* Monthly Quota */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">الحصة الشهرية</span>
                  <span className={`font-bold ${usageStats.usagePercent >= 90 ? "text-red-600" : usageStats.usagePercent >= 70 ? "text-amber-600" : "text-emerald-600"}`}>
                    {usageStats.thisMonth} / {usageStats.monthlyQuota}
                  </span>
                </div>
                <Progress value={Math.min(usageStats.usagePercent, 100)} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>المتبقي: <span className="font-semibold text-emerald-600">{usageStats.remaining}</span> طلب</span>
                  <span>{usageStats.usagePercent}%</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 bg-white">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Activity className="h-3.5 w-3.5" />
                    <span>اليوم</span>
                  </div>
                  <p className="text-xl font-bold text-gray-800">{usageStats.today}</p>
                </div>
                <div className="rounded-lg border p-3 bg-white">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>الإجمالي</span>
                  </div>
                  <p className="text-xl font-bold text-gray-800">{usageStats.total}</p>
                </div>
                <div className="rounded-lg border p-3 bg-emerald-50">
                  <div className="flex items-center gap-2 text-xs text-emerald-700 mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>ناجح</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-700">{usageStats.successCount}</p>
                </div>
                <div className="rounded-lg border p-3 bg-red-50">
                  <div className="flex items-center gap-2 text-xs text-red-700 mb-1">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>فاشل</span>
                  </div>
                  <p className="text-xl font-bold text-red-700">{usageStats.errorCount}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Logs Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            الطلبات الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!usageStats?.recentLogs || usageStats.recentLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">لا يوجد طلبات مسجلة</p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {usageStats.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-md bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center justify-center w-12 h-7 rounded-md text-[11px] font-bold ${
                      log.type.toUpperCase() === "PDF"
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {log.type.toUpperCase()}
                    </span>
                    {log.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    {log.status === "success" ? (
                      <span className="text-xs text-emerald-600 font-medium">ناجح</span>
                    ) : (
                      <span className="text-xs text-red-600 font-medium">فاشل</span>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("ar-SA")}
                    </p>
                    {log.details && (
                      <p className="text-[10px] text-red-400 max-w-[160px] truncate" title={log.details}>
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
