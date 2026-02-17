import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import DocumentsClient from './DocumentsClient'

export const metadata = {
  title: 'Documents | Document Controller',
  description: 'Manage and track documents',
}

interface SearchParams {
  tab?: string
  search?: string
  status?: string
  department?: string
  type?: string
  page?: string
}

async function getDocumentsData(searchParams: SearchParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get user roles
  const { data: userRoles } = await supabase.from('user_roles').select('roles (name)').eq('user_id', user.id)
  const roleNames: string[] = []
  if (userRoles) {
    for (const ur of userRoles) {
      const rolesData = ur.roles as { name: string } | { name: string }[] | null
      if (rolesData) {
        if (Array.isArray(rolesData)) rolesData.forEach(r => roleNames.push(r.name))
        else roleNames.push(rolesData.name)
      }
    }
  }

  const isAdmin = roleNames.includes('Admin')
  const isBPM = roleNames.includes('BPM')
  const canViewAll = isAdmin || isBPM

  // Parse params
  const tab = searchParams.tab || 'all'
  const search = searchParams.search || ''
  const statusFilter = searchParams.status || ''
  const departmentFilter = searchParams.department || ''
  const typeFilter = searchParams.type || ''
  const page = parseInt(searchParams.page || '1', 10)
  const pageSize = 20

  // Get filter options
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  const { data: documentTypes } = await supabase
    .from('document_types')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // Build base query
  let query = supabase
    .from('documents_with_details')
    .select('*', { count: 'exact' })

  // Apply tab filter
  if (tab === 'my') {
    // Documents created by current user
    const { data: myDocs } = await supabase
      .from('documents')
      .select('id')
      .eq('created_by', user.id)
    const myDocIds = myDocs?.map(d => d.id) || []
    if (myDocIds.length > 0) {
      query = query.in('id', myDocIds)
    } else {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000') // No results
    }
  } else if (tab === 'review') {
    // Documents pending my review
    const { data: reviewAssignments } = await supabase
      .from('document_assignments')
      .select('document_id')
      .eq('user_id', user.id)
      .eq('role_type', 'reviewer')
      .eq('is_completed', false)
    const reviewDocIds = reviewAssignments?.map(a => a.document_id) || []
    if (reviewDocIds.length > 0) {
      query = query.in('id', reviewDocIds)
    } else {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  } else if (tab === 'approval') {
    // Documents pending my approval
    const { data: approvalAssignments } = await supabase
      .from('document_assignments')
      .select('document_id')
      .eq('user_id', user.id)
      .eq('role_type', 'approver')
      .eq('is_completed', false)
    const approvalDocIds = approvalAssignments?.map(a => a.document_id) || []
    if (approvalDocIds.length > 0) {
      query = query.in('id', approvalDocIds).eq('status', 'Waiting Approval')
    } else {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  } else if (tab === 'expiring') {
    // Documents expiring within 90 days
    const now = new Date()
    const future90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    query = query
      .eq('status', 'Approved')
      .gte('expiry_date', now.toISOString().split('T')[0])
      .lte('expiry_date', future90.toISOString().split('T')[0])
  } else if (tab === 'expired') {
    // Expired documents
    const now = new Date()
    query = query
      .eq('status', 'Approved')
      .lt('expiry_date', now.toISOString().split('T')[0])
  } else {
    // All documents - if not admin/BPM, show only documents user is involved with
    if (!canViewAll) {
      const { data: involvedDocs } = await supabase
        .from('document_assignments')
        .select('document_id')
        .eq('user_id', user.id)
      const { data: createdDocs } = await supabase
        .from('documents')
        .select('id')
        .eq('created_by', user.id)
      
      const allDocIds = new Set([
        ...(involvedDocs?.map(d => d.document_id) || []),
        ...(createdDocs?.map(d => d.id) || [])
      ])
      
      if (allDocIds.size > 0) {
        query = query.in('id', Array.from(allDocIds))
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000')
      }
    }
  }

  // Apply search
  if (search) {
    query = query.or(`title.ilike.%${search}%,document_number.ilike.%${search}%`)
  }

  // Apply filters
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }
  if (departmentFilter) {
    query = query.eq('department_name', departmentFilter)
  }
  if (typeFilter) {
    query = query.eq('document_type_name', typeFilter)
  }

  // Order and paginate
  query = query
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  const { data: documents, count, error } = await query

  if (error) {
    console.error('Error fetching documents:', error)
    return null
  }

  // Get counts for tabs
  const tabCounts = {
    all: 0,
    my: 0,
    review: 0,
    approval: 0,
    expiring: 0,
    expired: 0,
  }

  // Count for "my" tab
  const { count: myCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', user.id)
  tabCounts.my = myCount || 0

  // Count for "review" tab
  const { data: reviewDocs } = await supabase
    .from('document_assignments')
    .select('document_id')
    .eq('user_id', user.id)
    .eq('role_type', 'reviewer')
    .eq('is_completed', false)
  tabCounts.review = reviewDocs?.length || 0

  // Count for "approval" tab
  const { data: approvalDocs } = await supabase
    .from('document_assignments')
    .select('document_id, documents!inner(status)')
    .eq('user_id', user.id)
    .eq('role_type', 'approver')
    .eq('is_completed', false)
    .eq('documents.status', 'Waiting Approval')
  tabCounts.approval = approvalDocs?.length || 0

  // Count for "expiring" tab
  const now = new Date()
  const future90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const { count: expiringCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Approved')
    .gte('expiry_date', now.toISOString().split('T')[0])
    .lte('expiry_date', future90.toISOString().split('T')[0])
  tabCounts.expiring = expiringCount || 0

  // Count for "expired" tab
  const { count: expiredCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Approved')
    .lt('expiry_date', now.toISOString().split('T')[0])
  tabCounts.expired = expiredCount || 0

  // Count for "all" tab
  if (canViewAll) {
    const { count: allCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
    tabCounts.all = allCount || 0
  } else {
    const { data: involvedDocs } = await supabase
      .from('document_assignments')
      .select('document_id')
      .eq('user_id', user.id)
    const { data: createdDocs } = await supabase
      .from('documents')
      .select('id')
      .eq('created_by', user.id)
    const allDocIds = new Set([
      ...(involvedDocs?.map(d => d.document_id) || []),
      ...(createdDocs?.map(d => d.id) || [])
    ])
    tabCounts.all = allDocIds.size
  }

  return {
    documents: documents || [],
    totalCount: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
    tabCounts,
    filters: {
      tab,
      search,
      status: statusFilter,
      department: departmentFilter,
      type: typeFilter,
    },
    filterOptions: {
      departments: departments || [],
      documentTypes: documentTypes || [],
      statuses: ['Initiation', 'Review', 'Waiting Approval', 'Approved', 'Rejected', 'Closed', 'Cancel'],
    },
    currentUser: {
      id: user.id,
      roles: roleNames,
      canViewAll,
    },
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse"></div>
        <div className="h-10 w-40 bg-slate-200 rounded animate-pulse"></div>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-10 w-32 bg-slate-200 rounded animate-pulse"></div>
        ))}
      </div>
      <div className="card">
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-16 w-full bg-slate-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

async function DocumentsWrapper({ searchParams }: { searchParams: SearchParams }) {
  const data = await getDocumentsData(searchParams)
  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Failed to load documents. Please try again.</p>
      </div>
    )
  }
  return <DocumentsClient {...data} />
}

export default function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DocumentsWrapper searchParams={searchParams} />
    </Suspense>
  )
}
