'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  Menu, 
  Bell, 
  Search, 
  ChevronDown, 
  LogOut, 
  User as UserIcon, 
  Settings,
  Loader2
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface HeaderProps {
  user: User
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const toggleSidebar = () => {
    window.dispatchEvent(new Event('toggle-sidebar'))
  }

  const notifications = [
    { id: 1, title: 'New document uploaded', time: '5 min ago', unread: true },
    { id: 2, title: 'Document approved', time: '1 hour ago', unread: true },
    { id: 3, title: 'Comment on DOC-001', time: '2 hours ago', unread: false },
  ]

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search bar */}
        <div className="hidden sm:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents..."
              className="w-64 pl-10 pr-4 py-2 text-sm bg-slate-100 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNotificationOpen(!isNotificationOpen)
              setIsDropdownOpen(false)
            }}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 py-2 animate-fade-in">
              <div className="px-4 py-2 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 hover:bg-slate-50 cursor-pointer ${
                      notif.unread ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <p className="text-sm text-slate-800">{notif.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{notif.time}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-slate-100">
                <button className="text-sm text-primary-500 font-medium hover:text-primary-600">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen)
              setIsNotificationOpen(false)
            }}
            className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-slate-700">
                {user.email?.split('@')[0]}
              </p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <ChevronDown className="hidden md:block w-4 h-4 text-slate-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-800">
                  {user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>

              <div className="py-2">
                <button className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                  <UserIcon className="w-4 h-4" />
                  Profile
                </button>
                <button className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <Loader2 className="w-4 h-4 spinner" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  {isLoggingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(isDropdownOpen || isNotificationOpen) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => {
            setIsDropdownOpen(false)
            setIsNotificationOpen(false)
          }}
        />
      )}
    </header>
  )
}
