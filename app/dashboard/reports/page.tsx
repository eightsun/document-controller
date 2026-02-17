import { createClient } from '@/utils/supabase/server'
import { 
  BarChart3, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Building2,
  TrendingUp,
  Calendar,
  Users
} from 'lucide-react'

export const metadata = {
  title: 'Reports | Document Controller',
}

export default async function ReportsPage() {
  const supabase = await createClient()

  // Fetch all statistics
  const [
    { count: totalDocs },
    { count: approvedDocs },
    { count: rejectedDocs },
    { count: pendingDocs },
    { data: departmentStats },
    { data: monthlyStats },
    { data: typeStats },
    { data: recentActivity },
  ] = await Promise.all([
    supabase.from('documents').select('*', { count: 'exact', head: true }),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'Rejected'),
    supabase.from('documents').select('*', { count: 'exact', head: true }).in('status', ['Initiation', 'Review', 'Waiting Approval']),
    // Department breakdown
    supabase.from('documents')
      .select('department_id, departments(name)')
      .not('department_id', 'is', null),
    // Monthly documents (last 6 months)
    supabase.from('documents')
      .select('created_at, status')
      .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()),
    // By document type
    supabase.from('documents')
      .select('document_type_id, document_types(name, code)')
      .not('document_type_id', 'is', null),
    // Recent timeline activity
    supabase.from('document_timeline')
      .select('*, documents(title, document_number), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // Process department stats
  const deptCounts: Record<string, number> = {}
  departmentStats?.forEach((doc: any) => {
    const name = doc.departments?.name || 'Unknown'
    deptCounts[name] = (deptCounts[name] || 0) + 1
  })
  const deptData = Object.entries(deptCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // Process document type stats
  const typeCounts: Record<string, { count: number; code: string }> = {}
  typeStats?.forEach((doc: any) => {
    const name = doc.document_types?.name || 'Unknown'
    const code = doc.document_types?.code || '???'
    if (!typeCounts[name]) typeCounts[name] = { count: 0, code }
    typeCounts[name].count++
  })
  const typeData = Object.entries(typeCounts)
    .map(([name, data]) => ({ name, count: data.count, code: data.code }))
    .sort((a, b) => b.count - a.count)

  // Process monthly stats
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyCounts: Record<string, number> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
    monthlyCounts[key] = 0
  }
  monthlyStats?.forEach((doc: any) => {
    const d = new Date(doc.created_at)
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
    if (monthlyCounts[key] !== undefined) {
      monthlyCounts[key]++
    }
  })
  const monthlyData = Object.entries(monthlyCounts).map(([month, count]) => ({ month, count }))

  // Calculate percentages
  const total = totalDocs || 1
  const approvalRate = ((approvedDocs || 0) / total * 100).toFixed(1)
  const rejectionRate = ((rejectedDocs || 0) / total * 100).toFixed(1)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
        </div>
        <p className="text-slate-500">Overview of document management statistics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-slate-400">Total</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalDocs || 0}</p>
          <p className="text-sm text-slate-500">Total Documents</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs text-emerald-600 font-medium">{approvalRate}%</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{approvedDocs || 0}</p>
          <p className="text-sm text-slate-500">Approved</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs text-red-600 font-medium">{rejectionRate}%</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{rejectedDocs || 0}</p>
          <p className="text-sm text-slate-500">Rejected</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs text-amber-600 font-medium">In Progress</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{pendingDocs || 0}</p>
          <p className="text-sm text-slate-500">Pending</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Trend */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-800">Monthly Trend (6 Months)</h2>
          </div>
          <div className="space-y-3">
            {monthlyData.map((item, idx) => {
              const maxCount = Math.max(...monthlyData.map(d => d.count), 1)
              const percentage = (item.count / maxCount) * 100
              return (
                <div key={idx} className="flex items-center gap-4">
                  <span className="text-sm text-slate-500 w-20">{item.month}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-end px-2 transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 10)}%` }}
                    >
                      <span className="text-xs font-medium text-white">{item.count}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* By Department */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-800">By Department</h2>
          </div>
          {deptData.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No data available</p>
          ) : (
            <div className="space-y-3">
              {deptData.slice(0, 6).map((item, idx) => {
                const maxCount = Math.max(...deptData.map(d => d.count), 1)
                const percentage = (item.count / maxCount) * 100
                const colors = [
                  'from-emerald-500 to-teal-500',
                  'from-blue-500 to-cyan-500',
                  'from-purple-500 to-pink-500',
                  'from-amber-500 to-orange-500',
                  'from-red-500 to-rose-500',
                  'from-slate-500 to-slate-600',
                ]
                return (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 w-24 truncate" title={item.name}>
                      {item.name}
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colors[idx % colors.length]} rounded-full flex items-center justify-end px-2 transition-all duration-500`}
                        style={{ width: `${Math.max(percentage, 15)}%` }}
                      >
                        <span className="text-xs font-medium text-white">{item.count}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Document Type */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-slate-800">By Document Type</h2>
          </div>
          {typeData.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No data available</p>
          ) : (
            <div className="space-y-3">
              {typeData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-mono rounded">
                      {item.code}
                    </span>
                    <span className="text-sm text-slate-700">{item.name}</span>
                  </div>
                  <span className="text-lg font-bold text-slate-800">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
          </div>
          {!recentActivity || recentActivity.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={`p-1.5 rounded-full ${
                    activity.event_type === 'approved' ? 'bg-emerald-100' :
                    activity.event_type === 'rejected' ? 'bg-red-100' :
                    activity.event_type === 'review_completed' ? 'bg-blue-100' :
                    'bg-slate-100'
                  }`}>
                    {activity.event_type === 'approved' ? (
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                    ) : activity.event_type === 'rejected' ? (
                      <XCircle className="w-3 h-3 text-red-600" />
                    ) : (
                      <FileText className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">
                      {activity.event_title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {activity.documents?.document_number} • {formatDate(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
