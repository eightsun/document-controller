'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Hash,
  Loader2,
  MessageSquare,
  Send,
  ClipboardCheck,
  Info
} from 'lucide-react'
import {
  assignDocumentNumber,
  completeReview,
  approveDocument,
  rejectDocument,
  addComment
} from './actions'

// ============================================================================
// Types
// ============================================================================
interface DocumentData {
  id: string
  document_number: string
  title: string
  description: string | null
  status: string
  version: string
  target_approval_date: string | null
  effective_date: string | null
  draft_link: string | null
  created_at: string
  document_type_name: string | null
  document_type_code: string | null
  department_name: string | null
  department_code: string | null
  created_by_name: string | null
  notes: string | null
}

interface Assignment {
  id: string
  user_id: string
  role_type: string
  sequence_order: number
  is_completed: boolean
  completed_at: string | null
  due_date: string | null
  assignment_notes: string | null
  profiles: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

interface TimelineEntry {
  id: string
  event_type: string
  event_title: string
  event_description: string | null
  created_at: string
  performed_by: string | null
}

interface Comment {
  id: string
  comment: string
  comment_type: string
  created_at: string
  profiles: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

interface Department {
  id: string
  name: string
  code: string | null
}

interface DocumentDetailProps {
  document: DocumentData
  assignments: Assignment[]
  affectedDepartments: (Department | null)[]
  timeline: TimelineEntry[]
  comments: Comment[]
  currentUser: {
    id: string
    roles: string[]
  }
}

// ============================================================================
// Helper Components
// ============================================================================
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Initiation': 'bg-amber-100 text-amber-700 border-amber-200',
    'SME Review': 'bg-blue-100 text-blue-700 border-blue-200',
    'BPM Review': 'bg-purple-100 text-purple-700 border-purple-200',
    'Pending Approval': 'bg-orange-100 text-orange-700 border-orange-200',
    'Approved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Rejected': 'bg-red-100 text-red-700 border-red-200',
    'Revision': 'bg-slate-100 text-slate-700 border-slate-200',
  }
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${colors[status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {status}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    'Submitter': 'bg-blue-100 text-blue-700',
    'SME': 'bg-amber-100 text-amber-700',
    'BPM': 'bg-purple-100 text-purple-700',
    'Approver': 'bg-emerald-100 text-emerald-700',
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[role] || 'bg-slate-100 text-slate-700'}`}>
      {role}
    </span>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        {children}
      </div>
    </div>
  )
}

function AssignmentRow({ assignment, disabled }: { assignment: Assignment; disabled?: boolean }) {
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      disabled ? 'bg-slate-50 border-slate-200 opacity-60' :
      assignment.is_completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
          assignment.is_completed ? 'bg-emerald-500' : 'bg-slate-400'
        }`}>
          {assignment.is_completed ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            (assignment.profiles?.full_name || assignment.profiles?.email || '?')[0].toUpperCase()
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">
            {assignment.profiles?.full_name || assignment.profiles?.email || 'Unknown'}
          </p>
          <div className="flex items-center gap-2">
            <RoleBadge role={assignment.role_type} />
            {assignment.is_completed && assignment.completed_at && (
              <span className="text-xs text-emerald-600">
                Completed {formatDateTime(assignment.completed_at)}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {assignment.assignment_notes && (
        <div className="max-w-xs">
          <p className="text-xs text-slate-500 italic truncate" title={assignment.assignment_notes}>
            &quot;{assignment.assignment_notes}&quot;
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================
export default function DocumentDetail({
  document,
  assignments,
  affectedDepartments,
  timeline,
  comments,
  currentUser,
}: DocumentDetailProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Document Number Assignment
  const [showDocNumberModal, setShowDocNumberModal] = useState(false)
  const [manualDocNumber, setManualDocNumber] = useState('')
  
  // Review/Approve modals
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  
  // Comments
  const [newComment, setNewComment] = useState('')

  // Check user permissions
  const isAdmin = currentUser.roles.includes('Admin')
  const isBPM = currentUser.roles.includes('BPM')
  const canAssignDocNumber = (isAdmin || isBPM) && document.document_number.startsWith('PENDING-')
  
  // Get user's assignments
  const myAssignments = assignments.filter(a => a.user_id === currentUser.id)
  const myPendingReviews = myAssignments.filter(
    a => !a.is_completed && (a.role_type === 'SME' || a.role_type === 'BPM')
  )
  const myPendingApprovals = myAssignments.filter(
    a => !a.is_completed && a.role_type === 'Approver'
  )
  
  // Check if all reviewers completed (for approvers)
  const allReviewersCompleted = assignments
    .filter(a => a.role_type === 'SME' || a.role_type === 'BPM')
    .every(a => a.is_completed)
  
  // Group assignments by role
  const assignmentsByRole = {
    submitters: assignments.filter(a => a.role_type === 'Submitter'),
    sme: assignments.filter(a => a.role_type === 'SME'),
    bpm: assignments.filter(a => a.role_type === 'BPM'),
    approvers: assignments.filter(a => a.role_type === 'Approver'),
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
  
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const showMessage = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccess(message)
      setError(null)
    } else {
      setError(message)
      setSuccess(null)
    }
    setTimeout(() => { setSuccess(null); setError(null) }, 5000)
  }

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleAssignDocNumber = async (autoGenerate: boolean) => {
    setIsLoading(true)
    try {
      const result = await assignDocumentNumber(
        document.id,
        autoGenerate ? undefined : manualDocNumber
      )
      if (result.success) {
        showMessage('success', result.message || 'Document number assigned')
        setShowDocNumberModal(false)
        setManualDocNumber('')
        router.refresh()
      } else {
        showMessage('error', result.error || 'Failed to assign document number')
      }
    } catch {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteReview = async () => {
    if (!selectedAssignment) return
    setIsLoading(true)
    try {
      const result = await completeReview(document.id, selectedAssignment.id, reviewComment)
      if (result.success) {
        showMessage('success', result.message || 'Review completed')
        setShowReviewModal(false)
        setSelectedAssignment(null)
        setReviewComment('')
        router.refresh()
      } else {
        showMessage('error', result.error || 'Failed to complete review')
      }
    } catch {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedAssignment) return
    setIsLoading(true)
    try {
      const result = await approveDocument(document.id, selectedAssignment.id, reviewComment)
      if (result.success) {
        showMessage('success', result.message || 'Document approved')
        setShowApproveModal(false)
        setSelectedAssignment(null)
        setReviewComment('')
        router.refresh()
      } else {
        showMessage('error', result.error || 'Failed to approve')
      }
    } catch {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedAssignment || !rejectReason.trim()) return
    setIsLoading(true)
    try {
      const result = await rejectDocument(document.id, selectedAssignment.id, rejectReason)
      if (result.success) {
        showMessage('success', result.message || 'Document rejected')
        setShowRejectModal(false)
        setSelectedAssignment(null)
        setRejectReason('')
        router.refresh()
      } else {
        showMessage('error', result.error || 'Failed to reject')
      }
    } catch {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setIsLoading(true)
    try {
      const result = await addComment(document.id, newComment)
      if (result.success) {
        setNewComment('')
        router.refresh()
      } else {
        showMessage('error', result.error || 'Failed to add comment')
      }
    } catch {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alert Messages */}
      {(error || success) && (
        <div className={`px-4 py-3 rounded-lg flex items-center gap-3 ${
          error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          {error ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <p className="text-sm font-medium">{error || success}</p>
          <button onClick={() => { setError(null); setSuccess(null) }} className="ml-auto">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/documents"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Documents
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{document.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {document.document_number.startsWith('PENDING-') ? (
              <span className="text-amber-600 italic text-sm">Pending Verification</span>
            ) : (
              <span className="font-mono text-sm text-slate-600">{document.document_number}</span>
            )}
            <StatusBadge status={document.status} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Assign Document Number Button (BPM/Admin only) */}
          {canAssignDocNumber && (
            <button
              onClick={() => setShowDocNumberModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
            >
              <Hash className="h-4 w-4" />
              Assign Doc Number
            </button>
          )}

          {/* Complete Review Button */}
          {myPendingReviews.length > 0 && (
            <button
              onClick={() => {
                setSelectedAssignment(myPendingReviews[0])
                setShowReviewModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <ClipboardCheck className="h-4 w-4" />
              Complete Review
            </button>
          )}

          {/* Approve/Reject Buttons (only if all reviewers completed) */}
          {myPendingApprovals.length > 0 && allReviewersCompleted && (
            <>
              <button
                onClick={() => {
                  setSelectedAssignment(myPendingApprovals[0])
                  setShowApproveModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
              <button
                onClick={() => {
                  setSelectedAssignment(myPendingApprovals[0])
                  setShowRejectModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </>
          )}

          {/* SharePoint Link */}
          {document.draft_link && (
            
              href={document.draft_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open in SharePoint
            </a>
          )}
        </div>
      </div>

      {/* Waiting for Reviewers Notice (for Approvers) */}
      {myPendingApprovals.length > 0 && !allReviewersCompleted && (
        <div className="px-4 py-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-start gap-3">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Waiting for Reviewers</p>
            <p className="text-sm text-amber-600">
              You cannot approve or reject this document until all reviewers (SME and BPM) have completed their review.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Document Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-500" />
              Document Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Document Type</label>
                <p className="mt-1 text-sm text-slate-800">
                  {document.document_type_name || '—'}
                  {document.document_type_code && (
                    <span className="ml-2 text-xs text-slate-500">({document.document_type_code})</span>
                  )}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Owning Department</label>
                <p className="mt-1 text-sm text-slate-800 flex items-center gap-1">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {document.department_name || '—'}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Version</label>
                <p className="mt-1 text-sm text-slate-800">{document.version}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Created By</label>
                <p className="mt-1 text-sm text-slate-800">{document.created_by_name || '—'}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Target Approval Date</label>
                <p className="mt-1 text-sm text-slate-800 flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {formatDate(document.target_approval_date)}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Created At</label>
                <p className="mt-1 text-sm text-slate-800">{formatDateTime(document.created_at)}</p>
              </div>
            </div>

            {document.description && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Description</label>
                <p className="mt-1 text-sm text-slate-700">{document.description}</p>
              </div>
            )}
          </div>

          {/* Affected Departments */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary-500" />
              Affected Departments
            </h2>

            <div className="flex flex-wrap gap-2">
              {affectedDepartments.filter(Boolean).length > 0 ? (
                affectedDepartments.filter(Boolean).map((dept) => (
                  <span
                    key={dept!.id}
                    className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm"
                  >
                    {dept!.name}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No affected departments specified</p>
              )}
            </div>
          </div>

          {/* Assignments */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-500" />
              Assignments & Review Status
            </h2>

            <div className="space-y-6">
              {/* Submitters */}
              {assignmentsByRole.submitters.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">Submitters (MQS Reps)</h3>
                  <div className="space-y-2">
                    {assignmentsByRole.submitters.map((a) => (
                      <AssignmentRow key={a.id} assignment={a} />
                    ))}
                  </div>
                </div>
              )}

              {/* SME Reviewers */}
              {assignmentsByRole.sme.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">SME Reviewers</h3>
                  <div className="space-y-2">
                    {assignmentsByRole.sme.map((a) => (
                      <AssignmentRow key={a.id} assignment={a} />
                    ))}
                  </div>
                </div>
              )}

              {/* BPM Reviewers */}
              {assignmentsByRole.bpm.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">BPM Reviewers</h3>
                  <div className="space-y-2">
                    {assignmentsByRole.bpm.map((a) => (
                      <AssignmentRow key={a.id} assignment={a} />
                    ))}
                  </div>
                </div>
              )}

              {/* Approvers */}
              {assignmentsByRole.approvers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">Approvers</h3>
                  {!allReviewersCompleted && (
                    <p className="text-xs text-amber-600 mb-2 italic">
                      Approvers can act after all reviewers complete
                    </p>
                  )}
                  <div className="space-y-2">
                    {assignmentsByRole.approvers.map((a) => (
                      <AssignmentRow key={a.id} assignment={a} disabled={!allReviewersCompleted} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary-500" />
              Comments
            </h2>

            {/* Add Comment */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                disabled={isLoading || !newComment.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-800">
                        {comment.profiles?.full_name || comment.profiles?.email || 'Unknown'}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        comment.comment_type === 'Review' ? 'bg-blue-100 text-blue-700' :
                        comment.comment_type === 'Approval' ? 'bg-emerald-100 text-emerald-700' :
                        comment.comment_type === 'Rejection' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {comment.comment_type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{comment.comment}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic text-center py-4">No comments yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Timeline */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-500" />
              Timeline
            </h2>

            <div className="relative">
              {timeline.length > 0 ? (
                <div className="space-y-4">
                  {timeline.map((entry, index) => (
                    <div key={entry.id} className="relative pl-6">
                      {index < timeline.length - 1 && (
                        <div className="absolute left-[9px] top-6 w-0.5 h-full bg-slate-200"></div>
                      )}
                      <div className={`absolute left-0 top-1 w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                        entry.event_type === 'Created' ? 'bg-blue-100' :
                        entry.event_type === 'Reviewed' ? 'bg-amber-100' :
                        entry.event_type === 'Approved' ? 'bg-emerald-100' :
                        entry.event_type === 'Rejected' ? 'bg-red-100' :
                        'bg-slate-100'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          entry.event_type === 'Created' ? 'bg-blue-500' :
                          entry.event_type === 'Reviewed' ? 'bg-amber-500' :
                          entry.event_type === 'Approved' ? 'bg-emerald-500' :
                          entry.event_type === 'Rejected' ? 'bg-red-500' :
                          'bg-slate-500'
                        }`}></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{entry.event_title}</p>
                        {entry.event_description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{entry.event_description}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">{formatDateTime(entry.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic text-center py-4">No timeline entries</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================================== */}
      {/* MODALS */}
      {/* ======================================================================== */}

      {/* Assign Document Number Modal */}
      {showDocNumberModal && (
        <Modal onClose={() => setShowDocNumberModal(false)}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Hash className="h-5 w-5 text-purple-500" />
              Assign Document Number
            </h3>
            
            <p className="text-sm text-slate-600 mb-4">
              You can auto-generate a document number or enter one manually.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Manual Document Number (Optional)
                </label>
                <input
                  type="text"
                  value={manualDocNumber}
                  onChange={(e) => setManualDocNumber(e.target.value.toUpperCase())}
                  placeholder="e.g., MRT-AST-PLC-001"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">Format: XXX-XXX-XXX-NNN</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAssignDocNumber(true)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Auto-Generate'}
                </button>
                <button
                  onClick={() => handleAssignDocNumber(false)}
                  disabled={isLoading || !manualDocNumber.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Use Manual
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Complete Review Modal */}
      {showReviewModal && selectedAssignment && (
        <Modal onClose={() => { setShowReviewModal(false); setSelectedAssignment(null); setReviewComment('') }}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-500" />
              Complete Review
            </h3>
            
            <p className="text-sm text-slate-600 mb-4">
              Add your review comments (optional) and mark your review as complete.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Review Comments
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Enter your review comments..."
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowReviewModal(false); setSelectedAssignment(null); setReviewComment('') }}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteReview}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Complete Review'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedAssignment && (
        <Modal onClose={() => { setShowApproveModal(false); setSelectedAssignment(null); setReviewComment('') }}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Approve Document
            </h3>
            
            <p className="text-sm text-slate-600 mb-4">
              Add approval comments (optional) and approve this document.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Approval Comments
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Enter your approval comments..."
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowApproveModal(false); setSelectedAssignment(null); setReviewComment('') }}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Approve'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedAssignment && (
        <Modal onClose={() => { setShowRejectModal(false); setSelectedAssignment(null); setRejectReason('') }}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Reject Document
            </h3>
            
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejecting this document.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                rows={4}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowRejectModal(false); setSelectedAssignment(null); setRejectReason('') }}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Reject Document'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
