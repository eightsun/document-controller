'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Calendar, Building2, Users, Clock, CheckCircle, XCircle, AlertTriangle, ExternalLink, Hash, MessageSquare, Send, ClipboardCheck, Info, Pencil, CalendarClock, Star, AlertCircle as AlertIcon, ThumbsUp, ThumbsDown, Ban, Lock } from 'lucide-react'
import { assignDocumentNumber, submitReview, approveDocument, rejectDocument, addComment, updateDocument, getDocumentForEdit, getFormOptions, closeDocument, cancelDocument } from './actions'

interface DocumentData {
  id: string
  document_number: string
  title: string
  description: string | null
  status: string
  version: string
  target_approval_date: string | null
  draft_link: string | null
  created_at: string
  document_type_name: string | null
  document_type_code: string | null
  department_name: string | null
  created_by_name: string | null
  created_by: string | null
  published_at: string | null
  expiry_date: string | null
  effective_date: string | null
  rejection_reason: string | null
  closed_at: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
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
  profiles: { id: string; full_name: string | null; email: string | null } | null
}

interface Review {
  id: string
  reviewer_id: string
  review_status: string
  comments: string | null
  review_date: string
  profiles: { id: string; full_name: string | null; email: string | null } | null
}

interface Approval {
  id: string
  approver_id: string
  decision: string
  comments: string | null
  approval_date: string
  profiles: { id: string; full_name: string | null; email: string | null } | null
}

interface TimelineEntry {
  id: string
  event_type: string
  event_title: string
  event_description: string | null
  created_at: string
}

interface Comment {
  id: string
  content: string
  created_at: string
  profiles: { id: string; full_name: string | null; email: string | null } | null
}

interface Department {
  id: string
  name: string
  code: string | null
}

interface Props {
  document: DocumentData
  assignments: Assignment[]
  reviews: Review[]
  approvals: Approval[]
  affectedDepartments: (Department | null)[]
  timeline: TimelineEntry[]
  comments: Comment[]
  currentUser: { id: string; roles: string[] }
}

interface FormOptions {
  documentTypes: Array<{ id: string; name: string; code: string }>
  departments: Array<{ id: string; name: string; code: string | null }>
  users: Array<{ id: string; full_name: string | null; email: string | null }>
}

export default function DocumentDetail({ document: doc, assignments, reviews, approvals, affectedDepartments, timeline, comments, currentUser }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDocNumberModal, setShowDocNumberModal] = useState(false)
  const [manualDocNumber, setManualDocNumber] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewStatus, setReviewStatus] = useState<'submitted' | 'requested_changes' | 'approved'>('submitted')
  const [rejectReason, setRejectReason] = useState('')
  const [closeComment, setCloseComment] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [newComment, setNewComment] = useState('')

  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDocTypeId, setEditDocTypeId] = useState('')
  const [editDeptId, setEditDeptId] = useState('')
  const [editDraftLink, setEditDraftLink] = useState('')
  const [editTargetDate, setEditTargetDate] = useState('')
  const [editAffectedDepts, setEditAffectedDepts] = useState<string[]>([])
  const [editReviewerIds, setEditReviewerIds] = useState<string[]>([])
  const [editApproverIds, setEditApproverIds] = useState<string[]>([])
  const [formOptions, setFormOptions] = useState<FormOptions | null>(null)

  const isAdmin = currentUser.roles.includes('Admin')
  const isBPM = currentUser.roles.includes('BPM')
  const canEdit = isAdmin || isBPM
  const canAssignDocNumber = canEdit && doc.document_number.startsWith('PENDING-')
  const isCreator = doc.created_by === currentUser.id
  const canClose = (isAdmin || isBPM || isCreator) && doc.status === 'Approved'
  const canCancel = (isAdmin || isBPM || isCreator) && ['Initiation', 'Review', 'Waiting Approval'].includes(doc.status)
  
  const safeAssignments = assignments || []
  const safeReviews = reviews || []
  const safeApprovals = approvals || []
  const myAssignments = safeAssignments.filter(a => a.user_id === currentUser.id)
  const myPendingReviews = myAssignments.filter(a => !a.is_completed && a.role_type === 'reviewer')
  const myPendingApprovals = myAssignments.filter(a => !a.is_completed && a.role_type === 'approver')
  const reviewerAssignments = safeAssignments.filter(a => a.role_type === 'reviewer')
  const allReviewersCompleted = reviewerAssignments.length === 0 || reviewerAssignments.every(a => a.is_completed)
  const submitters = safeAssignments.filter(a => a.role_type === 'submitter')
  const reviewers = safeAssignments.filter(a => a.role_type === 'reviewer')
  const approvers = safeAssignments.filter(a => a.role_type === 'approver')

  // Calculate review progress
  const completedReviews = reviewers.filter(r => r.is_completed).length
  const totalReviewers = reviewers.length
  const reviewProgress = totalReviewers > 0 ? Math.round((completedReviews / totalReviewers) * 100) : 0

  // Check expiry status
  const isExpired = doc.expiry_date ? new Date(doc.expiry_date) < new Date() : false
  const isExpiringSoon = doc.expiry_date ? 
    new Date(doc.expiry_date) >= new Date() && 
    new Date(doc.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : false

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  
  const formatDateTime = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  
  const showMsg = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccess(msg)
      setError(null)
    } else {
      setError(msg)
      setSuccess(null)
    }
    setTimeout(() => { setSuccess(null); setError(null) }, 5000)
  }
  
  const getStatusColor = (s: string) => {
    const colors: Record<string, string> = {
      'Initiation': 'bg-amber-100 text-amber-700',
      'Review': 'bg-blue-100 text-blue-700',
      'Waiting Approval': 'bg-orange-100 text-orange-700',
      'Approved': 'bg-emerald-100 text-emerald-700',
      'Rejected': 'bg-red-100 text-red-700',
      'Closed': 'bg-indigo-100 text-indigo-700',
      'Cancel': 'bg-slate-100 text-slate-500'
    }
    return colors[s] || 'bg-slate-100 text-slate-700'
  }
  
  const getRoleColor = (r: string) => {
    const colors: Record<string, string> = {
      'submitter': 'bg-blue-100 text-blue-700',
      'reviewer': 'bg-amber-100 text-amber-700',
      'approver': 'bg-emerald-100 text-emerald-700'
    }
    return colors[r] || 'bg-slate-100 text-slate-700'
  }
  
  const getRoleLabel = (r: string) => {
    const labels: Record<string, string> = {
      'submitter': 'Submitter',
      'reviewer': 'Reviewer',
      'approver': 'Approver'
    }
    return labels[r] || r
  }

  const getReviewStatusColor = (s: string) => {
    const colors: Record<string, string> = {
      'submitted': 'bg-blue-100 text-blue-700',
      'requested_changes': 'bg-amber-100 text-amber-700',
      'approved': 'bg-emerald-100 text-emerald-700'
    }
    return colors[s] || 'bg-slate-100 text-slate-700'
  }

  const getReviewStatusLabel = (s: string) => {
    const labels: Record<string, string> = {
      'submitted': 'Reviewed',
      'requested_changes': 'Requested Changes',
      'approved': 'Approved'
    }
    return labels[s] || s
  }

  const getReviewStatusIcon = (s: string) => {
    switch (s) {
      case 'approved': return <ThumbsUp className="h-4 w-4" />
      case 'requested_changes': return <AlertIcon className="h-4 w-4" />
      default: return <ClipboardCheck className="h-4 w-4" />
    }
  }
  
  const toggleArray = (arr: string[], setArr: (v: string[]) => void, id: string) => {
    if (arr.includes(id)) {
      setArr(arr.filter(i => i !== id))
    } else {
      setArr([...arr, id])
    }
  }

  const openEditModal = async () => {
    setIsLoading(true)
    const [docResult, optionsResult] = await Promise.all([
      getDocumentForEdit(doc.id),
      getFormOptions()
    ])
    if (docResult.success && docResult.data && optionsResult.success && optionsResult.data) {
      const d = docResult.data.document
      setEditTitle(d.title)
      setEditDescription(d.description || '')
      setEditDocTypeId(d.document_type_id)
      setEditDeptId(d.department_id)
      setEditDraftLink(d.draft_link || '')
      setEditTargetDate(d.target_approval_date?.split('T')[0] || '')
      setEditAffectedDepts(docResult.data.affected_department_ids)
      setEditReviewerIds(docResult.data.reviewer_ids)
      setEditApproverIds(docResult.data.approver_ids)
      setFormOptions(optionsResult.data)
      setShowEditModal(true)
    } else {
      showMsg('error', docResult.error || optionsResult.error || 'Failed to load')
    }
    setIsLoading(false)
  }

  const handleSaveEdit = async () => {
    setIsLoading(true)
    const result = await updateDocument(doc.id, {
      title: editTitle,
      description: editDescription,
      document_type_id: editDocTypeId,
      department_id: editDeptId,
      draft_link: editDraftLink,
      target_approval_date: editTargetDate,
      affected_department_ids: editAffectedDepts,
      reviewer_ids: editReviewerIds,
      approver_ids: editApproverIds
    })
    if (result.success) {
      showMsg('success', result.message || 'Updated')
      setShowEditModal(false)
      router.refresh()
    } else {
      showMsg('error', result.error || 'Failed')
    }
    setIsLoading(false)
  }

  const handleAssignDocNum = async (auto: boolean) => {
    setIsLoading(true)
    const result = await assignDocumentNumber(doc.id, auto ? undefined : manualDocNumber)
    if (result.success) {
      showMsg('success', result.message || 'Done')
      setShowDocNumberModal(false)
      setManualDocNumber('')
      router.refresh()
    } else {
      showMsg('error', result.error || 'Failed')
    }
    setIsLoading(false)
  }

  const handleSubmitReview = async () => {
    if (!selectedAssignment) return
    setIsLoading(true)
    const result = await submitReview(doc.id, selectedAssignment.id, reviewStatus, reviewComment)
    if (result.success) {
      showMsg('success', result.message || 'Review submitted')
      setShowReviewModal(false)
      setSelectedAssignment(null)
      setReviewComment('')
      setReviewStatus('submitted')
      router.refresh()
    } else {
      showMsg('error', result.error || 'Failed')
    }
    setIsLoading(false)
  }

  const handleApproveDoc = async () => {
    if (!selectedAssignment) return
    setIsLoading(true)
    const result = await approveDocument(doc.id, selectedAssignment.id, reviewComment)
    if (result.success) {
      showMsg('success', result.message || 'Done')
      setShowApproveModal(false)
      setSelectedAssignment(null)
      setReviewComment('')
      router.refresh()
    } else {
      showMsg('error', result.error || 'Failed')
    }
    setIsLoading(false)
  }

  const handleRejectDoc = async () => {
    if (!selectedAssignment || !rejectReason.trim()) return
    setIsLoading(true)
    const result = await rejectDocument(doc.id, selectedAssignment.id, rejectReason)
    if (result.success) {
      showMsg('success', result.message || 'Done')
      setShowRejectModal(false)
      setSelectedAssignment(null)
      setRejectReason('')
      router.refresh()
    } else {
      showMsg('error', result.error || 'Failed')
    }
    setIsLoading(false)
  }

  const handleCloseDoc = async () => {
    setIsLoading(true)
    const result = await closeDocument(doc.id, closeComment)
    if (result.success) {
      showMsg('success', result.message || 'Document closed')
      setShowCloseModal(false)
      setCloseComment('')
      router.refresh()
    } else {
      showMsg('error', result.error || 'Failed')
    }
    setIsLoading(false)
  }

  const handleCancelDoc = async () => {
    if (!cancelReason.trim()) return
    setIsLoading(true)
    const result = await cancelDocument(doc.id, cancelReason)
    if (result.success) {
      showMsg('success', result.message || 'Document cancelled')
      setShowCancelModal(false)
      setCancelReason('')
      router.refresh()
    } else {
      showMsg('error', result.error || 'Failed')
    }
    setIsLoading(false)
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setIsLoading(true)
    const result = await addComment(doc.id, newComment)
    if (result.success) {
      setNewComment('')
      router.refresh()
    } else {
      showMsg('error', result.error || 'Failed')
    }
    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      {(error || success) && (
        <div className={`px-4 py-3 rounded-lg flex items-center gap-3 ${error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {error ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <p className="text-sm font-medium">{error || success}</p>
          <button onClick={() => { setError(null); setSuccess(null) }} className="ml-auto"><XCircle className="h-4 w-4" /></button>
        </div>
      )}

      {/* Expiry Warning Banner */}
      {isExpired && (
        <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Document Expired</p>
            <p className="text-sm">This document expired on {formatDate(doc.expiry_date)}. Please initiate a revision.</p>
          </div>
        </div>
      )}

      {isExpiringSoon && !isExpired && (
        <div className="px-4 py-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-start gap-3">
          <CalendarClock className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Document Expiring Soon</p>
            <p className="text-sm">This document will expire on {formatDate(doc.expiry_date)}. Consider initiating a revision.</p>
          </div>
        </div>
      )}

      {/* Cancelled Banner */}
      {doc.status === 'Cancel' && (
        <div className="px-4 py-3 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 flex items-start gap-3">
          <Ban className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Document Cancelled</p>
            <p className="text-sm">This document was cancelled on {formatDate(doc.cancelled_at)}.{doc.cancellation_reason && ` Reason: ${doc.cancellation_reason}`}</p>
          </div>
        </div>
      )}

      {/* Closed Banner */}
      {doc.status === 'Closed' && (
        <div className="px-4 py-3 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-start gap-3">
          <Lock className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Document Closed & Enacted</p>
            <p className="text-sm">This document was officially enacted on {formatDate(doc.closed_at)}.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link href="/dashboard/documents" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{doc.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {doc.document_number.startsWith('PENDING-') ? (
              <span className="text-amber-600 italic text-sm">Pending Verification</span>
            ) : (
              <span className="font-mono text-sm text-slate-600">{doc.document_number}</span>
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(doc.status)}`}>{doc.status}</span>
            {isExpired && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">Expired</span>
            )}
            {isExpiringSoon && !isExpired && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">Expiring Soon</span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <button onClick={openEditModal} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              <Pencil className="h-4 w-4" /> Edit
            </button>
          )}
          {canAssignDocNumber && (
            <button onClick={() => setShowDocNumberModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600">
              <Hash className="h-4 w-4" /> Assign Doc Number
            </button>
          )}
          {myPendingReviews.length > 0 && (
            <button onClick={() => { setSelectedAssignment(myPendingReviews[0]); setShowReviewModal(true) }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600">
              <ClipboardCheck className="h-4 w-4" /> Submit Review
            </button>
          )}
          {myPendingApprovals.length > 0 && allReviewersCompleted && (
            <>
              <button onClick={() => { setSelectedAssignment(myPendingApprovals[0]); setShowApproveModal(true) }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600">
                <CheckCircle className="h-4 w-4" /> Approve
              </button>
              <button onClick={() => { setSelectedAssignment(myPendingApprovals[0]); setShowRejectModal(true) }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600">
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </>
          )}
          {canClose && (
            <button onClick={() => setShowCloseModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600">
              <Lock className="h-4 w-4" /> Mark as Closed
            </button>
          )}
          {canCancel && (
            <button onClick={() => setShowCancelModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              <Ban className="h-4 w-4" /> Cancel Document
            </button>
          )}
          {doc.draft_link && (
            <a href={doc.draft_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              <ExternalLink className="h-4 w-4" /> SharePoint
            </a>
          )}
        </div>
      </div>

      {myPendingApprovals.length > 0 && !allReviewersCompleted && (
        <div className="px-4 py-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-start gap-3">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Waiting for Reviewers</p>
            <p className="text-sm">Cannot approve until all reviewers complete. ({completedReviews}/{totalReviewers} reviews completed)</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-500" /> Document Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Type</label>
                <p className="mt-1 text-sm">{doc.document_type_name || '—'} {doc.document_type_code && <span className="text-xs text-slate-500">({doc.document_type_code})</span>}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Department</label>
                <p className="mt-1 text-sm flex items-center gap-1"><Building2 className="h-4 w-4 text-slate-400" />{doc.department_name || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Version</label>
                <p className="mt-1 text-sm">{doc.version}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Created By</label>
                <p className="mt-1 text-sm">{doc.created_by_name || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Target Date</label>
                <p className="mt-1 text-sm flex items-center gap-1"><Calendar className="h-4 w-4 text-slate-400" />{formatDate(doc.target_approval_date)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Created At</label>
                <p className="mt-1 text-sm">{formatDateTime(doc.created_at)}</p>
              </div>
            </div>

            {/* Published and Expiry Dates */}
            {(doc.status === 'Approved' || doc.status === 'Closed') && (doc.published_at || doc.expiry_date || doc.effective_date || doc.closed_at) && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {doc.effective_date && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Effective Date</label>
                      <p className="mt-1 text-sm text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        {formatDate(doc.effective_date)}
                      </p>
                    </div>
                  )}
                  {doc.published_at && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Published Date</label>
                      <p className="mt-1 text-sm text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        {formatDate(doc.published_at)}
                      </p>
                    </div>
                  )}
                  {doc.expiry_date && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Expiry Date (3 Years)</label>
                      <p className={`mt-1 text-sm font-medium flex items-center gap-1 ${
                        isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-slate-700'
                      }`}>
                        <CalendarClock className="h-4 w-4" />
                        {formatDate(doc.expiry_date)}
                        {isExpired && ' (Expired)'}
                        {isExpiringSoon && !isExpired && ' (Expiring Soon)'}
                      </p>
                    </div>
                  )}
                  {doc.closed_at && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Closed/Enacted Date</label>
                      <p className="mt-1 text-sm text-indigo-600 font-medium flex items-center gap-1">
                        <Lock className="h-4 w-4" />
                        {formatDate(doc.closed_at)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {doc.description && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="text-xs font-medium text-slate-500 uppercase">Description</label>
                <p className="mt-1 text-sm text-slate-700">{doc.description}</p>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary-500" /> Affected Departments
            </h2>
            <div className="flex flex-wrap gap-2">
              {affectedDepartments.filter(Boolean).map((d) => (
                <span key={d!.id} className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm">{d!.name}</span>
              ))}
              {affectedDepartments.filter(Boolean).length === 0 && <p className="text-sm text-slate-500 italic">None</p>}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Star className="h-5 w-5 text-primary-500" /> Reviews
              </h2>
              {totalReviewers > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${reviewProgress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${reviewProgress}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-500">{completedReviews}/{totalReviewers}</span>
                </div>
              )}
            </div>

            {safeReviews.length > 0 ? (
              <div className="space-y-3">
                {safeReviews.map((review) => (
                  <div key={review.id} className="p-4 rounded-lg border bg-white border-slate-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
                          {review.profiles?.full_name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {review.profiles?.full_name || review.profiles?.email || 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-500">{formatDateTime(review.review_date)}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getReviewStatusColor(review.review_status)}`}>
                        {getReviewStatusIcon(review.review_status)}
                        {getReviewStatusLabel(review.review_status)}
                      </span>
                    </div>
                    {review.comments && (
                      <div className="mt-3 pl-11">
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{review.comments}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <ClipboardCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {totalReviewers > 0 ? 'No reviews submitted yet' : 'No reviewers assigned'}
                </p>
              </div>
            )}

            {/* Pending Reviewers */}
            {reviewers.filter(r => !r.is_completed).length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">Pending Reviews</p>
                <div className="flex flex-wrap gap-2">
                  {reviewers.filter(r => !r.is_completed).map(r => (
                    <span key={r.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs">
                      <Clock className="h-3 w-3" />
                      {r.profiles?.full_name || r.profiles?.email || 'Unknown'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Approvals Section */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary-500" /> Approvals
              </h2>
              {approvers.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${approvers.every(a => a.is_completed) ? 'bg-emerald-500' : 'bg-orange-500'}`}
                      style={{ width: `${approvers.length > 0 ? Math.round((approvers.filter(a => a.is_completed).length / approvers.length) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-500">{approvers.filter(a => a.is_completed).length}/{approvers.length}</span>
                </div>
              )}
            </div>

            {/* Rejection Banner */}
            {doc.status === 'Rejected' && doc.rejection_reason && (
              <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-700">Document Rejected</p>
                    <p className="text-sm text-red-600 mt-1">{doc.rejection_reason}</p>
                  </div>
                </div>
              </div>
            )}

            {safeApprovals.length > 0 ? (
              <div className="space-y-3">
                {safeApprovals.map((approval) => (
                  <div key={approval.id} className={`p-4 rounded-lg border ${approval.decision === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${approval.decision === 'approved' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                          {approval.decision === 'approved' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {approval.profiles?.full_name || approval.profiles?.email || 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-500">{formatDateTime(approval.approval_date)}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${approval.decision === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {approval.decision === 'approved' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {approval.decision === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    </div>
                    {approval.comments && (
                      <div className="mt-3 pl-11">
                        <p className={`text-sm rounded-lg p-3 ${approval.decision === 'approved' ? 'text-emerald-700 bg-emerald-100/50' : 'text-red-700 bg-red-100/50'}`}>
                          {approval.comments}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {approvers.length > 0 
                    ? (allReviewersCompleted ? 'No approval decisions yet' : 'Waiting for all reviews to complete')
                    : 'No approvers assigned'}
                </p>
              </div>
            )}

            {/* Pending Approvers */}
            {approvers.filter(a => !a.is_completed).length > 0 && allReviewersCompleted && doc.status === 'Waiting Approval' && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">Pending Approvals</p>
                <div className="flex flex-wrap gap-2">
                  {approvers.filter(a => !a.is_completed).map(a => (
                    <span key={a.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs">
                      <Clock className="h-3 w-3" />
                      {a.profiles?.full_name || a.profiles?.email || 'Unknown'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-500" /> Assignments
            </h2>
            <div className="space-y-4">
              {submitters.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">Submitters</h3>
                  {submitters.map(a => (
                    <div key={a.id} className="p-3 rounded-lg border bg-white border-slate-200 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs bg-blue-500">{(a.profiles?.full_name?.[0] || '?')}</span>
                        <span className="text-sm font-medium">{a.profiles?.full_name || a.profiles?.email || 'Unknown'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(a.role_type)}`}>{getRoleLabel(a.role_type)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {reviewers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">Reviewers</h3>
                  {reviewers.map(a => {
                    const review = safeReviews.find(r => r.reviewer_id === a.user_id)
                    return (
                      <div key={a.id} className={`p-3 rounded-lg border mb-2 ${a.is_completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs ${a.is_completed ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                            {a.is_completed ? <CheckCircle className="h-3 w-3" /> : (a.profiles?.full_name?.[0] || '?')}
                          </span>
                          <span className="text-sm font-medium">{a.profiles?.full_name || a.profiles?.email || 'Unknown'}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(a.role_type)}`}>{getRoleLabel(a.role_type)}</span>
                          {a.is_completed && review && (
                            <span className={`px-2 py-0.5 rounded text-xs ${getReviewStatusColor(review.review_status)}`}>
                              {getReviewStatusLabel(review.review_status)}
                            </span>
                          )}
                          {!a.is_completed && <span className="text-xs text-amber-600">Pending</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {approvers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">Approvers</h3>
                  {!allReviewersCompleted && reviewers.length > 0 && <p className="text-xs text-amber-600 mb-2">Approvers can act after all reviewers complete</p>}
                  {approvers.map(a => (
                    <div key={a.id} className={`p-3 rounded-lg border mb-2 ${!allReviewersCompleted && reviewers.length > 0 ? 'opacity-60' : ''} ${a.is_completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs ${a.is_completed ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                          {a.is_completed ? <CheckCircle className="h-3 w-3" /> : (a.profiles?.full_name?.[0] || '?')}
                        </span>
                        <span className="text-sm font-medium">{a.profiles?.full_name || a.profiles?.email || 'Unknown'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(a.role_type)}`}>{getRoleLabel(a.role_type)}</span>
                        {a.is_completed && <span className="text-xs text-emerald-600">Approved</span>}
                        {!a.is_completed && <span className="text-xs text-slate-500">Pending</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {safeAssignments.length === 0 && (
                <p className="text-sm text-slate-500 italic">No assignments yet. {canEdit && 'Click Edit to add reviewers and approvers.'}</p>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary-500" /> Comments
            </h2>
            <div className="flex gap-2 mb-4">
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-lg" onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} />
              <button onClick={handleAddComment} disabled={isLoading || !newComment.trim()} className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg disabled:opacity-50"><Send className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-800">{c.profiles?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-slate-400">{formatDateTime(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700">{c.content}</p>
                </div>
              ))}
              {comments.length === 0 && <p className="text-sm text-slate-500 italic text-center py-4">No comments yet</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-500" /> Timeline
            </h2>
            <div className="space-y-4">
              {timeline.map((t, i) => (
                <div key={t.id} className="relative pl-6">
                  {i < timeline.length - 1 && <div className="absolute left-[9px] top-6 w-0.5 h-full bg-slate-200"></div>}
                  <div className={`absolute left-0 top-1 w-[18px] h-[18px] rounded-full flex items-center justify-center ${t.event_type === 'created' ? 'bg-blue-100' : t.event_type === 'approved' ? 'bg-emerald-100' : t.event_type === 'rejected' ? 'bg-red-100' : t.event_type === 'review_completed' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                    <div className={`w-2 h-2 rounded-full ${t.event_type === 'created' ? 'bg-blue-500' : t.event_type === 'approved' ? 'bg-emerald-500' : t.event_type === 'rejected' ? 'bg-red-500' : t.event_type === 'review_completed' ? 'bg-amber-500' : 'bg-slate-500'}`}></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{t.event_title}</p>
                    {t.event_description && <p className="text-xs text-slate-500 mt-0.5">{t.event_description}</p>}
                    <p className="text-xs text-slate-400 mt-1">{formatDateTime(t.created_at)}</p>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && <p className="text-sm text-slate-500 italic text-center py-4">No timeline</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Document Number Modal */}
      {showDocNumberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDocNumberModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Hash className="h-5 w-5 text-purple-500" /> Assign Document Number</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Manual Number (optional)</label>
              <input type="text" value={manualDocNumber} onChange={(e) => setManualDocNumber(e.target.value.toUpperCase())} placeholder="MRT-AST-PLC-001" className="w-full px-4 py-2 border rounded-lg font-mono" />
              <p className="text-xs text-slate-500 mt-1">Format: XXX-XXX-XXX-NNN</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAssignDocNum(true)} disabled={isLoading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg disabled:opacity-50">{isLoading ? 'Loading...' : 'Auto-Generate'}</button>
              <button onClick={() => handleAssignDocNum(false)} disabled={isLoading || !manualDocNumber.trim()} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg disabled:opacity-50">Use Manual</button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Review Modal */}
      {showReviewModal && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowReviewModal(false); setSelectedAssignment(null); setReviewComment(''); setReviewStatus('submitted') }}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-blue-500" /> Submit Review</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Review Decision</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewStatus('submitted')}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    reviewStatus === 'submitted' 
                      ? 'bg-blue-50 border-blue-300 text-blue-700' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <ClipboardCheck className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">Reviewed</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewStatus('approved')}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    reviewStatus === 'approved' 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <ThumbsUp className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">Approved</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewStatus('requested_changes')}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    reviewStatus === 'requested_changes' 
                      ? 'bg-amber-50 border-amber-300 text-amber-700' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <AlertIcon className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">Changes</span>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Comments {reviewStatus === 'requested_changes' && <span className="text-red-500">*</span>}
              </label>
              <textarea 
                value={reviewComment} 
                onChange={(e) => setReviewComment(e.target.value)} 
                placeholder={reviewStatus === 'requested_changes' ? "Please describe the changes needed..." : "Add your review comments (optional)..."} 
                rows={4} 
                className="w-full px-4 py-2 border rounded-lg resize-none" 
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setShowReviewModal(false); setSelectedAssignment(null); setReviewComment(''); setReviewStatus('submitted') }} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg">Cancel</button>
              <button 
                onClick={handleSubmitReview} 
                disabled={isLoading || (reviewStatus === 'requested_changes' && !reviewComment.trim())} 
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg disabled:opacity-50"
              >
                {isLoading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowApproveModal(false); setSelectedAssignment(null); setReviewComment('') }}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-500" /> Approve Document</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Comments (optional)</label>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Approval comments..." rows={3} className="w-full px-4 py-2 border rounded-lg resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowApproveModal(false); setSelectedAssignment(null); setReviewComment('') }} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg">Cancel</button>
              <button onClick={handleApproveDoc} disabled={isLoading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg disabled:opacity-50">{isLoading ? 'Loading...' : 'Approve'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowRejectModal(false); setSelectedAssignment(null); setRejectReason('') }}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><XCircle className="h-5 w-5 text-red-500" /> Reject Document</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Reason <span className="text-red-500">*</span></label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." rows={4} className="w-full px-4 py-2 border rounded-lg resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowRejectModal(false); setSelectedAssignment(null); setRejectReason('') }} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg">Cancel</button>
              <button onClick={handleRejectDoc} disabled={isLoading || !rejectReason.trim()} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg disabled:opacity-50">{isLoading ? 'Loading...' : 'Reject'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowCloseModal(false); setCloseComment('') }}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Lock className="h-5 w-5 text-indigo-500" /> Mark Document as Closed</h3>
            <p className="text-sm text-slate-600 mb-4">
              This will officially enact the document. The document has been approved and is ready to be closed.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Comments (optional)</label>
              <textarea 
                value={closeComment} 
                onChange={(e) => setCloseComment(e.target.value)} 
                placeholder="Add any closing remarks..." 
                rows={3} 
                className="w-full px-4 py-2 border rounded-lg resize-none" 
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowCloseModal(false); setCloseComment('') }} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg">Cancel</button>
              <button onClick={handleCloseDoc} disabled={isLoading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg disabled:opacity-50">
                {isLoading ? 'Closing...' : 'Close & Enact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Document Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowCancelModal(false); setCancelReason('') }}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Ban className="h-5 w-5 text-slate-500" /> Cancel Document</h3>
            <p className="text-sm text-slate-600 mb-4">
              This will permanently cancel the document. This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Reason <span className="text-red-500">*</span></label>
              <textarea 
                value={cancelReason} 
                onChange={(e) => setCancelReason(e.target.value)} 
                placeholder="Why is this document being cancelled?" 
                rows={4} 
                className="w-full px-4 py-2 border rounded-lg resize-none" 
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowCancelModal(false); setCancelReason('') }} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg">Go Back</button>
              <button onClick={handleCancelDoc} disabled={isLoading || !cancelReason.trim()} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-slate-600 rounded-lg disabled:opacity-50">
                {isLoading ? 'Cancelling...' : 'Cancel Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && formOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Pencil className="h-5 w-5 text-primary-500" /> Edit Document</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} className="w-full px-4 py-2 border rounded-lg resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Document Type</label>
                  <select value={editDocTypeId} onChange={(e) => setEditDocTypeId(e.target.value)} className="w-full px-4 py-2 border rounded-lg">{formOptions.documentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select value={editDeptId} onChange={(e) => setEditDeptId(e.target.value)} className="w-full px-4 py-2 border rounded-lg">{formOptions.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SharePoint Link</label>
                <input type="url" value={editDraftLink} onChange={(e) => setEditDraftLink(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Date</label>
                <input type="date" value={editTargetDate} onChange={(e) => setEditTargetDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Affected Departments</label>
                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-lg p-2">
                  {formOptions.departments.map(d => (
                    <label key={d.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm ${editAffectedDepts.includes(d.id) ? 'bg-primary-100' : ''}`}>
                      <input type="checkbox" checked={editAffectedDepts.includes(d.id)} onChange={() => toggleArray(editAffectedDepts, setEditAffectedDepts, d.id)} />
                      {d.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reviewers</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {formOptions.users.map(u => (
                    <label key={u.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm ${editReviewerIds.includes(u.id) ? 'bg-amber-100' : ''}`}>
                      <input type="checkbox" checked={editReviewerIds.includes(u.id)} onChange={() => toggleArray(editReviewerIds, setEditReviewerIds, u.id)} />
                      {u.full_name || u.email}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Approvers</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {formOptions.users.map(u => (
                    <label key={u.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm ${editApproverIds.includes(u.id) ? 'bg-emerald-100' : ''}`}>
                      <input type="checkbox" checked={editApproverIds.includes(u.id)} onChange={() => toggleArray(editApproverIds, setEditApproverIds, u.id)} />
                      {u.full_name || u.email}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg">Cancel</button>
              <button onClick={handleSaveEdit} disabled={isLoading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg disabled:opacity-50">{isLoading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
