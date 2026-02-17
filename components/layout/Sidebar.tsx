'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  FolderOpen, 
  Users, 
  Settings, 
  BarChart3,
  Upload,
  Clock,
  FileCheck,
  X,
  Building2,
  UserCog,
  Shield,
  Bell
} from 'lucide-react'
import { useState, useEffect } from 'react'

const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Pending Review', href: '/dashboard/pending', icon: Clock },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
]

const adminNavigation = [
  { name: 'Departments', href: '/dashboard/departments', icon: Building2 },
  { name: 'Document Types', href: '/dashboard/document-types', icon: FolderOpen },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Roles', href: '/dashboard/roles', icon: Shield },
  { name: 'User Roles', href: '/dashboard/user-roles', icon: UserCog },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Handle mobile menu toggle from header
  useEffect(() => {
    const handleToggle = () => setIsMobileOpen(prev => !prev)
    window.addEventListener('toggle-sidebar', handleToggle)
    return () => window.removeEventListener('toggle-sidebar', handleToggle)
  }, [])

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-700">
        <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold text-white">DocController</span>
          <p className="text-xs text-slate-400">Document Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Main Menu
        </p>
        {mainNavigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </Link>
          )
        })}

        <div className="pt-6">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Administration
          </p>
          {adminNavigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-700/50 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-2">Storage Used</p>
          <div className="w-full bg-slate-600 rounded-full h-2 mb-2">
            <div className="bg-primary-500 h-2 rounded-full" style={{ width: '45%' }}></div>
          </div>
          <p className="text-xs text-slate-300">4.5 GB of 10 GB</p>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="relative w-64 h-full bg-sidebar flex flex-col animate-fade-in">
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
