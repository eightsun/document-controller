'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Building2, Users, Calendar, Link as LinkIcon, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { createDocument } from './actions'

interface Props {
  documentTypes: Array<{ id: string; name: string; code: string }>
  departments: Array<{ id: string; name: string; code: string | null }>
  users: Array<{ id: string; full_name: string | null; email: string | null }>
  currentUserId: string
}

export default function DocumentForm({ documentTypes, departments, users, currentUserId }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [documentTypeId, setDocumentTypeId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [draftLink, setDraftLink] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [affectedDepts, setAffectedDepts] = useState<string[]>([])
  const [reviewerIds, setReviewerIds] = useState<string[]>([])
  const [approverIds, setApproverIds] = useState<string[]>([])

  const toggleArray = (arr: string[], setArr: (v: string[]) => void, id: string) => {
    if (arr.includes(id)) {
      setArr(arr.filter(i => i !== id))
    } else {
      setArr([...arr, id])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!documentTypeId) {
      setError('Document type is required')
      return
    }
    if (!departmentId) {
      setError('Department is required')
      return
    }

    setIsLoading(true)

    try {
      const result = await createDocument({
        title: title.trim(),
        description: description.trim(),
        document_type_id: documentTypeId,
        department_id: departmentId,
        draft_link: draftLink.trim(),
        target_approval_date: targetDate,
        affected_department_ids: affectedDepts,
        reviewer_ids: reviewerIds,
        approver_ids: approverIds,
      })

      if (result.success && result.data) {
        router.push(`/dashboard/documents/${result.data.id}`)
      } else {
        setError(result.error || 'Failed to create document')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter out current user from reviewers/approvers list
  const availableUsers = users.filter(u => u.id !== currentUserId)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/documents" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Documents
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Create New Document</h1>
        <p className="text-sm text-slate-500 mt-1">Fill in the details below to create a new document for review and approval.</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-500" />
            Document Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter document description (optional)"
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Document Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={documentTypeId}
                  onChange={(e) => setDocumentTypeId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                >
                  <option value="">Select type...</option>
                  {documentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                >
                  <option value="">Select department...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-1">
                    <LinkIcon className="h-4 w-4" />
                    SharePoint Draft Link
                  </span>
                </label>
                <input
                  type="url"
                  value={draftLink}
                  onChange={(e) => setDraftLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Target Approval Date
                  </span>
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Affected Departments */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-500" />
            Affected Departments
          </h2>
          <p className="text-sm text-slate-500 mb-4">Select which departments will be affected by this document.</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {departments.map((dept) => (
              <label
                key={dept.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  affectedDepts.includes(dept.id)
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={affectedDepts.includes(dept.id)}
                  onChange={() => toggleArray(affectedDepts, setAffectedDepts, dept.id)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  affectedDepts.includes(dept.id)
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-slate-300'
                }`}>
                  {affectedDepts.includes(dept.id) && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
                <span className="text-sm">{dept.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Assignments */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-500" />
            Workflow Assignments
          </h2>

          {/* Reviewers */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reviewers
              <span className="font-normal text-slate-500 ml-2">
                (Select users who will review this document)
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {availableUsers.map((user) => (
                <label
                  key={user.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    reviewerIds.includes(user.id)
                      ? 'bg-amber-50 text-amber-700'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={reviewerIds.includes(user.id)}
                    onChange={() => toggleArray(reviewerIds, setReviewerIds, user.id)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    reviewerIds.includes(user.id)
                      ? 'bg-amber-500 border-amber-500'
                      : 'border-slate-300'
                  }`}>
                    {reviewerIds.includes(user.id) && (
                      <CheckCircle className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span className="text-sm truncate">{user.full_name || user.email}</span>
                </label>
              ))}
            </div>
            {reviewerIds.length > 0 && (
              <p className="text-xs text-amber-600 mt-2">
                {reviewerIds.length} reviewer{reviewerIds.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Approvers */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Approvers
              <span className="font-normal text-slate-500 ml-2">
                (Select users who will approve this document)
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {availableUsers.map((user) => (
                <label
                  key={user.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    approverIds.includes(user.id)
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={approverIds.includes(user.id)}
                    onChange={() => toggleArray(approverIds, setApproverIds, user.id)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    approverIds.includes(user.id)
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-slate-300'
                  }`}>
                    {approverIds.includes(user.id) && (
                      <CheckCircle className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span className="text-sm truncate">{user.full_name || user.email}</span>
                </label>
              ))}
            </div>
            {approverIds.length > 0 && (
              <p className="text-xs text-emerald-600 mt-2">
                {approverIds.length} approver{approverIds.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/dashboard/documents"
            className="px-6 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Create Document
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
