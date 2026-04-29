/* ============================================================
   suspension-check.ts
   أداة فحص وتنفيذ التعليقات التلقائية
   ============================================================ */

/* ---- الأنواع ---- */

export interface SuspensionCheckResult {
  shouldSuspend: boolean
  reason: string
  reasonType: "days_count" | "reports_count" | "specific_date"
  currentValue: number
  limitValue: number
  limitDisplay: string
}

export interface UserForCheck {
  limit_type: string | null
  limit_value: number | null
  limit_date: string | null
  is_suspended: boolean
}

export interface StatsForCheck {
  period_report_count: number
  period_total_days: number
  last_report_at: string | null
}

/* ============================================================
   فحص ما إذا كان المستخدم يجب تعليقه
   ============================================================ */

export function checkSuspension(
  user: UserForCheck,
  stats: StatsForCheck
): SuspensionCheckResult | null {
  // إذا كان معلقاً بالفعل، لا داعي للفحص
  if (user.is_suspended) return null

  // إذا لم يكن هناك حد مسموح
  if (!user.limit_type) return null

  switch (user.limit_type) {
    case "days": {
      const limitDays = user.limit_value ? Number(user.limit_value) : 0
      if (stats.period_total_days >= limitDays && limitDays > 0) {
        return {
          shouldSuspend: true,
          reason: `تجاوز عدد الأيام المسموح (${stats.period_total_days} / ${limitDays} يوم)`,
          reasonType: "days_count",
          currentValue: stats.period_total_days,
          limitValue: limitDays,
          limitDisplay: `${limitDays} يوم`,
        }
      }
      break
    }

    case "reports": {
      const limitReports = user.limit_value ? Number(user.limit_value) : 0
      if (stats.period_report_count >= limitReports && limitReports > 0) {
        return {
          shouldSuspend: true,
          reason: `تجاوز عدد التقارير المسموح (${stats.period_report_count} / ${limitReports} تقرير)`,
          reasonType: "reports_count",
          currentValue: stats.period_report_count,
          limitValue: limitReports,
          limitDisplay: `${limitReports} تقرير`,
        }
      }
      break
    }

    case "date": {
      if (!user.limit_date) return null
      const limitDate = new Date(user.limit_date)
      const now = new Date()

      // التاريخ لم ينتهِ بعد
      if (limitDate > now) return null

      // التاريخ انتهى - نتحقق هل يوجد تقرير بعد التاريخ
      if (stats.last_report_at) {
        const lastReportDate = new Date(stats.last_report_at)
        if (lastReportDate > limitDate) {
          const daysDiff = Math.ceil(
            (lastReportDate.getTime() - limitDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          return {
            shouldSuspend: true,
            reason: `انتهت صلاحية الحساب بتاريخ ${limitDate.toLocaleDateString("ar-SA")} وتم إنشاء تقرير بعد الانتهاء بـ ${daysDiff} يوم`,
            reasonType: "specific_date",
            currentValue: daysDiff,
            limitValue: 0,
            limitDisplay: limitDate.toLocaleDateString("ar-SA"),
          }
        }
      }
      break
    }
  }

  return null
}

/* ============================================================
   حساب نسبة الاستخدام للحد المسموح (للتحذير)
   ============================================================ */

export function getLimitUsagePercentage(
  user: UserForCheck,
  stats: StatsForCheck
): number | null {
  if (!user.limit_type || user.is_suspended) return null

  switch (user.limit_type) {
    case "days": {
      const limitDays = user.limit_value ? Number(user.limit_value) : 0
      if (limitDays <= 0) return null
      return Math.round((stats.period_total_days / limitDays) * 100)
    }
    case "reports": {
      const limitReports = user.limit_value ? Number(user.limit_value) : 0
      if (limitReports <= 0) return null
      return Math.round((stats.period_report_count / limitReports) * 100)
    }
    case "date": {
      if (!user.limit_date) return null
      const limitDate = new Date(user.limit_date)
      const now = new Date()
      const totalMs = limitDate.getTime() - new Date(Math.min(now.getTime(), Date.now())).getTime()
      if (totalMs <= 0) return 100
      // حساب الوقت الكلي من إنشاء المستخدم إلى تاريخ الانتهاء
      return null // لا نعرض نسبة للتاريخ المحدد
    }
    default:
      return null
  }
}

/* ============================================================
   بناء سجل تعليق للإدخال في قاعدة البيانات
   ============================================================ */

export function buildSuspensionRecord(
  userId: string,
  suspendedBy: string,
  reason: string,
  stats: { period_report_count: number; period_total_days: number }
): Record<string, unknown> {
  return {
    user_id: userId,
    suspended_by: suspendedBy,
    suspension_reason: reason,
    suspended_at: new Date().toISOString(),
    reactivated_at: null,
    reactivated_by: null,
    reports_count_at_suspension: stats.period_report_count,
    days_count_at_suspension: stats.period_total_days,
  }
}

/* ============================================================
   تنسيق سبب التعليق للعرض
   ============================================================ */

export function formatSuspensionReason(result: SuspensionCheckResult): string {
  switch (result.reasonType) {
    case "days_count":
      return `تجاوز عدد الأيام المسموح: ${result.currentValue} من ${result.limitValue} يوم`
    case "reports_count":
      return `تجاوز عدد التقارير المسموح: ${result.currentValue} من ${result.limitValue} تقرير`
    case "specific_date":
      return `انتهت صلاحية الحساب بتاريخ ${result.limitDisplay}`
    default:
      return result.reason
  }
}
