import { createClientSupabaseClient } from "./supabase"

export type ActivityType = "add" | "edit" | "delete" | "view" | "download" | "system"

export interface Activity {
  id: string
  user_id: string
  report_id?: string
  activity_type: ActivityType
  title: string
  description?: string
  is_read: boolean
  created_at: string
}

// إضافة نشاط جديد
export async function addActivity(
  userId: string,
  activityType: ActivityType,
  title: string,
  description?: string,
  reportId?: string,
) {
  try {
    const supabase = createClientSupabaseClient()

    const { error } = await supabase.from("activities").insert({
      user_id: userId,
      report_id: reportId,
      activity_type: activityType,
      title,
      description,
      is_read: false,
    })

    if (error) {
      console.error("Error adding activity:", error)
      return false
    }

    return true
  } catch (err) {
    console.error("Error in addActivity:", err)
    return false
  }
}

// جلب آخر النشاطات للمستخدم
export async function getRecentActivities(userId: string, limit = 5) {
  try {
    const supabase = createClientSupabaseClient()

    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching activities:", error)
      return []
    }

    return data as Activity[]
  } catch (err) {
    console.error("Error in getRecentActivities:", err)
    return []
  }
}

// جلب الإشعارات غير المقروءة للمستخدم
export async function getUnreadNotifications(userId: string) {
  try {
    const supabase = createClientSupabaseClient()

    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching notifications:", error)
      return []
    }

    return data as Activity[]
  } catch (err) {
    console.error("Error in getUnreadNotifications:", err)
    return []
  }
}

// تحديث حالة الإشعار إلى مقروء
export async function markNotificationAsRead(notificationId: string) {
  try {
    const supabase = createClientSupabaseClient()

    const { error } = await supabase.from("activities").update({ is_read: true }).eq("id", notificationId)

    if (error) {
      console.error("Error marking notification as read:", error)
      return false
    }

    return true
  } catch (err) {
    console.error("Error in markNotificationAsRead:", err)
    return false
  }
}

// تحديث حالة جميع الإشعارات إلى مقروءة
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const supabase = createClientSupabaseClient()

    const { error } = await supabase
      .from("activities")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)

    if (error) {
      console.error("Error marking all notifications as read:", error)
      return false
    }

    return true
  } catch (err) {
    console.error("Error in markAllNotificationsAsRead:", err)
    return false
  }
}
