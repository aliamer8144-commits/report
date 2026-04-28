// import type { Report } from "@/types/report"
// import { createClientSupabaseClient } from "./supabase"
// import { addActivity } from "./activities-service"
// import jsPDF from "jspdf"
// import "jspdf-autotable"
// // import PptxGenJS from "pptxgenjs"

// // استيراد المكتبات بشكل ديناميكي لتجنب مشاكل SSR
// export const generatePDF = async (report: Report) => {
//   try {
//     // استيراد مكتبة jsPDF بشكل ديناميكي
//     const { default: jsPDF } = await import("jspdf")
//     const { default: autoTable } = await import("jspdf-autotable")

//     // إنشاء مستند PDF جديد
//     const doc = new jsPDF()

//     // إضافة عنوان
//     doc.setFont("helvetica", "bold")
//     doc.setFontSize(18)
//     doc.text("تقرير طبي", doc.internal.pageSize.width / 2, 20, { align: "center" })

//     // إضافة معلومات المريض
//     doc.setFont("helvetica", "normal")
//     doc.setFontSize(12)
//     doc.text(`اسم المريض: ${report.name_ar}`, 20, 40)
//     doc.text(`رقم الهوية: ${report.id_number}`, 20, 50)
//     doc.text(`رمز الخدمة: ${report.service_code}`, 20, 60)

//     // إضافة معلومات الإقامة
//     doc.text(`تاريخ الدخول: ${formatDate(report.entry_date_gregorian)}`, 20, 80)
//     doc.text(`تاريخ الخروج: ${formatDate(report.exit_date_gregorian)}`, 20, 90)
//     doc.text(`عدد أيام الإقامة: ${report.days_count}`, 20, 100)

//     // إضافة جدول بالمعلومات الإضافية
//     autoTable(doc, {
//       startY: 120,
//       head: [["البيان", "القيمة"]],
//       body: [
//         ["الجنسية", report.nationality_ar],
//         ["اسم الطبيب", report.doctor_name_ar],
//         ["المسمى الوظيفي", report.job_title_ar],
//         ["اسم المستشفى", report.hospital_name_ar],
//         ["تاريخ إصدار التقرير", formatDate(report.report_issue_date)],
//       ],
//       theme: "grid",
//       headStyles: { fillColor: [73, 70, 229], textColor: [255, 255, 255] },
//       styles: { font: "helvetica", fontSize: 10 },
//     })

//     // إضافة توقيع الطبيب
//     doc.text("توقيع الطبيب:", 20, doc.autoTable.previous.finalY + 20)
//     doc.text("................................", 60, doc.autoTable.previous.finalY + 20)

//     // إضافة ختم المستشفى
//     doc.text("ختم المستشفى:", 20, doc.autoTable.previous.finalY + 40)
//     doc.text("................................", 60, doc.autoTable.previous.finalY + 40)

//     // إضافة تاريخ الطباعة
//     doc.setFontSize(8)
//     doc.text(
//       `تاريخ الطباعة: ${report.print_date} - ${report.print_time}`,
//       doc.internal.pageSize.width - 20,
//       doc.internal.pageSize.height - 10,
//       { align: "right" },
//     )

//     // تنزيل الملف
//     doc.save(`تقرير_طبي_${report.name_ar}_${report.id_number}.pdf`)
//     return true
//   } catch (error) {
//     console.error("Error generating PDF:", error)
//     return false
//   }
// }

// export const generatePPTX = async (report: Report) => {
//   try {
//     // استيراد مكتبة pptxgenjs بشكل ديناميكي
//     const { default: PptxGenJS } = await import("pptxgenjs")

//     // إنشاء عرض تقديمي جديد
//     const pptx = new PptxGenJS()

//     // إضافة شريحة العنوان
//     const slide1 = pptx.addSlide()

//     // إضافة عنوان
//     slide1.addText("تقرير طبي", {
//       x: 1,
//       y: 0.5,
//       w: "80%",
//       h: 1,
//       align: "center",
//       fontSize: 36,
//       color: "363794",
//       bold: true,
//     })

//     // إضافة معلومات المريض
//     slide1.addText(`اسم المريض: ${report.name_ar}`, {
//       x: 1,
//       y: 1.5,
//       fontSize: 18,
//       rtl: true,
//     })

//     slide1.addText(`رقم الهوية: ${report.id_number}`, {
//       x: 1,
//       y: 2,
//       fontSize: 18,
//       rtl: true,
//     })

//     slide1.addText(`رمز الخدمة: ${report.service_code}`, {
//       x: 1,
//       y: 2.5,
//       fontSize: 18,
//       rtl: true,
//     })

//     // إضافة شريحة تفاصيل الإقامة
//     const slide2 = pptx.addSlide()

//     slide2.addText("تفاصيل الإقامة", {
//       x: 1,
//       y: 0.5,
//       w: "80%",
//       h: 1,
//       align: "center",
//       fontSize: 32,
//       color: "363794",
//       bold: true,
//     })

//     // إضافة جدول بمعلومات الإقامة
//     slide2.addTable(
//       [
//         [
//           { text: "البيان", options: { bold: true, fill: "363794", color: "FFFFFF" } },
//           { text: "القيمة", options: { bold: true, fill: "363794", color: "FFFFFF" } },
//         ],
//         ["تاريخ الدخول", formatDate(report.entry_date_gregorian)],
//         ["تاريخ الخروج", formatDate(report.exit_date_gregorian)],
//         ["عدد أيام الإقامة", report.days_count.toString()],
//         ["الجنسية", report.nationality_ar],
//         ["اسم الطبيب", report.doctor_name_ar],
//         ["المسمى الوظيفي", report.job_title_ar],
//         ["اسم المستشفى", report.hospital_name_ar],
//         ["تاريخ إصدار التقرير", formatDate(report.report_issue_date)],
//       ],
//       { x: 1, y: 1.5, w: 8, h: 4, colW: [2, 6], rowH: 0.5, fontSize: 14, rtl: true },
//     )

//     // إضافة شريحة الختام
//     const slide3 = pptx.addSlide()

//     slide3.addText("شكراً لكم", {
//       x: 1,
//       y: 2,
//       w: "80%",
//       h: 1,
//       align: "center",
//       fontSize: 44,
//       color: "363794",
//       bold: true,
//     })

//     slide3.addText(`تاريخ الطباعة: ${report.print_date} - ${report.print_time}`, {
//       x: 1,
//       y: 4,
//       w: "80%",
//       h: 0.5,
//       align: "center",
//       fontSize: 12,
//     })

//     // تنزيل الملف
//     pptx.writeFile({ fileName: `تقرير_طبي_${report.name_ar}_${report.id_number}.pptx` })
//     return true
//   } catch (error) {
//     console.error("Error generating PPTX:", error)
//     return false
//   }
// }

// // دالة مساعدة لتنسيق التاريخ
// const formatDate = (dateString: string) => {
//   if (!dateString) return ""
//   const date = new Date(dateString)
//   return date.toLocaleDateString("ar-SA")
// }

// export interface ReportData {
//   SERVICE_CODE: string
//   ID_NUMBER: string
//   NAME_AR: string
//   NAME_EN: string
//   DAYS_COUNT: number
//   ENTRY_DATE_GREGORIAN: string
//   EXIT_DATE_GREGORIAN: string
//   ENTRY_DATE_HIJRI: string
//   EXIT_DATE_HIJRI: string
//   REPORT_ISSUE_DATE: string
//   NATIONALITY_AR: string
//   NATIONALITY_EN: string
//   DOCTOR_NAME_AR: string
//   DOCTOR_NAME_EN: string
//   JOB_TITLE_AR: string
//   JOB_TITLE_EN: string
//   HOSPITAL_NAME_AR: string
//   HOSPITAL_NAME_EN: string
//   PRINT_DATE: string
//   PRINT_TIME: string
// }

// /**
//  * تنزيل قالب التقرير بصيغة PPTX
//  * @param reportData بيانات التقرير
//  * @param userId معرف المستخدم
//  * @returns وعد بنتيجة العملية
//  */
// export async function downloadPPTX(reportData: ReportData, userId: string): Promise<boolean> {
//   try {
//     console.log("بدء عملية تنزيل ملف PPTX...")
    
//     // استيراد مكتبة pptxgenjs بشكل ديناميكي
//     const { default: PptxGenJS } = await import("pptxgenjs")

//     // إنشاء عرض تقديمي جديد
//     const pptx = new PptxGenJS()

//     // إضافة شريحة العنوان
//     const slide1 = pptx.addSlide()

//     // إضافة عنوان
//     slide1.addText("تقرير طبي", {
//       x: 1,
//       y: 0.5,
//       w: "80%",
//       h: 1,
//       align: "center",
//       fontSize: 36,
//       color: "363794",
//       bold: true,
//     })

//     // إضافة معلومات المريض
//     slide1.addText(`اسم المريض: ${reportData.NAME_AR}`, {
//       x: 1,
//       y: 1.5,
//       fontSize: 18,
//     })

//     slide1.addText(`رقم الهوية: ${reportData.ID_NUMBER}`, {
//       x: 1,
//       y: 2,
//       fontSize: 18,
//     })

//     slide1.addText(`رمز الخدمة: ${reportData.SERVICE_CODE}`, {
//       x: 1,
//       y: 2.5,
//       fontSize: 18,
//     })

//     // إضافة شريحة تفاصيل الإقامة
//     const slide2 = pptx.addSlide()

//     slide2.addText("تفاصيل الإقامة", {
//       x: 1,
//       y: 0.5,
//       w: "80%",
//       h: 1,
//       align: "center",
//       fontSize: 32,
//       color: "363794",
//       bold: true,
//     })

//     // إضافة جدول بمعلومات الإقامة
//     slide2.addTable(
//       [
//         [
//           { text: "البيان", options: { bold: true, fill: { color: "363794" }, color: "FFFFFF" } },
//           { text: "القيمة", options: { bold: true, fill: { color: "363794" }, color: "FFFFFF" } },
//         ],
//         [
//           { text: "تاريخ الدخول", options: {} },
//           { text: reportData.ENTRY_DATE_GREGORIAN, options: {} },
//         ],
//         [
//           { text: "تاريخ الخروج", options: {} },
//           { text: reportData.EXIT_DATE_GREGORIAN, options: {} },
//         ],
//         [
//           { text: "عدد أيام الإقامة", options: {} },
//           { text: reportData.DAYS_COUNT.toString(), options: {} },
//         ],
//         [
//           { text: "الجنسية", options: {} },
//           { text: reportData.NATIONALITY_AR, options: {} },
//         ],
//         [
//           { text: "اسم الطبيب", options: {} },
//           { text: reportData.DOCTOR_NAME_AR, options: {} },
//         ],
//         [
//           { text: "المسمى الوظيفي", options: {} },
//           { text: reportData.JOB_TITLE_AR, options: {} },
//         ],
//         [
//           { text: "اسم المستشفى", options: {} },
//           { text: reportData.HOSPITAL_NAME_AR, options: {} },
//         ],
//         [
//           { text: "تاريخ إصدار التقرير", options: {} },
//           { text: reportData.REPORT_ISSUE_DATE, options: {} },
//         ],
//       ],
//       { x: 1, y: 1.5, w: 8, h: 4, colW: [2, 6], rowH: 0.5, fontSize: 14 },
//     )

//     // إضافة شريحة الختام
//     const slide3 = pptx.addSlide()

//     slide3.addText("شكراً لكم", {
//       x: 1,
//       y: 2,
//       w: "80%",
//       h: 1,
//       align: "center",
//       fontSize: 44,
//       color: "363794",
//       bold: true,
//     })

//     slide3.addText(`تاريخ الطباعة: ${reportData.PRINT_DATE} - ${reportData.PRINT_TIME}`, {
//       x: 1,
//       y: 4,
//       w: "80%",
//       h: 0.5,
//       align: "center",
//       fontSize: 12,
//     })

//     // تنزيل الملف
//     await pptx.writeFile({ fileName: `sickLeaves_${reportData.NAME_AR}_${reportData.ID_NUMBER}.pptx` })
//     console.log("تم تنزيل الملف بنجاح")

//     // تسجيل النشاط
//     await addActivity(
//       userId,
//       "download",
//       "تم تنزيل تقرير بصيغة PPTX",
//       `تم تنزيل تقرير بصيغة PPTX للمريض ${reportData.NAME_AR}`
//     )
//     console.log("تم تسجيل النشاط")

//     return true
//   } catch (err) {
//     console.error("خطأ في تنزيل ملف PPTX:", err)
//     if (err instanceof Error) {
//       console.error("تفاصيل الخطأ:", err.message)
//       console.error("Stack trace:", err.stack)
//     }
//     return false
//   }
// }

// /**
//  * تنزيل قالب التقرير بصيغة PDF
//  * @param reportData بيانات التقرير
//  * @param userId معرف المستخدم
//  * @returns وعد بنتيجة العملية
//  */
// export async function downloadPDF(reportData: ReportData, userId: string): Promise<boolean> {
//   try {
//     console.log("بدء عملية تنزيل ملف PDF...")
    
//     // استيراد مكتبة jsPDF بشكل ديناميكي
//     const { default: jsPDF } = await import("jspdf")
//     const { default: autoTable } = await import("jspdf-autotable")

//     // إنشاء مستند PDF جديد
//     const doc = new jsPDF()

//     // إضافة عنوان
//     doc.setFont("helvetica", "bold")
//     doc.setFontSize(18)
//     doc.text("تقرير طبي", doc.internal.pageSize.width / 2, 20, { align: "center" })

//     // إضافة معلومات المريض
//     doc.setFont("helvetica", "normal")
//     doc.setFontSize(12)
//     doc.text(`اسم المريض: ${reportData.NAME_AR}`, 20, 40)
//     doc.text(`رقم الهوية: ${reportData.ID_NUMBER}`, 20, 50)
//     doc.text(`رمز الخدمة: ${reportData.SERVICE_CODE}`, 20, 60)

//     // إضافة معلومات الإقامة
//     doc.text(`تاريخ الدخول: ${reportData.ENTRY_DATE_GREGORIAN}`, 20, 80)
//     doc.text(`تاريخ الخروج: ${reportData.EXIT_DATE_GREGORIAN}`, 20, 90)
//     doc.text(`عدد أيام الإقامة: ${reportData.DAYS_COUNT}`, 20, 100)

//     // إضافة جدول بالمعلومات الإضافية
//     autoTable(doc, {
//       startY: 120,
//       head: [["البيان", "القيمة"]],
//       body: [
//         ["الجنسية", reportData.NATIONALITY_AR],
//         ["اسم الطبيب", reportData.DOCTOR_NAME_AR],
//         ["المسمى الوظيفي", reportData.JOB_TITLE_AR],
//         ["اسم المستشفى", reportData.HOSPITAL_NAME_AR],
//         ["تاريخ إصدار التقرير", reportData.REPORT_ISSUE_DATE],
//       ],
//       theme: "grid",
//       headStyles: { fillColor: [73, 70, 229], textColor: [255, 255, 255] },
//       styles: { font: "helvetica", fontSize: 10 },
//     })

//     // إضافة توقيع الطبيب
//     doc.text("توقيع الطبيب:", 20, (doc as any).autoTable.previous.finalY + 20)
//     doc.text("................................", 60, (doc as any).autoTable.previous.finalY + 20)

//     // إضافة ختم المستشفى
//     doc.text("ختم المستشفى:", 20, (doc as any).autoTable.previous.finalY + 40)
//     doc.text("................................", 60, (doc as any).autoTable.previous.finalY + 40)

//     // إضافة تاريخ الطباعة
//     doc.setFontSize(8)
//     doc.text(
//       `تاريخ الطباعة: ${reportData.PRINT_DATE} - ${reportData.PRINT_TIME}`,
//       doc.internal.pageSize.width - 20,
//       doc.internal.pageSize.height - 10,
//       { align: "right" },
//     )

//     // تنزيل الملف
//     doc.save(`sickLeaves_${reportData.NAME_AR}_${reportData.ID_NUMBER}.pdf`)
//     console.log("تم تنزيل الملف بنجاح")

//     // تسجيل النشاط
//     await addActivity(
//       userId,
//       "download",
//       "تم تنزيل تقرير بصيغة PDF",
//       `تم تنزيل تقرير بصيغة PDF للمريض ${reportData.NAME_AR}`
//     )
//     console.log("تم تسجيل النشاط")

//     return true
//   } catch (err) {
//     console.error("خطأ في تنزيل ملف PDF:", err)
//     if (err instanceof Error) {
//       console.error("تفاصيل الخطأ:", err.message)
//       console.error("Stack trace:", err.stack)
//     }
//     return false
//   }
// }
