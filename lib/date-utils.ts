import { toHijri } from "hijri-date-converter"

/**
 * تحويل التاريخ الميلادي إلى هجري
 * @param gregorianDate تاريخ ميلادي بصيغة YYYY-MM-DD
 * @returns تاريخ هجري بصيغة DD-MM-YYYY
 */
export const convertToHijri = (gregorianDate: string): string => {
  if (!gregorianDate) return ""
  try {
    const date = new Date(gregorianDate)
    const hijriDate = toHijri(date)
    const day = String(hijriDate.day).padStart(2, "0")
    const month = String(hijriDate.month).padStart(2, "0")
    const year = hijriDate.year
    return `${day}-${month}-${year}`
  } catch (error) {
    console.error("Error converting to Hijri:", error)
    return ""
  }
}
