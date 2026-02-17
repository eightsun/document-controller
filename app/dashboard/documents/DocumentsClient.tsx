'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Building2, 
  User, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  ClipboardCheck,
  CalendarClock,
  ExternalLink
} from 'lucide-react'

interface Document {
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
  created_by_name: string | null
  published_at: string | null
  expiry_date: string | null
}

interface TabCounts {
  all: number
  my: number
  review: number
  approval: number
  expiring: number
  expired: number
}

interface FilterOptions {
  departments: Array<{ id: string; name: string }>
  documentTypes: Array<{ id: string; name: string }>
  statuses: string[]
}

interface Filters {
  tab: string
  search: string
  status: string
  department: string
  type: string
}

interface Props {
  documents: Document[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  tabCounts: TabCounts
  filters: Filters
  filterOptions: FilterOptions
  currentUser: {
    id: string
    roles: string[]
    canViewAll: boolean
  }
}

export default function DocumentsClient({
  documents,
  totalCount,
  page,
  pageSize,
  totalPages,
  tabCounts,
  filters,
  filterOptions,
  currentUser,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [searchInput, setSearchInput] = useState(filters.search)
  const [showFilters, setShowFilters] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  // Create URL with updated params
  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      // Reset to page 1 when filters change (except when changing page)
      if (!('page' in updates)) {
        params.delete('page')
      }
      return params.toString()
    },
    [searchParams]
  )

  const navigate = (updates: Record<string, string | null>) => {
    setIsNavigating(true)
    const query = createQueryString(updates)
    router.push(`${pathname}${query ? `?${query}` : ''}`)
    setTimeout(() => setIsNavigating(false), 500)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate({ search: searchInput || null })
  }

  const clearFilters = () => {
    setSearchInput('')
    navigate({ search: null, status: null, department: null, type: null })
  }

  const hasActiveFilters = filters.search || filters.status || filters.department || filters.type

  const tabs = [
    { key: 'all', label: 'All Documents', count: tabCounts.all, icon: FileText },
    { key: 'my', label: 'My Documents', count: tabCounts.my, icon: User },
    { key: 'review', label: 'Pending Review', count: tabCounts.review, icon: ClipboardCheck },
    { key: 'approval', label: 'Pending Approval', count: tabCounts.approval, icon: CheckCircle },
    { key: 'expiring', label: 'Expiring Soon', count: tabCounts.expiring, icon: CalendarClock },
    { key: 'expired', label: 'Expired', count: tabCounts.expired, icon: AlertTriangle },
  ]

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Initiation': 'bg-amber-100 text-amber-700',
      'Review': 'bg-blue-100 text-blue-700',
      'Waiting Approval': 'bg-orange-100 text-orange-700',
      'Approved': 'bg-emerald-100 text-emerald-700',
      'Rejected': 'bg-red-100 text-red-700',
      'Closed': 'bg-slate-100 text-slate-700',
      'Cancel': 'bg-slate-100 text-slate-500',
    }
    return colors[status] || 'bg-slate-100 text-slate-700'
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false
    return new Date(expiryDate) < new Date()
  }

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const now = new Date()
    const future90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    return expiry >= now && expiry <= future90
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="text-sm text-slate-500 mt-1">
            {totalCount} document{totalCount !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link
          href="/dashboard/documents/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Document
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = filters.tab === tab.key || (filters.tab === '' && tab.key === 'all')
          return (
            <button
              key={tab.key}
              onClick={() => navigate({ tab: tab.key === 'all' ? null : tab.key })}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  isActive ? 'bg-primary-200 text-primary-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title or document number..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
          >
            Search
          </button>
        </form>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
            showFilters || hasActiveFilters
              ? 'bg-primary-50 text-primary-700 border-primary-200'
              : 'text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 text-xs bg-primary-500 text-white rounded-full">
              {[filters.status, filters.department, filters.type, filters.search].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => navigate({ status: e.target.value || null })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="">All Statuses</option>
                {filterOptions.statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select
                value={filters.department}
                onChange={(e) => navigate({ department: e.target.value || null })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="">All Departments</option>
                {filterOptions.departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
              <select
                value={filters.type}
                onChange={(e) => navigate({ type: e.target.value || null })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="">All Types</option>
                {filterOptions.documentTypes.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {isNavigating && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      )}

      {/* Documents Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Document</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Target Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No documents found</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {hasActiveFilters ? 'Try adjusting your filters' : 'Create your first document to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <Link href={`/dashboard/documents/${doc.id}`} className="block group">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-primary-100 transition-colors">
                            <FileText className="h-5 w-5 text-slate-500 group-hover:text-primary-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800 group-hover:text-primary-600">
                              {doc.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 font-mono">
                              {doc.document_number.startsWith('PENDING-') ? (
                                <span className="text-amber-600 italic">Pending Verification</span>
                              ) : (
                                doc.document_number
                              )}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-700">{doc.document_type_name || '—'}</span>
                      {doc.document_type_code && (
                        <span className="text-xs text-slate-400 ml-1">({doc.document_type_code})</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-700">{doc.department_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                        {doc.status === 'Approved' && isExpired(doc.expiry_date) && (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            Expired
                          </span>
                        )}
                        {doc.status === 'Approved' && isExpiringSoon(doc.expiry_date) && !isExpired(doc.expiry_date) && (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                            Expiring Soon
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-700">{doc.created_by_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-700">{formatDate(doc.target_approval_date)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {doc.expiry_date ? (
                        <div className={`flex items-center gap-1 ${
                          isExpired(doc.expiry_date) ? 'text-red-600' :
                          isExpiringSoon(doc.expiry_date) ? 'text-amber-600' :
                          'text-slate-700'
                        }`}>
                          <CalendarClock className="h-4 w-4" />
                          <span className="text-sm">{formatDate(doc.expiry_date)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate({ page: String(page - 1) })}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => navigate({ page: String(pageNum) })}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                        page === pageNum
                          ? 'bg-primary-500 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => navigate({ page: String(page + 1) })}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
