'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  Search, 
  FileText, 
  MoreVertical,
  ExternalLink,
  Eye,
  Clock,
  Calendar,
  Building2,
  ChevronDown,
  Filter
} from 'lucide-react'

interface DocumentWithDetails {
  id: string
  document_number: string
  title: string
  description: string | null
  status: string
  version: string
  target_approval_date: string | null
  created_at: string
  document_type_name: string | null
  document_type_code: string | null
  department_name: string | null
  department_code: string | null
  created_by_name: string | null
  affected_department_names: string[]
  assignees: Array<{
    id: string
    name: string
    email: string
    role: string
    is_primary: boolean
    completed_at: string | null
  }>
}

interface DocumentsClientProps {
  documents: DocumentWithDetails[]
}

export default function DocumentsClient({ documents }: DocumentsClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Get unique document types for filter
  const documentTypes = useMemo(() => {
    const types = new Set(documents.map(d => d.document_type_name).filter(Boolean))
    return Array.from(types) as string[]
  }, [documents])

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.document_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.department_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.created_by_name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
      const matchesType = typeFilter === 'all' || doc.document_type_name === typeFilter
      
      return matchesSearch && matchesStatus && matchesType
    })
  }, [documents, searchQuery, statusFilter, typeFilter])

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Initiation': 'bg-amber-100 text-amber-700',
      'SME Review': 'bg-blue-100 text-blue-700',
      'BPM Review': 'bg-purple-100 text-purple-700',
      'Pending Approval': 'bg-orange-100 text-orange-700',
      'Approved': 'bg-emerald-100 text-emerald-700',
      'Rejected': 'bg-red-100 text-red-700',
      'Revision': 'bg-slate-100 text-slate-700',
      'Expired': 'bg-gray-100 text-gray-700',
    }
    return colors[status] || 'bg-slate-100 text-slate-700'
  }

  const getDocTypeColor = (code: string | null) => {
    const colors: Record<string, string> = {
      'PLC': 'bg-red-100 text-red-700',
      'PRC': 'bg-blue-100 text-blue-700',
      'PRO': 'bg-green-100 text-green-700',
      'WKI': 'bg-purple-100 text-purple-700',
    }
    return colors[code || ''] || 'bg-slate-100 text-slate-700'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const isOverdue = (targetDate: string | null, status: string) => {
    if (!targetDate || status === 'Approved') return false
    return new Date(targetDate) < new Date()
  }

  return (
    <div className="card overflow-hidden">
      {/* Header with Search and Filters */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white appearance-none"
              >
                <option value="all">All Status</option>
                <option value="Initiation">Initiation</option>
                <option value="SME Review">SME Review</option>
                <option value="BPM Review">BPM Review</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Revision">Revision</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white appearance-none"
              >
                <option value="all">All Types</option>
                {documentTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Document
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Target Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <FileText className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-800 mb-1">
                      {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                        ? 'No documents found'
                        : 'No documents yet'}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                      {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                        ? 'Try adjusting your search or filters'
                        : 'Create your first document to get started'}
                    </p>
                    {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
                      <Link
                        href="/dashboard/documents/new"
                        className="text-sm font-medium text-primary-500 hover:text-primary-600"
                      >
                        Create New Document →
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="min-w-0">
                        <Link 
                          href={`/dashboard/documents/${doc.id}`}
                          className="font-medium text-slate-800 hover:text-primary-600 line-clamp-1"
                        >
                          {doc.title}
                        </Link>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {doc.document_number === 'Waiting Document Verification' ? (
                            <span className="text-amber-600 italic">{doc.document_number}</span>
                          ) : (
                            <span className="font-mono">{doc.document_number}</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          by {doc.created_by_name || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {doc.document_type_name ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getDocTypeColor(doc.document_type_code)}`}>
                        {doc.document_type_code}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {doc.department_name ? (
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="truncate max-w-[150px]">{doc.department_name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className={isOverdue(doc.target_approval_date, doc.status) ? 'text-red-600 font-medium' : 'text-slate-600'}>
                        {formatDate(doc.target_approval_date)}
                      </span>
                      {isOverdue(doc.target_approval_date, doc.status) && (
                        <span className="text-xs text-red-500">(Overdue)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/documents/${doc.id}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filteredDocuments.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-sm text-slate-500">
            Showing {filteredDocuments.length} of {documents.length} documents
          </p>
        </div>
      )}
    </div>
  )
}
