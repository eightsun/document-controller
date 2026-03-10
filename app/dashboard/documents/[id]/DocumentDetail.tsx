'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Calendar, Building2, Users, Clock, CheckCircle, XCircle, AlertTriangle, ExternalLink, Hash, MessageSquare, Send, ClipboardCheck, Info, Pencil, CalendarClock, Star, AlertCircle as AlertIcon, ThumbsUp, ThumbsDown, Ban, Lock, GraduationCap, UserCheck, GitBranch, Archive } from 'lucide-react'
import { assignDocumentNumber, submitReview, approveDocument, rejectDocument, addComment, updateDocument, getDocumentForEdit, getFormOptions, closeDocument, cancelDocument, startTraining, acknowledgeTraining, requestObsolete, approveObsolete, rejectObsolete, setPublishedLink } from './actions'

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
  legal_entity_name: string | null
  legal_entity_code: string | null
  sub_department_name: string | null
  created_by_name: string | null
  created_by: string | null
  published_at: string | null
  expiry_date: string | null
  effective_date: string | null
  rejection_reason: string | null
  closed_at: string | null
  training_started_at: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
  parent_document_id: string | null
  parent_document_number: string | null
  obsolete_reason: string | null
  obsolete_requested_at: string | null
  obsolete_approver_id: string | null
  obsolete_approver_name: string | null
  obsolete_approved_at: string | null
  obsolete_rejected_at: string | null
  published_link: string | null
}

interface TrainingRecord {
  id: string
  user_id: string
  department_id: string | null
  acknowledged: boolean
  acknowledged_at: string | null
  created_at: string
  profiles: { id: string; full_name: string | null; email: string | null } | null
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
  training: TrainingRecord[]
  affectedDepartments: (Department | null)[]
  timeline: TimelineEntry[]
  comments: Comment[]
  currentUser: { id: string; roles: string[] }
}

interface FormOptions {
  documentTypes: Array<{ id: string; name: string; code: string }>
  departments: Array<{ id: string; name: string; code: string | null; legal_entity_id: string | null }>
  subDepartments: Array<{ id: string; name: string; department_id: string }>
  legalEntities: Array<{ id: string; name: string; code: string }>
  users: Array<{ id: string; full_name: string | null; email: string | null }>
}

export default function DocumentDetail({ document: doc, assignments, reviews, approvals, training, affectedDepartments, timeline, comments, currentUser }: Props) {
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
  const [showStartTrainingModal, setShowStartTrainingModal] = useState(false)
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false)
  const [trainingPage, setTrainingPage] = useState(1)
  const TRAINING_PAGE_SIZE = 10
  const [newComment, setNewComment] = useState('')
  const [showReviseModal, setShowReviseModal] = useState(false)
  const [showObsoleteModal, setShowObsoleteModal] = useState(false)
  const [obsoleteReason, setObsoleteReason] = useState('')
  const [obsoleteApproverId, setObsoleteApproverId] = useState('')
  const [showObsoleteApproveModal, setShowObsoleteApproveModal] = useState(false)
  const [showObsoleteRejectModal, setShowObsoleteRejectModal] = useState(false)
  const [obsoleteApproveComment, setObsoleteApproveComment] = useState('')
  const [obsoleteRejectReason, setObsoleteRejectReason] = useState('')

  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDocTypeId, setEditDocTypeId] = useState('')
  const [editLegalEntityId, setEditLegalEntityId] = useState('')
  const [editDeptId, setEditDeptId] = useState('')
  const [editSubDeptId, setEditSubDeptId] = useState('')
  const [editDocumentNumber, setEditDocumentNumber] = useState('')
  const [editDraftLink, setEditDraftLink] = useState('')
  const [editEffectiveDate, setEditEffectiveDate] = useState('')
  const [editTargetDate, setEditTargetDate] = useState('')
  const [editAffectedDepts, setEditAffectedDepts] = useState<string[]>([])
  const [editReviewerIds, setEditReviewerIds] = useState<string[]>([])
  const [editApproverIds, setEditApproverIds] = useState<string[]>([])
  const [formOptions, setFormOptions] = useState<FormOptions | null>(null)
  const [showPublishLinkModal, setShowPublishLinkModal] = useState(false)
  const [publishLinkValue, setPublishLinkValue] = useState('')

  const isAdmin = currentUser.roles.includes('Admin')
  const isBPM = currentUser.roles.includes('BPM')
  const canEdit = isAdmin || isBPM
  const canAssignDocNumber = canEdit && doc.document_number.startsWith('PENDING-')
  const isCreator = doc.created_by === currentUser.id
  const canStartTraining = (isAdmin || isBPM || isCreator) && doc.status === 'Approved'
  const canClose = (isAdmin || isBPM || isCreator) && doc.status === 'Training'
  const canCancel = (isAdmin || isBPM || isCreator) && ['Initiation', 'Review', 'Waiting Approval'].includes(doc.status)
  const canRevise = (isAdmin || isBPM) && doc.status === 'Closed'
  const canObsolete = (isAdmin || isBPM || isCreator) && doc.status === 'Closed'
  const canSetPublishedLink = (isAdmin || isBPM) && ['Approved', 'Training', 'Closed'].includes(doc.status)
  const canApproveObsolete = doc.status === 'Obsolete Pending' && doc.obsolete_approver_id === currentUser.id

  const safeTraining = training || []
  const myTrainingRecord = safeTraining.find(t => t.user_id === currentUser.id)
  const canAcknowledgeTraining = !!(myTrainingRecord && !myTrainingRecord.acknowledged && doc.status === 'Training')
  const trainingCompleted = safeTraining.filter(t => t.acknowledged).length
  const trainingTotal = safeTraining.length
  const trainingProgress = trainingTotal > 0 ? Math.round((trainingCompleted / trainingTotal) * 100) : 0
  const allTrainingComplete = trainingTotal > 0 && trainingCompleted === trainingTotal

  // Department name lookup from affectedDepartments (trainees always belong to affected depts)
  const deptMap: Record<string, string> = {}
  affectedDepartments.filter(Boolean).forEach(d => { if (d) deptMap[d.id] = d.name })

  // Paginated training slice
  const trainingTotalPages = Math.ceil(trainingTotal / TRAINING_PAGE_SIZE)
  const pagedTraining = safeTraining.slice((trainingPage - 1) * TRAINING_PAGE_SIZE, trainingPage * TRAINING_PAGE_SIZE)

  const exportTrainingToCSV = () => {
    const rows = [
      ['Name', 'Email', 'Department', 'Status', 'Date & Time of Acknowledgment'],
      ...safeTraining.map(t => [
        t.profiles?.full_name || '',
        t.profiles?.email || '',
        t.department_id ? (deptMap[t.department_id] || t.department_id) : '',
        t.acknowledged ? 'Acknowledged' : 'Pending',
        t.acknowledged_at ? new Date(t.acknowledged_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv, ], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `training-${doc.document_number}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
      'Training': 'bg-purple-100 text-purple-700',
      'Rejected': 'bg-red-100 text-red-700',
      'Closed': 'bg-indigo-100 text-indigo-700',
      'Cancel': 'bg-slate-100 text-slate-500',
      'Obsolete Pending': 'bg-orange-100 text-orange-700',
      'Obsolete': 'bg-stone-100 text-stone-600'
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
      setEditLegalEntityId(d.legal_entity_id || '')
      setEditDeptId(d.department_id)
      setEditSubDeptId(d.sub_department_id || '')
      setEditDocumentNumber(d.document_number || '')
      setEditDraftLink(d.draft_link || '')
      setEditEffectiveDate(d.effective_date?.split('T')[0] || '')
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
    // Only modify reviewer/approver assignments when document is in Initiation
    // — for all other statuses the workflow has progressed and assignments must not be reset
    const canEditAssignments = doc.status === 'Initiation'

    const result = await updateDocument(doc.id, {
      title: editTitle,
      description: editDescription,
      document_type_id: editDocTypeId,
      department_id: editDeptId,
      sub_department_id: editSubDeptId || null,
      document_number: editDocumentNumber,
      draft_link: editDraftLink,
      effective_date: editEffectiveDate || null,
      target_approval_date: editTargetDate,
      affected_department_ids: editAffectedDepts,
      ...(canEditAssignments && {
        reviewer_ids: editReviewerIds,
        approver_ids: editApproverIds,
      }),
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

  const handleStartTraining = async () => {
    setIsLoading(true)
    const result = await startTraining(doc.id)
    if (result.success) {
      showMsg('success', result.message || 'Training started')
      setShowStartTrainingModal(false)
      router.refresh()
    } else {
      showMsg('error', result.error || 'Failed to start training')
    }
    setIsLoading(false)
  }

  const handleAcknowledgeTraining = async () => {
    setIsLoading(true)
    const result = await acknowledgeTraining(doc.id)
    if (result.success) {
      showMsg('success', result.message || 'Training acknowledged')
      setShowAcknowledgeModal(false)
      router.refresh()
    } else {
      showMsg('error', result.error || 'Failed to acknowledge training')
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

  const handleRevise = () => {
    setShowReviseModal(true)
  }

  const confirmRevise = () => {
    setShowReviseModal(false)
    router.push(`/dashboard/documents/new?from=${doc.id}`)
  }

  const handleSetPublishedLink = async () => {
    if (!publishLinkValue.trim()) return
    setIsLoading(true)
    const result = await setPublishedLink(doc.id, publishLinkValue)
    if (result.success) {
      showMsg('success', result.message || 'Published link saved')
      setShowPublishLinkModal(false)
      router.refresh()
    } else {
      showMsg('error', result.error || 'Failed to save')
    }
    setIsLoading(false)
  }

  const handleRequestObsolete = async () => {
    if (!obsoleteReason.trim() || !obsoleteApproverId) return
    setIsLoading(true)
    const result = await requestObsolete(doc.id, { reason: obsoleteReason, approverId: obsoleteApproverId })
    if (result.success) {
      showMsg('success', result.message || 'Obsolete request submitted')
      setShowObsoleteModal(false)
      setObsoleteReason('')
      setObsoleteApproverId('')
      router.refresh()
    } else {
      showMsg('error', result.error || 'Failed')
    }
    setIsLoading(false)
  }

  const handleApproveObsolete = async () => {
    setIsLoading(true)
    const result = await approveObsolete(doc.id, obsoleteApproveComment)
    if (result.success) {
      showMsg('success', result.message || 'Document obsoleted')
      setShowObsoleteApproveModal(false)
      setObsoleteApproveComment('')
      router.refresh()
    } else {
      showMsg('error', result.error || 'Failed')
    }
    setIsLoading(false)
  }

  const handleRejectObsolete = async () => {
    if (!obsoleteRejectReason.trim()) return
    setIsLoading(true)
    const result = await rejectObsolete(doc.id, obsoleteRejectReason)
    if (result.success) {
      showMsg('success', result.message || 'Obsolete request rejected')
      setShowObsoleteRejectModal(false)
      setObsoleteRejectReason('')
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

      {/* Obsolete Pending Banner */}
      {doc.status === 'Obsolete Pending' && (
        <div className="px-4 py-3 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 flex items-start gap-3">
          <Archive className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Obsolete Approval Pending</p>
            <p className="text-sm">
              Awaiting approval from <strong>{doc.obsolete_approver_name || 'designated approver'}</strong>.
              {doc.obsolete_reason && ` Reason: ${doc.obsolete_reason}`}
            </p>
          </div>
        </div>
      )}

      {/* Obsolete Banner */}
      {doc.status === 'Obsolete' && (
        <div className="px-4 py-3 rounded-lg bg-stone-100 text-stone-700 border border-stone-300 flex items-start gap-3">
          <Archive className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Document Obsolete</p>
            <p className="text-sm">This document has been marked as obsolete and is no longer in use.{doc.obsolete_approved_at && ` Effective: ${new Date(doc.obsolete_approved_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}.`}</p>
          </div>
        </div>
      )}

      {/* Training Banner */}
      {doc.status === 'Training' && (
        <div className="px-4 py-3 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-start gap-3">
          <GraduationCap className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Training In Progress</p>
            <p className="text-sm">
              {trainingTotal > 0
                ? `${trainingCompleted} of ${trainingTotal} participant(s) have acknowledged training.`
                : 'Training has started. Participants are being notified.'}
              {allTrainingComplete && ' All training complete — document can now be closed.'}
            </p>
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
          {canRevise && (
            <button onClick={handleRevise} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600">
              <GitBranch className="h-4 w-4" /> Revise
            </button>
          )}
          {canObsolete && (
            <button onClick={() => { setFormOptions(null); setShowObsoleteModal(true); getFormOptions().then(r => { if (r.success && r.data) setFormOptions(r.data) }) }} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-500 rounded-lg hover:bg-stone-600">
              <Archive className="h-4 w-4" /> Mark Obsolete
            </button>
          )}
          {canApproveObsolete && (
            <>
              <button onClick={() => setShowObsoleteApproveModal(true)} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600">
                <CheckCircle className="h-4 w-4" /> Approve Obsolete
              </button>
              <button onClick={() => setShowObsoleteRejectModal(true)} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600">
                <XCircle className="h-4 w-4" /> Reject Obsolete
              </button>
            </>
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
          {canStartTraining && (
            <button
              onClick={() => setShowStartTrainingModal(true)}
              disabled={isLoading}
              title={!doc.published_link ? 'Published document link must be set before starting training' : undefined}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ${
                !doc.published_link
                  ? 'text-purple-400 bg-purple-50 border border-purple-200 cursor-not-allowed'
                  : 'text-white bg-purple-500 hover:bg-purple-600'
              }`}
            >
              <GraduationCap className="h-4 w-4" /> Start Training
              {!doc.published_link && <AlertTriangle className="h-3.5 w-3.5 ml-1" />}
            </button>
          )}
          {canAcknowledgeTraining && (
            <button onClick={() => setShowAcknowledgeModal(true)} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600">
              <UserCheck className="h-4 w-4" /> Acknowledge Training
            </button>
          )}
          {canClose && (
            <button
              onClick={() => setShowCloseModal(true)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg ${
                !allTrainingComplete
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-indigo-500 hover:bg-indigo-600'
              }`}
            >
              <Lock className="h-4 w-4" /> Mark as Closed
              {!allTrainingComplete && <AlertTriangle className="h-3.5 w-3.5 ml-1" />}
            </button>
          )}
          {canCancel && (
            <button onClick={() => setShowCancelModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              <Ban className="h-4 w-4" /> Cancel Document
            </button>
          )}
          {doc.draft_link && (
            <a href={doc.draft_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              <ExternalLink className="h-4 w-4" /> Draft
            </a>
          )}
          {doc.published_link && (
            <a href={doc.published_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
              <ExternalLink className="h-4 w-4" /> Published Doc
            </a>
          )}
          {canSetPublishedLink && (
            <button onClick={() => { setPublishLinkValue(doc.published_link || ''); setShowPublishLinkModal(true) }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100">
              <ExternalLink className="h-4 w-4" /> {doc.published_link ? 'Update Published Link' : 'Set Published Link'}
            </button>
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
                <label className="text-xs font-medium text-slate-500 uppercase">Legal Entity</label>
                <p className="mt-1 text-sm">{doc.legal_entity_name ? `${doc.legal_entity_name}${doc.legal_entity_code ? ` (${doc.legal_entity_code})` : ''}` : '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Department</label>
                <p className="mt-1 text-sm flex items-center gap-1"><Building2 className="h-4 w-4 text-slate-400" />{doc.department_name || '—'}</p>
              </div>
              {doc.sub_department_name && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Sub-Department</label>
                  <p className="mt-1 text-sm">{doc.sub_department_name}</p>
                </div>
              )}
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
            {(['Approved', 'Training', 'Closed'].includes(doc.status)) && (doc.published_at || doc.expiry_date || doc.effective_date || doc.closed_at || doc.training_started_at) && (
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
                  {doc.training_started_at && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Training Started</label>
                      <p className="mt-1 text-sm text-purple-600 font-medium flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        {formatDate(doc.training_started_at)}
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
                <label className="text-xs font-medium text-slate-500 uppercase">Objective</label>
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


          {/* Training Section */}
          {['Training', 'Closed'].includes(doc.status) && trainingTotal > 0 && (
            <div className="card p-6">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary-500" /> Training
                  <span className="text-sm font-normal text-slate-500">({trainingTotal} participants)</span>
                </h2>
                <div className="flex items-center gap-3">
                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${allTrainingComplete ? 'bg-purple-500' : 'bg-teal-500'}`}
                        style={{ width: `${trainingProgress}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-500">{trainingCompleted}/{trainingTotal}</span>
                    {allTrainingComplete && <span className="text-xs text-purple-600 font-medium">Complete</span>}
                  </div>
                  {/* Export button */}
                  <button
                    onClick={exportTrainingToCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                    title="Download as Excel/CSV"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Export Excel
                  </button>
                </div>
              </div>

              {/* Paginated list */}
              <div className="space-y-2">
                {pagedTraining.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-lg border ${t.acknowledged ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 ${t.acknowledged ? 'bg-purple-500' : 'bg-slate-400'}`}>
                          {t.acknowledged ? <CheckCircle className="h-3 w-3" /> : (t.profiles?.full_name?.[0] || '?')}
                        </span>
                        <div>
                          <p className="text-sm font-medium leading-tight">{t.profiles?.full_name || t.profiles?.email || 'Unknown'}</p>
                          {t.department_id && deptMap[t.department_id] && (
                            <p className="text-xs text-slate-400">{deptMap[t.department_id]}</p>
                          )}
                        </div>
                      </div>
                      {t.acknowledged ? (
                        <div className="text-right">
                          <span className="text-xs text-purple-600 font-medium">Acknowledged</span>
                          <p className="text-xs text-slate-400">{formatDateTime(t.acknowledged_at)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              {trainingTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Showing {(trainingPage - 1) * TRAINING_PAGE_SIZE + 1}–{Math.min(trainingPage * TRAINING_PAGE_SIZE, trainingTotal)} of {trainingTotal}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTrainingPage(p => Math.max(1, p - 1))}
                      disabled={trainingPage === 1}
                      className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                    >
                      ‹ Prev
                    </button>
                    {Array.from({ length: trainingTotalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === trainingTotalPages || Math.abs(p - trainingPage) <= 1)
                      .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, idx) =>
                        p === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setTrainingPage(p as number)}
                            className={`px-2 py-1 text-xs rounded border ${trainingPage === p ? 'bg-purple-500 text-white border-purple-500' : 'border-slate-200 hover:bg-slate-50'}`}
                          >
                            {p}
                          </button>
                        )
                      )
                    }
                    <button
                      onClick={() => setTrainingPage(p => Math.min(trainingTotalPages, p + 1))}
                      disabled={trainingPage === trainingTotalPages}
                      className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                    >
                      Next ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-500" /> Assignments
            </h2>

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

            <div className="space-y-6">
              {/* Submitters */}
              {submitters.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Submitters</h3>
                  <div className="space-y-2">
                    {submitters.map(a => (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200">
                        <span className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-medium bg-blue-500 flex-shrink-0">
                          {a.profiles?.full_name?.[0] || '?'}
                        </span>
                        <span className="text-sm font-medium text-slate-800 flex-1">{a.profiles?.full_name || a.profiles?.email || 'Unknown'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(a.role_type)}`}>{getRoleLabel(a.role_type)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviewers with inline feedback */}
              {reviewers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reviewers</h3>
                    {totalReviewers > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full transition-all ${reviewProgress === 100 ? 'bg-emerald-500' : 'bg-blue-400'}`} style={{ width: `${reviewProgress}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{completedReviews}/{totalReviewers}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {reviewers.map(a => {
                      const review = safeReviews.find(r => r.reviewer_id === a.user_id)
                      const isChangesRequested = review?.review_status === 'requested_changes'
                      return (
                        <div key={a.id} className={`rounded-lg border ${
                          a.is_completed
                            ? isChangesRequested ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                            : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex items-center gap-3 p-3">
                            <span className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${
                              a.is_completed ? (isChangesRequested ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-400'
                            }`}>
                              {a.is_completed ? <CheckCircle className="h-3.5 w-3.5" /> : (a.profiles?.full_name?.[0] || '?')}
                            </span>
                            <span className="text-sm font-medium text-slate-800 flex-1">{a.profiles?.full_name || a.profiles?.email || 'Unknown'}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(a.role_type)}`}>{getRoleLabel(a.role_type)}</span>
                            {a.is_completed && review ? (
                              <>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getReviewStatusColor(review.review_status)}`}>
                                  {getReviewStatusIcon(review.review_status)}
                                  {getReviewStatusLabel(review.review_status)}
                                </span>
                                <span className="text-xs text-slate-400 hidden sm:block">{formatDateTime(review.review_date)}</span>
                              </>
                            ) : (
                              <span className="text-xs text-amber-600 font-medium">Pending</span>
                            )}
                          </div>
                          {a.is_completed && review?.comments && (
                            <div className="px-3 pb-3">
                              <div className={`ml-10 px-3 py-2 rounded-md text-sm italic border ${
                                isChangesRequested
                                  ? 'bg-amber-100/50 border-amber-100 text-amber-800'
                                  : 'bg-white/70 border-slate-100 text-slate-600'
                              }`}>
                                "{review.comments}"
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Approvers with inline feedback */}
              {approvers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approvers</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full transition-all ${approvers.every(a => a.is_completed) ? 'bg-emerald-500' : 'bg-orange-400'}`}
                          style={{ width: `${Math.round((approvers.filter(a => a.is_completed).length / approvers.length) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{approvers.filter(a => a.is_completed).length}/{approvers.length}</span>
                    </div>
                  </div>
                  {!allReviewersCompleted && reviewers.length > 0 && (
                    <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Approvers can act after all reviewers complete
                    </p>
                  )}
                  <div className="space-y-2">
                    {approvers.map(a => {
                      const approval = safeApprovals.find(ap => ap.approver_id === a.user_id)
                      const isRejected = approval?.decision === 'rejected'
                      return (
                        <div key={a.id} className={`rounded-lg border ${!allReviewersCompleted && reviewers.length > 0 ? 'opacity-60' : ''} ${
                          a.is_completed
                            ? isRejected ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
                            : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex items-center gap-3 p-3">
                            <span className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${
                              a.is_completed ? (isRejected ? 'bg-red-500' : 'bg-emerald-500') : 'bg-slate-400'
                            }`}>
                              {a.is_completed
                                ? (isRejected ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />)
                                : (a.profiles?.full_name?.[0] || '?')}
                            </span>
                            <span className="text-sm font-medium text-slate-800 flex-1">{a.profiles?.full_name || a.profiles?.email || 'Unknown'}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(a.role_type)}`}>{getRoleLabel(a.role_type)}</span>
                            {a.is_completed && approval ? (
                              <>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  isRejected ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {isRejected ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                                  {isRejected ? 'Rejected' : 'Approved'}
                                </span>
                                <span className="text-xs text-slate-400 hidden sm:block">{formatDateTime(approval.approval_date)}</span>
                              </>
                            ) : (
                              <span className="text-xs text-slate-500 font-medium">Pending</span>
                            )}
                          </div>
                          {a.is_completed && approval?.comments && (
                            <div className="px-3 pb-3">
                              <div className={`ml-10 px-3 py-2 rounded-md text-sm italic border ${
                                isRejected
                                  ? 'bg-red-100/50 border-red-100 text-red-800'
                                  : 'bg-emerald-100/50 border-emerald-100 text-emerald-800'
                              }`}>
                                "{approval.comments}"
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
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
                  <div className={`absolute left-0 top-1 w-[18px] h-[18px] rounded-full flex items-center justify-center ${t.event_type === 'created' ? 'bg-blue-100' : t.event_type === 'approved' ? 'bg-emerald-100' : t.event_type === 'rejected' ? 'bg-red-100' : t.event_type === 'review_completed' ? 'bg-amber-100' : t.event_type === 'training_started' || t.event_type === 'training_completed' ? 'bg-purple-100' : t.event_type === 'training_acknowledged' ? 'bg-teal-100' : 'bg-slate-100'}`}>
                    <div className={`w-2 h-2 rounded-full ${t.event_type === 'created' ? 'bg-blue-500' : t.event_type === 'approved' ? 'bg-emerald-500' : t.event_type === 'rejected' ? 'bg-red-500' : t.event_type === 'review_completed' ? 'bg-amber-500' : t.event_type === 'training_started' || t.event_type === 'training_completed' ? 'bg-purple-500' : t.event_type === 'training_acknowledged' ? 'bg-teal-500' : 'bg-slate-500'}`}></div>
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

            {/* Training incomplete — blocking banner */}
            {!allTrainingComplete && trainingTotal > 0 ? (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Training Not Complete</p>
                    <p className="text-xs text-amber-700 mt-1">
                      {trainingTotal - trainingCompleted} of {trainingTotal} participant(s) have not yet acknowledged their training.
                      All participants must complete training before this document can be closed.
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-amber-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 rounded-full h-2 transition-all"
                      style={{ width: `${(trainingCompleted / trainingTotal) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-amber-700 shrink-0">
                    {trainingCompleted} / {trainingTotal} acknowledged
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 mb-4">
                All {trainingTotal} participant(s) have completed training. This will officially enact the document.
              </p>
            )}

            {/* Comment textarea — only show when training is complete */}
            {allTrainingComplete && (
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
            )}

            <div className="flex gap-2">
              <button onClick={() => { setShowCloseModal(false); setCloseComment('') }} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg">
                {allTrainingComplete ? 'Cancel' : 'Close'}
              </button>
              {allTrainingComplete && (
                <button onClick={handleCloseDoc} disabled={isLoading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg disabled:opacity-50">
                  {isLoading ? 'Closing...' : 'Close & Enact'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Start Training Modal */}
      {showStartTrainingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowStartTrainingModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><GraduationCap className="h-5 w-5 text-purple-500" /> Start Training</h3>
            <p className="text-sm text-slate-600 mb-4">
              This will move the document to <strong>Training</strong> status and notify all users in the affected departments to acknowledge their training.
            </p>

            {/* Block: published link missing */}
            {!doc.published_link && (
              <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Published document link is required</p>
                    <p className="text-sm text-red-600 mt-1">
                      Trainees need access to the final approved document. Please set the published link before starting training.
                    </p>
                    <button
                      onClick={() => { setShowStartTrainingModal(false); setPublishLinkValue(''); setShowPublishLinkModal(true) }}
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 underline hover:text-red-900"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Set Published Link now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Published link preview */}
            {doc.published_link && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Published link set</span>
                <a href={doc.published_link} target="_blank" rel="noopener noreferrer" className="ml-auto text-emerald-600 hover:underline flex items-center gap-1">
                  Preview <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {affectedDepartments.filter(Boolean).length === 0 && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                No affected departments assigned. Please add affected departments before starting training.
              </div>
            )}
            {affectedDepartments.filter(Boolean).length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-sm">
                Affected departments: {affectedDepartments.filter(Boolean).map(d => d!.name).join(', ')}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowStartTrainingModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg">Cancel</button>
              <button
                onClick={handleStartTraining}
                disabled={isLoading || !doc.published_link || affectedDepartments.filter(Boolean).length === 0}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg disabled:opacity-50"
              >
                {isLoading ? 'Starting...' : 'Start Training'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Acknowledge Training Modal */}
      {showAcknowledgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAcknowledgeModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><UserCheck className="h-5 w-5 text-teal-500" /> Acknowledge Training</h3>
            <p className="text-sm text-slate-600 mb-2">
              By clicking confirm, you acknowledge that you have read and understood the contents of this document:
            </p>
            <p className="text-sm font-medium text-slate-800 mb-4 p-3 bg-slate-50 rounded-lg">{doc.title}</p>
            <div className="flex gap-2">
              <button onClick={() => setShowAcknowledgeModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg">Cancel</button>
              <button
                onClick={handleAcknowledgeTraining}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg disabled:opacity-50"
              >
                {isLoading ? 'Confirming...' : 'I Acknowledge Training'}
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

      {/* Revise Document Confirmation Modal */}
      {showReviseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowReviseModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <GitBranch className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Initiate Document Revision</h3>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4 space-y-1 text-sm">
              <p className="font-medium text-indigo-800">{doc.document_number} — v{doc.version}</p>
              <p className="text-indigo-700 truncate">{doc.title}</p>
              {doc.expiry_date && (
                <p className="text-indigo-600">Valid until: {new Date(doc.expiry_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-1">
              You are about to create a new revision of this document. The new draft will be pre-filled with the current document's details and assigned version <strong>v{(parseInt((doc.version || '1').split('.')[0], 10) + 1)}.0</strong>.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              The original document will remain <span className="font-medium">Closed</span> until the revision completes its approval cycle.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowReviseModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={confirmRevise} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                <GitBranch className="h-4 w-4" /> Yes, Create Revision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Published Link Modal */}
      {showPublishLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPublishLinkModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ExternalLink className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{doc.published_link ? 'Update Published Link' : 'Set Published Link'}</h3>
                <p className="text-xs text-slate-500">This link will be shared with trainees during the training phase</p>
              </div>
            </div>
            {doc.draft_link && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                <span className="font-medium text-slate-600">Draft link:</span> <span className="font-mono truncate block">{doc.draft_link}</span>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Published Document URL <span className="text-red-500">*</span></label>
              <input
                type="url"
                value={publishLinkValue}
                onChange={(e) => setPublishLinkValue(e.target.value)}
                placeholder="https://meratus.sharepoint.com/..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">Provide the link to the final approved document (not the draft)</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowPublishLinkModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSetPublishedLink} disabled={isLoading || !publishLinkValue.trim()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                <ExternalLink className="h-4 w-4" /> Save Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Obsolete Request Modal */}
      {showObsoleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowObsoleteModal(false); setObsoleteReason(''); setObsoleteApproverId('') }}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Archive className="h-5 w-5 text-stone-500" /> Request Obsolete</h3>
            <p className="text-sm text-slate-600 mb-4">Mark this document as obsolete when it is no longer relevant to the company.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Reason for Obsolete <span className="text-red-500">*</span></label>
                <textarea
                  value={obsoleteReason}
                  onChange={(e) => setObsoleteReason(e.target.value)}
                  placeholder="Why is this document being marked as obsolete?"
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg resize-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Approver <span className="text-red-500">*</span></label>
                <select
                  value={obsoleteApproverId}
                  onChange={(e) => setObsoleteApproverId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                >
                  <option value="">— Select Approver —</option>
                  {formOptions?.users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">The approver may differ from the original document approver due to personnel rotation.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowObsoleteModal(false); setObsoleteReason(''); setObsoleteApproverId('') }} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg">Cancel</button>
              <button onClick={handleRequestObsolete} disabled={isLoading || !obsoleteReason.trim() || !obsoleteApproverId} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-stone-600 rounded-lg disabled:opacity-50">
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Obsolete Modal */}
      {showObsoleteApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowObsoleteApproveModal(false); setObsoleteApproveComment('') }}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-500" /> Approve Obsolete Request</h3>
            <p className="text-sm text-slate-600 mb-1">You are approving the request to mark this document as obsolete.</p>
            {doc.obsolete_reason && <p className="text-sm bg-slate-50 rounded-lg p-3 mb-4 italic">"{doc.obsolete_reason}"</p>}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Comment (optional)</label>
              <textarea
                value={obsoleteApproveComment}
                onChange={(e) => setObsoleteApproveComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-4 py-2 border rounded-lg resize-none text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowObsoleteApproveModal(false); setObsoleteApproveComment('') }} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg">Cancel</button>
              <button onClick={handleApproveObsolete} disabled={isLoading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg disabled:opacity-50">
                {isLoading ? 'Approving...' : 'Approve & Obsolete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Obsolete Modal */}
      {showObsoleteRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowObsoleteRejectModal(false); setObsoleteRejectReason('') }}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><XCircle className="h-5 w-5 text-red-500" /> Reject Obsolete Request</h3>
            <p className="text-sm text-slate-600 mb-4">Provide a reason for rejecting this obsolete request. The document will revert to Closed status.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Rejection Reason <span className="text-red-500">*</span></label>
              <textarea
                value={obsoleteRejectReason}
                onChange={(e) => setObsoleteRejectReason(e.target.value)}
                placeholder="Why is this obsolete request being rejected?"
                rows={3}
                className="w-full px-4 py-2 border rounded-lg resize-none text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowObsoleteRejectModal(false); setObsoleteRejectReason('') }} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg">Cancel</button>
              <button onClick={handleRejectObsolete} disabled={isLoading || !obsoleteRejectReason.trim()} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg disabled:opacity-50">
                {isLoading ? 'Rejecting...' : 'Reject Request'}
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
                <label className="block text-sm font-medium mb-1">Objective</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} className="w-full px-4 py-2 border rounded-lg resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Document Type</label>
                  <select value={editDocTypeId} onChange={(e) => setEditDocTypeId(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                    {formOptions.documentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Legal Entity</label>
                  <select value={editLegalEntityId} onChange={(e) => { setEditLegalEntityId(e.target.value); setEditDeptId(''); setEditSubDeptId('') }} className="w-full px-4 py-2 border rounded-lg">
                    <option value="">— All —</option>
                    {formOptions.legalEntities.map(le => <option key={le.id} value={le.id}>{le.name} ({le.code})</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select value={editDeptId} onChange={(e) => { setEditDeptId(e.target.value); setEditSubDeptId('') }} className="w-full px-4 py-2 border rounded-lg">
                    <option value="">Select department</option>
                    {formOptions.departments
                      .filter(d => !editLegalEntityId || d.legal_entity_id === editLegalEntityId)
                      .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sub-Department <span className="text-slate-400 font-normal">(optional)</span></label>
                  <select value={editSubDeptId} onChange={(e) => setEditSubDeptId(e.target.value)} className="w-full px-4 py-2 border rounded-lg" disabled={!editDeptId}>
                    <option value="">— None —</option>
                    {formOptions.subDepartments
                      .filter(sd => sd.department_id === editDeptId)
                      .map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Document Number</label>
                  <input type="text" value={editDocumentNumber} onChange={(e) => setEditDocumentNumber(e.target.value)} placeholder="e.g. MRT-AST-PRC-001" className="w-full px-4 py-2 border rounded-lg font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Effective Date</label>
                  <input type="date" value={editEffectiveDate} onChange={(e) => setEditEffectiveDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Draft / SharePoint Link</label>
                <input type="url" value={editDraftLink} onChange={(e) => setEditDraftLink(e.target.value)} placeholder="https://..." className="w-full px-4 py-2 border rounded-lg" />
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
              {doc.status === 'Initiation' ? (
                <>
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
                </>
              ) : (
                <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 flex-shrink-0" />
                  Reviewer and approver assignments are locked once the document leaves Initiation status.
                </div>
              )}
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
