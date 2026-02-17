import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Users,
  Building2,
  CalendarClock,
  ClipboardCheck,
  XCircle,
  Ban,
  Lock,
  TrendingUp,
  PieChart
} from 'lucide-react'
import DashboardCharts from './DashboardCharts'

export const metadata = {
  title: 'Dashboard | Document Controller',
  description: 'Document management dashboard with statistics',
}

interface StatusCount {
  status: string
  count: number
}

interface DepartmentStats {
  department_id: string
  department_name: string
  department_code: string
  draft_count: number
  valid_count: number
  expired_count: number
  published_count: number
  total_count: number
}

interface ExpiringDocument {
  id: string
  document_number: string
  title: string
  department_name: string
  expiry_date: string
  days_until_expiry: number
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const future90Str = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Run ALL queries in parallel for maximum performance
  const [
    profileResult,
    statusCountsResult,
    deptStatsResult,
    expiringDocsResult,
    myPendingReviewsResult,
    myPendingApprovalsResult,
    recentDocumentsResult,
    // Get all documents for monthly trend calculation
    allDocsResult,
  ] = await Promise.all([
    // Profile
    supabase.from('profiles').select('full_name').eq('id', user?.id).single(),
    
    // Try SQL function for status counts
    supabase.rpc('get_document_status_counts'),
    
    // Try SQL function for department stats
    supabase.rpc('get_department_document_stats'),
    
    // Try SQL function for expiring documents
    supabase.rpc('get_expiring_documents', { days_ahead: 90 }),
    
    // My pending reviews
    supabase.from('document_assignments')
      .select('document_id')
      .eq('user_id', user?.id)
      .eq('role_type', 'reviewer')
      .eq('is_completed', false),
    
    // My pending approvals
    supabase.from('document_assignments')
      .select('document_id, documents!inner(status)')
      .eq('user_id', user?.id)
      .eq('role_type', 'approver')
      .eq('is_completed', false)
      .eq('documents.status', 'Waiting Approval'),
    
    // Recent documents
    supabase.from('documents_with_details')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
    
    // All documents for stats (if SQL functions fail)
    supabase.from('documents')
      .select('id, status, department_id, expiry_date, created_at, approved_at'),
  ])

  const profile = profileResult.data
  const myPendingReviews = myPendingReviewsResult.data
  const myPendingApprovals = myPendingApprovalsResult.data
  const recentDocuments = recentDocumentsResult.data

  // Process status counts
  let statusCounts: StatusCount[] = []
  if (statusCountsResult.data && !statusCountsResult.error) {
    statusCounts = (statusCountsResult.data || []).map((s: { status: string; count: string | number }) => ({
      status: s.status,
      count: typeof s.count === 'string' ? parseInt(s.count, 10) : s.count
    }))
  } else {
    // Fallback: calculate from all docs
    const allDocs = allDocsResult.data || []
    const statusMap: Record<string, number> = {}
    allDocs.forEach((d: { status: string }) => {
      statusMap[d.status] = (statusMap[d.status] || 0) + 1
    })
    const statusOrder = ['Initiation', 'Review', 'Waiting Approval', 'Approved', 'Closed', 'Rejected', 'Cancel']
    statusCounts = statusOrder.map(status => ({ status, count: statusMap[status] || 0 })).filter(s => s.count > 0)
  }

  // Process department stats
  let departmentStats: DepartmentStats[] = []
  if (deptStatsResult.data && !deptStatsResult.error) {
    departmentStats = (deptStatsResult.data || []).map((d: Record<string, unknown>) => ({
      department_id: d.department_id as string,
      department_name: d.department_name as string,
      department_code: (d.department_code as string) || '',
      draft_count: typeof d.draft_count === 'string' ? parseInt(d.draft_count, 10) : (d.draft_count as number) || 0,
      valid_count: typeof d.valid_count === 'string' ? parseInt(d.valid_count, 10) : (d.valid_count as number) || 0,
      expired_count: typeof d.expired_count === 'string' ? parseInt(d.expired_count, 10) : (d.expired_count as number) || 0,
      published_count: typeof d.published_count === 'string' ? parseInt(d.published_count, 10) : (d.published_count as number) || 0,
      total_count: typeof d.total_count === 'string' ? parseInt(d.total_count, 10) : (d.total_count as number) || 0,
    }))
  } else {
    // Fallback: calculate from all docs + fetch departments
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name, code')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name')
    
    const allDocs = allDocsResult.data || []
    const deptMap: Record<string, DepartmentStats> = {}
    
    ;(departments || []).forEach((dept: { id: string; name: string; code: string | null }) => {
      deptMap[dept.id] = {
        department_id: dept.id,
        department_name: dept.name,
        department_code: dept.code || '',
        draft_count: 0,
        valid_count: 0,
        expired_count: 0,
        published_count: 0,
        total_count: 0,
      }
    })
    
    allDocs.forEach((doc: { department_id: string; status: string; expiry_date: string | null }) => {
      if (!doc.department_id || !deptMap[doc.department_id]) return
      const dept = deptMap[doc.department_id]
      dept.total_count++
      
      if (['Initiation', 'Review', 'Waiting Approval'].includes(doc.status)) {
        dept.draft_count++
      }
      if (['Approved', 'Closed'].includes(doc.status)) {
        dept.published_count++
        if (doc.expiry_date && doc.expiry_date < todayStr) {
          dept.expired_count++
        } else {
          dept.valid_count++
        }
      }
    })
    
    departmentStats = Object.values(deptMap).filter(d => d.total_count > 0)
  }

  // Process expiring documents
  let expiringDocuments: ExpiringDocument[] = []
  if (expiringDocsResult.data && !expiringDocsResult.error) {
    expiringDocuments = (expiringDocsResult.data || []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      document_number: d.document_number as string,
      title: d.title as string,
      department_name: (d.department_name as string) || '',
      expiry_date: d.expiry_date as string,
      days_until_expiry: typeof d.days_until_expiry === 'string' ? parseInt(d.days_until_expiry, 10) : (d.days_until_expiry as number),
    }))
  } else {
    // Fallback
    const { data: expDocs } = await supabase
      .from('documents_with_details')
      .select('id, document_number, title, department_name, expiry_date')
      .in('status', ['Approved', 'Closed'])
      .gte('expiry_date', todayStr)
      .lte('expiry_date', future90Str)
      .order('expiry_date')
      .limit(10)
    
    expiringDocuments = (expDocs || []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      document_number: d.document_number as string,
      title: d.title as string,
      department_name: d.department_name as string || '',
      expiry_date: d.expiry_date as string,
      days_until_expiry: Math.ceil((new Date(d.expiry_date as string).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }))
  }

  // Calculate monthly trend from allDocs (no additional queries)
  const monthlyTrend: { month: string; created: number; approved: number }[] = []
  const allDocs = allDocsResult.data || []
  
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    
    const createdCount = allDocs.filter((d: { created_at: string }) => {
      const createdDate = new Date(d.created_at)
      return createdDate >= monthStart && createdDate <= monthEnd
    }).length
    
    const approvedCount = allDocs.filter((d: { approved_at: string | null }) => {
      if (!d.approved_at) return false
      const approvedDate = new Date(d.approved_at)
      return approvedDate >= monthStart && approvedDate <= monthEnd
    }).length
    
    monthlyTrend.push({ month: monthLabel, created: createdCount, approved: approvedCount })
  }

  // Calculate totals from status counts
  const getStatusCount = (status: string) => statusCounts.find(s => s.status === status)?.count || 0
  const totalDocs = statusCounts.reduce((sum, s) => sum + s.count, 0)
  const draftDocs = getStatusCount('Initiation') + getStatusCount('Review') + getStatusCount('Waiting Approval')
  const approvedDocs = getStatusCount('Approved')
  const closedDocs = getStatusCount('Closed')

  // Calculate valid and expired from department stats
  const totalValid = departmentStats.reduce((sum, d) => sum + d.valid_count, 0)
  const totalExpired = departmentStats.reduce((sum, d) => sum + d.expired_count, 0)

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
      'Closed': 'bg-indigo-100 text-indigo-700',
      'Cancel': 'bg-slate-100 text-slate-500',
    }
    return styles[status] || 'bg-slate-100 text-slate-700'
  }

  const getStatusIcon = (status: string) => {
    const icons: Record<string, typeof FileText> = {
      'Initiation': Clock,
      'Review': ClipboardCheck,
      'Waiting Approval': Clock,
      'Approved': CheckCircle,
      'Closed': Lock,
      'Rejected': XCircle,
      'Cancel': Ban,
    }
    return icons[status] || FileText
  }

  // Prepare chart data
  const statusChartData = statusCounts.map(s => ({
    name: s.status,
    value: s.count,
    color: {
      'Initiation': '#f59e0b',
      'Review': '#3b82f6',
      'Waiting Approval': '#f97316',
      'Approved': '#10b981',
      'Closed': '#6366f1',
      'Rejected': '#ef4444',
      'Cancel': '#64748b',
    }[s.status] || '#94a3b8'
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {profile?.full_name || user?.email?.split('@')[0]}! 👋
        </h1>
        <p className="text-white/80">
          Here&apos;s your document management overview.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Link href="/dashboard/documents" className="card p-4 card-hover text-center">
          <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-800">{totalDocs}</p>
          <p className="text-xs text-slate-500">Total</p>
        </Link>
        <Link href="/dashboard/documents?status=Initiation" className="card p-4 card-hover text-center">
          <Clock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-800">{draftDocs}</p>
          <p className="text-xs text-slate-500">Draft</p>
        </Link>
        <div className="card p-4 text-center">
          <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-800">{totalValid}</p>
          <p className="text-xs text-slate-500">Valid</p>
        </div>
        <Link href="/dashboard/documents?tab=expired" className="card p-4 card-hover text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-800">{totalExpired}</p>
          <p className="text-xs text-slate-500">Expired</p>
        </Link>
        <div className="card p-4 text-center">
          <Lock className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-800">{closedDocs}</p>
          <p className="text-xs text-slate-500">Closed</p>
        </div>
        <Link href="/dashboard/documents?tab=expiring" className="card p-4 card-hover text-center">
          <CalendarClock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-800">{expiringDocuments.length}</p>
          <p className="text-xs text-slate-500">Expiring</p>
        </Link>
      </div>

      {/* Alert for expired documents */}
      {totalExpired > 0 && (
        <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{totalExpired} Expired Document{totalExpired !== 1 ? 's' : ''}</p>
            <p className="text-sm">These documents have passed their expiry date and need revision.</p>
          </div>
          <Link href="/dashboard/documents?tab=expired" className="text-sm font-medium hover:underline">
            View →
          </Link>
        </div>
      )}

      {/* My Tasks + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Pending Tasks */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary-500" />
            My Tasks
          </h2>
          <div className="space-y-3">
            <Link 
              href="/dashboard/documents?tab=review"
              className="flex items-center justify-between p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium text-slate-700">To Review</span>
              </div>
              <span className="text-xl font-bold text-amber-600">{myPendingReviews?.length || 0}</span>
            </Link>
            <Link 
              href="/dashboard/documents?tab=approval"
              className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">To Approve</span>
              </div>
              <span className="text-xl font-bold text-emerald-600">{myPendingApprovals?.length || 0}</span>
            </Link>
          </div>
          {(myPendingReviews?.length || 0) === 0 && (myPendingApprovals?.length || 0) === 0 && (
            <div className="mt-4 text-center py-4 bg-slate-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs text-slate-500">All caught up!</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card p-6 lg:col-span-2">
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
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary-500" />
            Status Distribution
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {statusCounts.map((s) => {
              const Icon = getStatusIcon(s.status)
              return (
                <div key={s.status} className={`p-3 rounded-lg ${getStatusBadge(s.status).replace('text-', 'bg-').split(' ')[0]}/30`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${getStatusBadge(s.status).split(' ')[1]}`} />
                      <span className="text-sm font-medium text-slate-700">{s.status}</span>
                    </div>
                    <span className={`text-lg font-bold ${getStatusBadge(s.status).split(' ')[1]}`}>{s.count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            Monthly Trend (6 Months)
          </h2>
          <DashboardCharts monthlyTrend={monthlyTrend} statusData={statusChartData} />
        </div>
      </div>

      {/* Department Statistics */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-500" />
            Department Statistics
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Draft</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Valid</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Expired</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Published</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departmentStats.length > 0 ? (
                departmentStats.map((dept) => (
                  <tr key={dept.department_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-sm font-medium text-slate-800">{dept.department_name}</span>
                        {dept.department_code && (
                          <span className="text-xs text-slate-400 ml-2">({dept.department_code})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${dept.draft_count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                        {dept.draft_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${dept.valid_count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {dept.valid_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${dept.expired_count > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400'}`}>
                        {dept.expired_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${dept.published_count > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                        {dept.published_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold bg-slate-200 text-slate-700">
                        {dept.total_count}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No department data available
                  </td>
                </tr>
              )}
            </tbody>
            {departmentStats.length > 0 && (
              <tfoot className="bg-slate-100">
                <tr>
                  <td className="px-6 py-3 text-sm font-bold text-slate-700">Total</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-amber-700">{draftDocs}</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-emerald-700">{totalValid}</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-red-700">{totalExpired}</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-indigo-700">{approvedDocs + closedDocs}</td>
                  <td className="px-6 py-3 text-center text-sm font-bold text-slate-800">{totalDocs}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Expiring Documents + Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Documents */}
        <div className="card overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-orange-500" />
                Expiring Soon
              </h2>
              <Link href="/dashboard/documents?tab=expiring" className="text-sm font-medium text-primary-500 hover:text-primary-600">
                View all →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {expiringDocuments.length > 0 ? (
              expiringDocuments.slice(0, 5).map((doc) => (
                <Link key={doc.id} href={`/dashboard/documents/${doc.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                      <p className="text-xs text-slate-500">{doc.department_name}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        doc.days_until_expiry <= 30 ? 'bg-red-100 text-red-700' : 
                        doc.days_until_expiry <= 60 ? 'bg-orange-100 text-orange-700' : 
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {doc.days_until_expiry} days
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No documents expiring soon</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="card overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />
                Recent Documents
              </h2>
              <Link href="/dashboard/documents" className="text-sm font-medium text-primary-500 hover:text-primary-600">
                View all →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {recentDocuments && recentDocuments.length > 0 ? (
              recentDocuments.map((doc: Record<string, unknown>) => (
                <Link key={doc.id as string} href={`/dashboard/documents/${doc.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.title as string}</p>
                      <p className="text-xs text-slate-500">{doc.department_name as string || '—'}</p>
                    </div>
                    <span className={`ml-4 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(doc.status as string)}`}>
                      {doc.status as string}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No documents yet</p>
                <Link href="/dashboard/documents/new" className="text-sm text-primary-500 hover:underline mt-2 inline-block">
                  Create your first document →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
