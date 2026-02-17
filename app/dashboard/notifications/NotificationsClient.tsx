'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  FileText, 
  MessageSquare, 
  Clock, 
  X, 
  AlertCircle,
  Filter
} from 'lucide-react'
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteReadNotifications,
  type Notification
} from './actions'

interface NotificationsClientProps {
  initialNotifications: Notification[]
  initialUnreadCount: number
}

export default function NotificationsClient({ 
  initialNotifications, 
  initialUnreadCount 
}: NotificationsClientProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [isDeletingRead, setIsDeletingRead] = useState(false)

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.read_at) return

    const result = await markNotificationAsRead(notification.id)
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true)
    const result = await markAllNotificationsAsRead()
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
      setUnreadCount(0)
    }
    setIsMarkingAll(false)
  }

  const handleDelete = async (notificationId: string) => {
    const result = await deleteNotification(notificationId)
    if (result.success) {
      const notification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.read_at) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    }
  }

  const handleDeleteRead = async () => {
    setIsDeletingRead(true)
    const result = await deleteReadNotifications()
    if (result.success) {
      setNotifications(prev => prev.filter(n => !n.read_at))
    }
    setIsDeletingRead(false)
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read first
    if (!notification.read_at) {
      await handleMarkAsRead(notification)
    }

    // Navigate
    if (notification.document_id) {
      router.push(`/dashboard/documents/${notification.document_id}`)
    } else if (notification.link) {
      router.push(notification.link)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
      case 'approval_needed':
        return <Clock className="w-5 h-5 text-amber-500" />
      case 'review_submitted':
        return <MessageSquare className="w-5 h-5 text-blue-500" />
      case 'document_approved':
        return <Check className="w-5 h-5 text-emerald-500" />
      case 'document_rejected':
        return <X className="w-5 h-5 text-red-500" />
      case 'comment':
        return <MessageSquare className="w-5 h-5 text-purple-500" />
      default:
        return <FileText className="w-5 h-5 text-slate-500" />
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read_at
    if (filter === 'read') return !!n.read_at
    return true
  })

  const readCount = notifications.filter(n => n.read_at).length

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === 'all' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === 'unread' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === 'read' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Read ({readCount})
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          )}
          {readCount > 0 && (
            <button
              onClick={handleDeleteRead}
              disabled={isDeletingRead}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete read
            </button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div className="card overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {filter === 'all' 
                ? 'No notifications yet' 
                : filter === 'unread' 
                  ? 'No unread notifications' 
                  : 'No read notifications'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors ${
                  !notification.read_at ? 'bg-blue-50/30' : ''
                }`}
              >
                {/* Icon */}
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  !notification.read_at ? 'bg-white shadow-sm' : 'bg-slate-100'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!notification.read_at ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                      {notification.title}
                    </p>
                    {!notification.read_at && (
                      <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {formatTime(notification.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!notification.read_at && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkAsRead(notification)
                      }}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(notification.id)
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info text */}
      <p className="text-xs text-slate-400 text-center">
        Showing {filteredNotifications.length} of {notifications.length} notifications
      </p>
    </div>
  )
}
