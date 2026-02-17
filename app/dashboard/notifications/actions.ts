'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Notification {
  id: string
  user_id: string
  document_id: string | null
  type: string
  title: string
  message: string
  link: string | null
  read_at: string | null
  created_at: string
}

interface NotificationResponse {
  success: boolean
  error?: string
  data?: Notification[]
  count?: number
}

// Get unread notification count
export async function getUnreadNotificationCount(): Promise<{ count: number }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { count: 0 }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)

    if (error) {
      console.error('Error fetching notification count:', error)
      return { count: 0 }
    }

    return { count: count || 0 }
  } catch (error) {
    console.error('Error in getUnreadNotificationCount:', error)
    return { count: 0 }
  }
}

// Get recent notifications (for dropdown)
export async function getRecentNotifications(limit: number = 10): Promise<NotificationResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { success: false, error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching notifications:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getRecentNotifications:', error)
    return { success: false, error: 'Failed to fetch notifications' }
  }
}

// Get all notifications with pagination
export async function getAllNotifications(page: number = 1, pageSize: number = 20): Promise<NotificationResponse & { total?: number }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { success: false, error: 'Not authenticated' }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Get total count
    const { count: total } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Get paginated data
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching all notifications:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [], total: total || 0 }
  } catch (error) {
    console.error('Error in getAllNotifications:', error)
    return { success: false, error: 'Failed to fetch notifications' }
  }
}

// Mark single notification as read
export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .is('read_at', null)

    if (error) {
      console.error('Error marking notification as read:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error)
    return { success: false, error: 'Failed to mark notification as read' }
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/notifications')
    return { success: true }
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error)
    return { success: false, error: 'Failed to mark all notifications as read' }
  }
}

// Delete a notification
export async function deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting notification:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/notifications')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteNotification:', error)
    return { success: false, error: 'Failed to delete notification' }
  }
}

// Delete all read notifications
export async function deleteReadNotifications(): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { success: false, error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .not('read_at', 'is', null)
      .select()

    if (error) {
      console.error('Error deleting read notifications:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/notifications')
    return { success: true, count: data?.length || 0 }
  } catch (error) {
    console.error('Error in deleteReadNotifications:', error)
    return { success: false, error: 'Failed to delete read notifications' }
  }
}
