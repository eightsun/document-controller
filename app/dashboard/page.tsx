import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Plus,
  Users,
  Building2,
  CalendarClock,
  ClipboardCheck
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id)
    .single()

  // Get document statistics
  const now = new Date()
  const future90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  // Total documents
  const { count: totalDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })

  // Pending my review
  const { data: myPendingReviews } = await supabase
    .from('document_assignments')
    .select('document_id')
    .eq('user_id', user?.id)
    .eq('role_type', 'reviewer')
    .eq('is_completed', false)

  // Pending my approval
  const { data: myPendingApprovals } = await supabase
    .from('document_assignments')
    .select('document_id, documents!inner(status)')
    .eq('user_id', user?.id)
    .eq('role_type', 'approver')
    .eq('is_completed', false)
    .eq('documents.status', 'Waiting Approval')

  // Approved documents
  const { count: approvedDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Approved')

  // Expiring soon (within 90 days)
  const { count: expiringDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Approved')
    .gte('expiry_date', now.toISOString().split('T')[0])
    .lte('expiry_date', future90.toISOString().split('T')[0])

  // Expired documents
  const { count: expiredDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Approved')
    .lt('expiry_date', now.toISOString().split('T')[0])

  const stats = [
    {
      title: 'Total Documents',
      value: totalDocs?.toString() || '0',
      subtitle: 'All documents in system',
      icon: FileText,
      color: 'bg-blue-500',
      href: '/dashboard/documents',
    },
    {
      title: 'Pending My Review',
      value: myPendingReviews?.length?.toString() || '0',
      subtitle: 'Awaiting your review',
      icon: ClipboardCheck,
      color: 'bg-amber-500',
      href: '/dashboard/documents?tab=review',
    },
    {
      title: 'Pending My Approval',
      value: myPendingApprovals?.length?.toString() || '0',
      subtitle: 'Awaiting your approval',
      icon: CheckCircle,
      color: 'bg-emerald-500',
      href: '/dashboard/documents?tab=approval',
    },
    {
      title: 'Expiring Soon',
      value: (expiringDocs || 0).toString(),
      subtitle: 'Within 90 days',
      icon: CalendarClock,
      color: 'bg-orange-500',
      href: '/dashboard/documents?tab=expiring',
    },
  ]

  // Recent documents
  const { data: recentDocuments } = await supabase
    .from('documents_with_details')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  const quickActions = [
    { title: 'New Document', icon: Plus, color: 'bg-primary-500', href: '/dashboard/documents/new' },
    { title: 'All Documents', icon: FileText, color: 'bg-blue-500', href: '/dashboard/documents' },
    { title: 'Manage Users', icon: Users, color: 'bg-amber-500', href: '/dashboard/users' },
    { title: 'Departments', icon: Building2, color: 'bg-purple-500', href: '/dashboard/departments' },
  ]

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Approved': 'bg-emerald-100 text-emerald-700',
      'Waiting Approval': 'bg-orange-100 text-orange-700',
      'Review': 'bg-blue-100 text-blue-700',
      'Initiation': 'bg-amber-100 text-amber-700',
      'Rejected': 'bg-red-100 text-red-700',
      'Closed': 'bg-slate-100 text-slate-700',
    }
    return styles[status] || 'bg-slate-100 text-slate-700'
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {profile?.full_name || user?.email?.split('@')[0]}! 👋
        </h1>
        <p className="text-white/80">
          Here&apos;s what&apos;s happening with your documents today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Link
            key={index}
            href={stat.href}
            className="card p-6 card-hover"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{stat.value}</p>
                <p className="text-sm mt-2 text-slate-500">
                  {stat.subtitle}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Alert for expired documents */}
      {(expiredDocs || 0) > 0 && (
        <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{expiredDocs} Expired Document{expiredDocs !== 1 ? 's' : ''}</p>
            <p className="text-sm">These documents have passed their expiry date and need revision.</p>
          </div>
          <Link href="/dashboard/documents?tab=expired" className="text-sm font-medium hover:underline">
            View →
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="flex flex-col items-center p-4 rounded-xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all group"
            >
              <div className={`${action.color} p-3 rounded-xl mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">{action.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent documents table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Recent Documents</h2>
            <Link
              href="/dashboard/documents"
              className="text-sm font-medium text-primary-500 hover:text-primary-600"
            >
              View all →
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentDocuments && recentDocuments.length > 0 ? (
                recentDocuments.map((doc: Record<string, unknown>) => (
                  <tr key={doc.id as string} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/documents/${doc.id}`} className="block group">
                        <span className="text-sm font-medium text-slate-800 group-hover:text-primary-600">
                          {doc.title as string}
                        </span>
                        <span className="block text-xs text-slate-500 font-mono mt-0.5">
                          {(doc.document_number as string)?.startsWith('PENDING-') 
                            ? 'Pending Verification'
                            : doc.document_number as string}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{doc.department_name as string || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(doc.status as string)}`}>
                        {doc.status as string}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{formatDate(doc.created_at as string)}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No documents yet</p>
                    <Link href="/dashboard/documents/new" className="text-sm text-primary-500 hover:underline mt-2 inline-block">
                      Create your first document →
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document status breakdown */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Document Summary</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">Approved</span>
              </div>
              <span className="text-lg font-bold text-emerald-600">{approvedDocs || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-orange-500" />
                <span className="text-sm font-medium text-slate-700">Expiring Soon</span>
              </div>
              <span className="text-lg font-bold text-orange-600">{expiringDocs || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-slate-700">Expired</span>
              </div>
              <span className="text-lg font-bold text-red-600">{expiredDocs || 0}</span>
            </div>
          </div>
        </div>

        {/* My pending tasks */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">My Pending Tasks</h2>
          <div className="space-y-3">
            <Link 
              href="/dashboard/documents?tab=review"
              className="flex items-center justify-between p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium text-slate-700">Documents to Review</span>
              </div>
              <span className="text-lg font-bold text-amber-600">{myPendingReviews?.length || 0}</span>
            </Link>
            <Link 
              href="/dashboard/documents?tab=approval"
              className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">Documents to Approve</span>
              </div>
              <span className="text-lg font-bold text-emerald-600">{myPendingApprovals?.length || 0}</span>
            </Link>
          </div>
          {(myPendingReviews?.length || 0) === 0 && (myPendingApprovals?.length || 0) === 0 && (
            <div className="mt-4 text-center py-6 bg-slate-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">All caught up! No pending tasks.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
