import { createClient } from '@/utils/supabase/server'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Upload,
  Users,
  FolderOpen
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const stats = [
    {
      title: 'Total Documents',
      value: '1,284',
      change: '+12%',
      changeType: 'positive',
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'Pending Review',
      value: '23',
      change: '-5%',
      changeType: 'positive',
      icon: Clock,
      color: 'bg-amber-500',
    },
    {
      title: 'Approved This Month',
      value: '156',
      change: '+23%',
      changeType: 'positive',
      icon: CheckCircle,
      color: 'bg-emerald-500',
    },
    {
      title: 'Needs Attention',
      value: '8',
      change: '+2',
      changeType: 'negative',
      icon: AlertCircle,
      color: 'bg-red-500',
    },
  ]

  const recentDocuments = [
    { id: 'DOC-001', name: 'Q4 Financial Report', status: 'approved', date: '2024-01-15', author: 'John Doe' },
    { id: 'DOC-002', name: 'Product Specification v2.0', status: 'pending', date: '2024-01-14', author: 'Jane Smith' },
    { id: 'DOC-003', name: 'HR Policy Update', status: 'reviewing', date: '2024-01-14', author: 'Mike Johnson' },
    { id: 'DOC-004', name: 'Security Audit Report', status: 'approved', date: '2024-01-13', author: 'Sarah Wilson' },
    { id: 'DOC-005', name: 'Marketing Strategy 2024', status: 'draft', date: '2024-01-12', author: 'Tom Brown' },
  ]

  const quickActions = [
    { title: 'Upload Document', icon: Upload, color: 'bg-primary-500', href: '/dashboard/upload' },
    { title: 'View Reports', icon: TrendingUp, color: 'bg-emerald-500', href: '/dashboard/reports' },
    { title: 'Manage Users', icon: Users, color: 'bg-amber-500', href: '/dashboard/users' },
    { title: 'Categories', icon: FolderOpen, color: 'bg-purple-500', href: '/dashboard/categories' },
  ]

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      reviewing: 'bg-blue-100 text-blue-700',
      draft: 'bg-slate-100 text-slate-700',
    }
    return styles[status] || styles.draft
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.email?.split('@')[0]}! 👋
        </h1>
        <p className="text-white/80">
          Here&apos;s what&apos;s happening with your documents today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="card p-6 card-hover"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{stat.value}</p>
                <p className={`text-sm mt-2 font-medium ${
                  stat.changeType === 'positive' ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {stat.change} from last month
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <a
              key={index}
              href={action.href}
              className="flex flex-col items-center p-4 rounded-xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all group"
            >
              <div className={`${action.color} p-3 rounded-xl mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">{action.title}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Recent documents table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Recent Documents</h2>
            <a
              href="/dashboard/documents"
              className="text-sm font-medium text-primary-500 hover:text-primary-600"
            >
              View all →
            </a>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Document ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-primary-600">{doc.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-800">{doc.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{doc.author}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{doc.date}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity and Chart section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-1 card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { action: 'Document uploaded', user: 'John Doe', time: '5 min ago', color: 'bg-blue-500' },
              { action: 'Document approved', user: 'Admin', time: '1 hour ago', color: 'bg-emerald-500' },
              { action: 'Comment added', user: 'Jane Smith', time: '2 hours ago', color: 'bg-purple-500' },
              { action: 'Document updated', user: 'Mike Johnson', time: '3 hours ago', color: 'bg-amber-500' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`w-2 h-2 ${activity.color} rounded-full mt-2`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{activity.action}</p>
                  <p className="text-xs text-slate-500">
                    by {activity.user} • {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Document statistics chart placeholder */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Document Statistics</h2>
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Chart visualization will appear here</p>
              <p className="text-sm text-slate-400">Connect to your data source to see statistics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
