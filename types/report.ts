/**
 * واجهة التقرير الكاملة — مصدر واحد مشترك لكل الصفحات.
 *
 * ⚠️ إذا أضفت/عدّلت حقل في قاعدة البيانات، حدّث هذا الملف فقط
 *    وباقي الملفات ستستخدم التعريف الجديد تلقائياً.
 */
export interface Report {
  id: string
  user_id: string
  service_code: string
  id_number: string
  name_ar: string
  name_en: string
  days_count: number
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
  is_disabled: boolean
  created_at: string
  updated_at: string
}
