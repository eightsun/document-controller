import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileCheck,
  FileClock,
  FileX
} from 'lucide-react'
import DocumentsClient from './DocumentsClient'

export const metadata = {
  title: 'Documents | Document Controller',
  description: 'View and manage all documents',
}

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

function DocumentsLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4">
            <div className="h-4 w-20 bg-slate-200 rounded mb-2"></div>
            <div className="h-8 w-12 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="h-6 w-48 bg-slate-200 rounded"></div>
        </div>
        <div className="p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
              <div className="h-10 w-10 bg-slate-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 w-64 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 w-40 bg-slate-200 rounded"></div>
              </div>
              <div className="h-6 w-24 bg-slate-200 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

async function getDocuments(): Promise<DocumentWithDetails[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('documents_with_details')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching documents:', error)
    return []
  }
  
  return data as DocumentWithDetails[]
}

async function getDocumentStats() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('documents')
    .select('status')
    .eq('is_deleted', false)
  
  if (error) {
    console.error('Error fetching stats:', error)
    return { total: 0, initiation: 0, inReview: 0, approved: 0 }
  }
  
  const total = data.length
  const initiation = data.filter(d => d.status === 'Initiation').length
  const inReview = data.filter(d => ['SME Review', 'BPM Review', 'Pending Approval'].includes(d.status)).length
  const approved = data.filter(d => d.status === 'Approved').length
  
  return { total, initiation, inReview, approved }
}

async function DocumentsList() {
  const [documents, stats] = await Promise.all([
    getDocuments(),
    getDocumentStats(),
  ])

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <FileClock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Initiation</p>
              <p className="text-2xl font-bold text-amber-600">{stats.initiation}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">In Review</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inReview}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Approved</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <DocumentsClient documents={documents} />
    </>
  )
}

export default function DocumentsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="text-slate-500 mt-1">
            View and manage all documents in the system
          </p>
        </div>

        <Link
          href="/dashboard/documents/new"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors w-fit"
        >
          <Plus className="h-4 w-4" />
          New Document
        </Link>
      </div>

      {/* Documents List */}
      <Suspense fallback={<DocumentsLoadingSkeleton />}>
        <DocumentsList />
      </Suspense>
    </div>
  )
}
