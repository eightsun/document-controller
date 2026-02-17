'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Settings, 
  Save, 
  Building2, 
  FileText, 
  Clock, 
  Bell,
  CheckCircle,
  AlertCircle,
  Mail,
  Calendar
} from 'lucide-react'

interface SystemSettings {
  company_name: string
  company_code: string
  default_expiry_years: number
  reminder_days_before: number
  enable_email_notifications: boolean
  admin_email: string
}

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [settings, setSettings] = useState<SystemSettings>({
    company_name: 'PT Meratus Line',
    company_code: 'MRT',
    default_expiry_years: 3,
    reminder_days_before: 3,
    enable_email_notifications: true,
    admin_email: '',
  })

  // Statistics
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalUsers: 0,
    totalDepartments: 0,
    totalDocTypes: 0,
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Fetch statistics
      const [docsResult, usersResult, deptsResult, typesResult] = await Promise.all([
        supabase.from('documents').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('departments').select('*', { count: 'exact', head: true }),
        supabase.from('document_types').select('*', { count: 'exact', head: true }),
      ])

      setStats({
        totalDocuments: docsResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalDepartments: deptsResult.count || 0,
        totalDocTypes: typesResult.count || 0,
      })

      // Try to load settings from localStorage (or could be from a settings table)
      const savedSettings = localStorage.getItem('doccontroller_settings')
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      // Save settings to localStorage (in production, save to database)
      localStorage.setItem('doccontroller_settings', JSON.stringify(settings))
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Settings className="w-6 h-6 text-slate-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>
        </div>
        <p className="text-slate-500">Configure system-wide settings and preferences</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalDocuments}</p>
            <p className="text-sm text-slate-500">Total Documents</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-lg">
            <Building2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalDepartments}</p>
            <p className="text-sm text-slate-500">Departments</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalDocTypes}</p>
            <p className="text-sm text-slate-500">Document Types</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-lg">
            <Building2 className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalUsers}</p>
            <p className="text-sm text-slate-500">Users</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Company Settings */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Company Settings</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company Code
                </label>
                <input
                  type="text"
                  value={settings.company_code}
                  onChange={(e) => setSettings({ ...settings, company_code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono"
                  placeholder="e.g., MRT"
                  maxLength={5}
                />
                <p className="text-xs text-slate-400 mt-1">Used as prefix in document numbers</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={settings.admin_email}
                    onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="admin@company.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Document Settings */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Document Settings</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Default Document Expiry (Years)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={settings.default_expiry_years}
                    onChange={(e) => setSettings({ ...settings, default_expiry_years: parseInt(e.target.value) || 3 })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    min={1}
                    max={10}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Documents will expire this many years after approval</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reminder Days Before Deadline
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={settings.reminder_days_before}
                    onChange={(e) => setSettings({ ...settings, reminder_days_before: parseInt(e.target.value) || 3 })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    min={1}
                    max={30}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Send reminders this many days before target date</p>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="card p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Notification Settings</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">Email Notifications</p>
                  <p className="text-sm text-slate-500">Send email notifications for document events</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enable_email_notifications}
                    onChange={(e) => setSettings({ ...settings, enable_email_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-slate-700">Assignment Notifications</span>
                  </div>
                  <p className="text-xs text-slate-500">Notify users when assigned as reviewer/approver</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-slate-700">Status Change Notifications</span>
                  </div>
                  <p className="text-xs text-slate-500">Notify when document status changes</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-slate-700">Deadline Reminders</span>
                  </div>
                  <p className="text-xs text-slate-500">Send reminders before document deadlines</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-slate-700">Expiry Reminders</span>
                  </div>
                  <p className="text-xs text-slate-500">Notify before documents expire</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
