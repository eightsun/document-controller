'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Building2, Calendar, Link as LinkIcon, Users, CheckCircle, AlertTriangle, XCircle, Loader2, ChevronDown, Info, ArrowLeft } from 'lucide-react'
import { createDocument, type UserOption } from './actions'
import type { DocumentType, Department } from '@/types/database'

interface DocumentFormProps {
  documentTypes: DocumentType[]
  departments: Department[]
  users: UserOption[]
  currentUser: UserOption | null
}

export default function DocumentForm({ documentTypes, departments, users, currentUser }: DocumentFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [documentTypeId, setDocumentTypeId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [sharepointLink, setSharepointLink] = useState('')
  const [targetApprovalDate, setTargetApprovalDate] = useState('')
  const [affectedDepartmentIds, setAffectedDepartmentIds] = useState<string[]>([])
  const [reviewerIds, setReviewerIds] = useState<string[]>([])
  const [approverIds, setApproverIds] = useState<string[]>([])

  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await createDocument({
        title,
        description,
        document_type_id: documentTypeId,
        department_id: departmentId,
        sharepoint_link: sharepointLink,
        target_approval_date: targetApprovalDate,
        affected_department_ids: affectedDepartmentIds,
        reviewer_ids: reviewerIds,
        approver_ids: approverIds,
      })

      if (result.success) {
        setSuccess(result.message || 'Document created successfully')
        setTimeout(() => router.push('/dashboard/documents'), 1500)
      } else {
        setError(result.error || 'Failed to create document')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleArrayItem = (array: string[], setArray: (val: string[]) => void, id: string) => {
    if (array.includes(id)) setArray(array.filter(item => item !== id))
    else setArray([...array, id])
  }

  const getUserName = (user: UserOption) => user.full_name || user.email || 'Unknown'

  return (
    <form onSubmit={handleSubmit}>
      {(error || success) && (
        <div className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-3 ${error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {error ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <p className="text-sm font-medium">{error || success}</p>
          <button type="button" onClick={() => { setError(null); setSuccess(null) }} className="ml-auto"><XCircle className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mb-6 px-4 py-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-start gap-3">
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Document Number</p>
          <p className="text-blue-600">Document number will be shown as <strong>&quot;Pending Verification&quot;</strong> until BPM assigns the official document number.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-500" />
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Title <span className="text-red-500">*</span></label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Enter document title" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." rows={3} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg resize-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Type <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={documentTypeId} onChange={(e) => setDocumentTypeId(e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white appearance-none">
                      <option value="">Select type...</option>
                      {documentTypes.map((type) => <option key={type.id} value={type.id}>{type.name} ({type.code})</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Owning Department <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white appearance-none">
                      <option value="">Select department...</option>
                      {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name} {dept.code && `(${dept.code})`}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">SharePoint Link <span className="text-red-500">*</span></label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="url" value={sharepointLink} onChange={(e) => setSharepointLink(e.target.value)} placeholder="https://company.sharepoint.com/..." required className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Approval Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="date" value={targetApprovalDate} onChange={(e) => setTargetApprovalDate(e.target.value)} min={today} required className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary-500" />
              Affected Departments <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-slate-500 mb-4">Select all departments affected by this document</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
              {departments.map((dept) => (
                <label key={dept.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${affectedDepartmentIds.includes(dept.id) ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <input type="checkbox" checked={affectedDepartmentIds.includes(dept.id)} onChange={() => toggleArrayItem(affectedDepartmentIds, setAffectedDepartmentIds, dept.id)} className="w-4 h-4 rounded" />
                  <span className="text-sm truncate">{dept.name}</span>
                </label>
              ))}
            </div>
            {affectedDepartmentIds.length > 0 && <p className="text-sm text-primary-600 mt-3">{affectedDepartmentIds.length} department(s) selected</p>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              Reviewers
            </h3>
            <p className="text-xs text-slate-500 mb-3">Select users to review this document</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {users.map((user) => (
                <label key={user.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${reviewerIds.includes(user.id) ? 'bg-amber-50 border-amber-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <input type="checkbox" checked={reviewerIds.includes(user.id)} onChange={() => toggleArrayItem(reviewerIds, setReviewerIds, user.id)} className="w-4 h-4 rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{getUserName(user)}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </label>
              ))}
            </div>
            {reviewerIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {reviewerIds.map(id => users.find(u => u.id === id)).filter(Boolean).map((u) => (
                  <span key={u!.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">{getUserName(u!)}</span>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              Approvers <span className="text-red-500">*</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">Select users to approve this document</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {users.map((user) => (
                <label key={user.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${approverIds.includes(user.id) ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <input type="checkbox" checked={approverIds.includes(user.id)} onChange={() => toggleArrayItem(approverIds, setApproverIds, user.id)} className="w-4 h-4 rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{getUserName(user)}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </label>
              ))}
            </div>
            {approverIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {approverIds.map(id => users.find(u => u.id === id)).filter(Boolean).map((u) => (
                  <span key={u!.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">{getUserName(u!)}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
        <Link href="/dashboard/documents" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Cancel
        </Link>
        <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50">
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : <><FileText className="h-4 w-4" /> Create Document</>}
        </button>
      </div>
    </form>
  )
}
