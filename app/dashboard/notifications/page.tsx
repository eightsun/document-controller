import { createClient } from '@/utils/supabase/server'
import { Bell, Check, CheckCheck, Trash2, FileText, MessageSquare, Clock, X, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import NotificationsClient from './NotificationsClient'

export const metadata = {
  title: 'Notifications | Document Controller',
  description: 'View your notifications',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Please log in to view notifications</div>
  }

  // Fetch all notifications
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Count unread
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null)

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Bell className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
            <p className="text-sm text-slate-500">
              {unreadCount || 0} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Pass data to client component */}
      <NotificationsClient 
        initialNotifications={notifications || []} 
        initialUnreadCount={unreadCount || 0} 
      />
    </div>
  )
}
