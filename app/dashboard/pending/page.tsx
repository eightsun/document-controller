import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, FileText, User, Calendar, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'Pending Review | Document Controller',
}

export default async function PendingReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get documents pending user's review
  const { data: pendingReviews } = await supabase
    .from('document_assignments')
    .select(`
      id,
      role_type,
      assigned_at,
      is_completed,
      documents (
        id,
        document_number,
        title,
        status,
        target_approval_date,
        created_at,
        profiles!documents_created_by_fkey (full_name, email),
        departments (name)
      )
    `)
    .eq('user_id', user.id)
    .eq('is_completed', false)
    .order('assigned_at', { ascending: false })

  // Separate reviews and approvals
  const reviewTasks = pendingReviews?.filter(p => p.role_type === 'reviewer') || []
  const approvalTasks = pendingReviews?.filter(p => p.role_type === 'approver') || []

  // Filter approval tasks to only show documents in "Waiting Approval" status
  const activeApprovalTasks = approvalTasks.filter(
    t => (t.documents as any)?.status === 'Waiting Approval'
  )

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getDaysRemaining = (targetDate: string | null) => {
    if (!targetDate) return null
    const target = new Date(targetDate)
    const today = new Date()
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Pending Tasks</h1>
        </div>
        <p className="text-slate-500">Documents waiting for your review or approval</p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="card p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">To Review</p>
              <p className="text-3xl font-bold text-slate-800">{reviewTasks.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="card p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">To Approve</p>
              <p className="text-3xl font-bold text-slate-800">{activeApprovalTasks.length}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Review Tasks */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          Documents to Review ({reviewTasks.length})
        </h2>
        
        {reviewTasks.length === 0 ? (
          <div className="card p-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-500">No documents pending your review</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviewTasks.map((task) => {
              const doc = task.documents as any
              const daysRemaining = getDaysRemaining(doc?.target_approval_date)
              const isOverdue = daysRemaining !== null && daysRemaining < 0
              const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3

              return (
                <Link
                  key={task.id}
                  href={`/dashboard/documents/${doc?.id}`}
                  className="card p-4 hover:shadow-md transition-shadow flex items-center gap-4 group"
                >
                  <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">{doc?.document_number}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        doc?.status === 'Initiation' ? 'bg-slate-100 text-slate-600' :
                        doc?.status === 'Review' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {doc?.status}
                      </span>
                    </div>
                    <p className="font-medium text-slate-800 truncate">{doc?.title}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {doc?.profiles?.full_name || doc?.profiles?.email}
                      </span>
                      <span>{doc?.departments?.name}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    {daysRemaining !== null && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        isOverdue ? 'bg-red-100 text-red-700' :
                        isUrgent ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {isOverdue ? `${Math.abs(daysRemaining)}d overdue` :
                         daysRemaining === 0 ? 'Due today' :
                         `${daysRemaining}d left`}
                      </span>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Assigned {formatDate(task.assigned_at)}
                    </p>
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 transition-colors" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Approval Tasks */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          Documents to Approve ({activeApprovalTasks.length})
        </h2>
        
        {activeApprovalTasks.length === 0 ? (
          <div className="card p-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-500">No documents pending your approval</p>
            {approvalTasks.length > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                {approvalTasks.length} document(s) assigned but still in review phase
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activeApprovalTasks.map((task) => {
              const doc = task.documents as any
              const daysRemaining = getDaysRemaining(doc?.target_approval_date)
              const isOverdue = daysRemaining !== null && daysRemaining < 0
              const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3

              return (
                <Link
                  key={task.id}
                  href={`/dashboard/documents/${doc?.id}`}
                  className="card p-4 hover:shadow-md transition-shadow flex items-center gap-4 group border-l-4 border-l-emerald-500"
                >
                  <div className="p-3 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">{doc?.document_number}</span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                        Waiting Approval
                      </span>
                    </div>
                    <p className="font-medium text-slate-800 truncate">{doc?.title}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {doc?.profiles?.full_name || doc?.profiles?.email}
                      </span>
                      <span>{doc?.departments?.name}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    {daysRemaining !== null && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        isOverdue ? 'bg-red-100 text-red-700' :
                        isUrgent ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {isOverdue ? `${Math.abs(daysRemaining)}d overdue` :
                         daysRemaining === 0 ? 'Due today' :
                         `${daysRemaining}d left`}
                      </span>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Assigned {formatDate(task.assigned_at)}
                    </p>
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
