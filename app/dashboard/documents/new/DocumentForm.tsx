'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Building2, 
  Calendar, 
  Link as LinkIcon, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  Loader2,
  ChevronDown,
  X,
  Info,
  ArrowLeft
} from 'lucide-react'
import { createDocument, type UserOption } from './actions'
import type { DocumentType, Department } from '@/types/database'
import Link from 'next/link'

interface DocumentFormProps {
  documentTypes: DocumentType[]
  departments: Department[]
  smeUsers: UserOption[]
  bpmUsers: UserOption[]
  approverUsers: UserOption[]
  mqsRepsUsers: UserOption[]
  currentUser: UserOption | null
}

export default function DocumentForm({
  documentTypes,
  departments,
  smeUsers,
  bpmUsers,
  approverUsers,
  mqsRepsUsers,
  currentUser,
}: DocumentFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [documentTypeId, setDocumentTypeId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [sharepointLink, setSharepointLink] = useState('')
  const [targetApprovalDate, setTargetApprovalDate] = useState('')
  const [affectedDepartmentIds, setAffectedDepartmentIds] = useState<string[]>([])
  const [smeIds, setSmeIds] = useState<string[]>([])
  const [bpmIds, setBpmIds] = useState<string[]>([])
  const [approverIds, setApproverIds] = useState<string[]>([])
  const [mqsRepsIds, setMqsRepsIds] = useState<string[]>(
    currentUser ? [currentUser.id] : []
  )

  // Get minimum date (today)
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
        sme_ids: smeIds,
        bpm_ids: bpmIds,
        approver_ids: approverIds,
        mqs_reps_ids: mqsRepsIds,
      })

      if (result.success) {
        setSuccess(result.message || 'Document created successfully')
        // Redirect to documents list after 1.5 seconds
        setTimeout(() => {
          router.push('/dashboard/documents')
        }, 1500)
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
    if (array.includes(id)) {
      setArray(array.filter(item => item !== id))
    } else {
      setArray([...array, id])
    }
  }

  const getUserName = (user: UserOption) => {
    return user.full_name || user.email || 'Unknown'
  }

  const getSelectedNames = (ids: string[], users: UserOption[]) => {
    return ids
      .map(id => users.find(u => u.id === id))
      .filter(Boolean)
      .map(u => getUserName(u!))
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Alert Messages */}
      {(error || success) && (
        <div className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-3 ${
          error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          {error ? <AlertTriangle className="h-5 w-5 flex-shrink-0" /> : <CheckCircle className="h-5 w-5 flex-shrink-0" />}
          <p className="text-sm font-medium">{error || success}</p>
          <button type="button" onClick={() => { setError(null); setSuccess(null) }} className="ml-auto p-1 rounded hover:bg-black/10">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div className="mb-6 px-4 py-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-start gap-3">
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Document Number</p>
          <p className="text-blue-600">
  Document number will be shown as <strong>"Pending Verification"</strong> until BPM verifies and assigns the official document number.
</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-500" />
              Basic Information
            </h2>

            <div className="space-y-4">
              {/* Document Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter document title"
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the document..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                />
              </div>

              {/* Document Type & Department Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Document Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={documentTypeId}
                      onChange={(e) => setDocumentTypeId(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white appearance-none"
                    >
                      <option value="">Select document type...</option>
                      {documentTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} ({type.code})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Owning Department */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Owning Department <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white appearance-none"
                    >
                      <option value="">Select department...</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} {dept.code && `(${dept.code})`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* SharePoint Link */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  SharePoint Link <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="url"
                    value={sharepointLink}
                    onChange={(e) => setSharepointLink(e.target.value)}
                    placeholder="https://company.sharepoint.com/..."
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Link to the document in SharePoint for review
                </p>
              </div>

              {/* Target Approval Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Target Approval Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={targetApprovalDate}
                    onChange={(e) => setTargetApprovalDate(e.target.value)}
                    min={today}
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Affected Departments Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary-500" />
              Affected Departments <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Select all departments that will be affected by this document
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
              {departments.map((dept) => (
                <label
                  key={dept.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    affectedDepartmentIds.includes(dept.id)
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={affectedDepartmentIds.includes(dept.id)}
                    onChange={() => toggleArrayItem(affectedDepartmentIds, setAffectedDepartmentIds, dept.id)}
                    className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm truncate">{dept.name}</span>
                </label>
              ))}
            </div>

            {affectedDepartmentIds.length > 0 && (
              <p className="text-sm text-primary-600 mt-3">
                {affectedDepartmentIds.length} department(s) selected
              </p>
            )}
          </div>
        </div>

        {/* Assignments - Right Side */}
        <div className="space-y-6">
          {/* Submitters (MQS Reps) */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Submitters (MQS Reps)
            </h3>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {mqsRepsUsers.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No MQS Reps available</p>
              ) : (
                mqsRepsUsers.map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      mqsRepsIds.includes(user.id)
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={mqsRepsIds.includes(user.id)}
                      onChange={() => toggleArrayItem(mqsRepsIds, setMqsRepsIds, user.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{getUserName(user)}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            {mqsRepsIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {getSelectedNames(mqsRepsIds, mqsRepsUsers).map((name, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* SME Reviewers */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              SME Reviewers
            </h3>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {smeUsers.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No SME users available</p>
              ) : (
                smeUsers.map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      smeIds.includes(user.id)
                        ? 'bg-amber-50 border-amber-500'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={smeIds.includes(user.id)}
                      onChange={() => toggleArrayItem(smeIds, setSmeIds, user.id)}
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{getUserName(user)}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            {smeIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {getSelectedNames(smeIds, smeUsers).map((name, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* BPM Reviewers */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              BPM Reviewers
            </h3>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {bpmUsers.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No BPM users available</p>
              ) : (
                bpmUsers.map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      bpmIds.includes(user.id)
                        ? 'bg-purple-50 border-purple-500'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={bpmIds.includes(user.id)}
                      onChange={() => toggleArrayItem(bpmIds, setBpmIds, user.id)}
                      className="w-4 h-4 rounded border-slate-300 text-purple-500 focus:ring-purple-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{getUserName(user)}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            {bpmIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {getSelectedNames(bpmIds, bpmUsers).map((name, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Approvers */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              Approvers <span className="text-red-500">*</span>
            </h3>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {approverUsers.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No Approver users available</p>
              ) : (
                approverUsers.map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      approverIds.includes(user.id)
                        ? 'bg-emerald-50 border-emerald-500'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={approverIds.includes(user.id)}
                      onChange={() => toggleArrayItem(approverIds, setApproverIds, user.id)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{getUserName(user)}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            {approverIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {getSelectedNames(approverIds, approverUsers).map((name, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
        <Link
          href="/dashboard/documents"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </Link>

        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Document...
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
  )
}
