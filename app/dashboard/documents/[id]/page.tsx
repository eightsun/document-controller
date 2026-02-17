import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DocumentDetail from './DocumentDetail'

export const metadata = { title: 'Document Details | Document Controller' }

interface PageProps { params: { id: string } }

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 bg-slate-200 rounded"></div>
      <div className="card p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-4 w-full bg-slate-200 rounded"></div>)}
        </div>
      </div>
    </div>
  )
}

async function getDocumentWithDetails(id: string) {
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
  
  // Get document from view
  const { data: document, error } = await supabase.from('documents_with_details').select('*').eq('id', id).single()
  if (error || !document) return null
  
  // Get assignments - fetch separately then get profiles
  const { data: rawAssignments } = await supabase
    .from('document_assignments')
    .select('*')
    .eq('document_id', id)
    .order('role_type')
    .order('sequence_order')
  
  // Build assignments with profiles
  const assignments = []
  for (const a of (rawAssignments || [])) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', a.user_id)
      .single()
    
    assignments.push({
      id: a.id as string,
      user_id: a.user_id as string,
      role_type: a.role_type as string,
      sequence_order: (a.sequence_order || 1) as number,
      is_completed: (a.is_completed || false) as boolean,
      completed_at: a.completed_at as string | null,
      due_date: a.due_date as string | null,
      assignment_notes: a.assignment_notes as string | null,
      profiles: profile,
    })
  }
  
  // Get affected departments
  const { data: affectedRaw } = await supabase
    .from('affected_departments')
    .select('department_id')
    .eq('document_id', id)
  
  const affectedDepartments = []
  for (const ad of (affectedRaw || [])) {
    const { data: dept } = await supabase
      .from('departments')
      .select('id, name, code')
      .eq('id', ad.department_id)
      .single()
    if (dept) affectedDepartments.push(dept)
  }
  
  // Get timeline
  const { data: timeline } = await supabase
    .from('document_timeline')
    .select('*')
    .eq('document_id', id)
    .order('created_at', { ascending: false })
  
  // Get comments with profiles
  const { data: commentsRaw } = await supabase
    .from('document_comments')
    .select('id, content, created_at, user_id')
    .eq('document_id', id)
    .order('created_at', { ascending: false })
  
  const comments = []
  for (const c of (commentsRaw || [])) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', c.user_id)
      .single()
    
    comments.push({
      id: c.id as string,
      content: c.content as string,
      created_at: c.created_at as string,
      profiles: profile,
    })
  }
  
  return {
    document: {
      id: document.id as string,
      document_number: document.document_number as string,
      title: document.title as string,
      description: document.description as string | null,
      status: document.status as string,
      version: document.version as string,
      target_approval_date: document.target_approval_date as string | null,
      draft_link: document.draft_link as string | null,
      created_at: document.created_at as string,
      document_type_name: document.document_type_name as string | null,
      document_type_code: document.document_type_code as string | null,
      department_name: document.department_name as string | null,
      created_by_name: document.created_by_name as string | null,
      // NEW FIELDS
      published_at: document.published_at as string | null,
      expiry_date: document.expiry_date as string | null,
    },
    assignments,
    affectedDepartments,
    timeline: (timeline || []).map(t => ({
      id: t.id as string,
      event_type: t.event_type as string,
      event_title: t.event_title as string,
      event_description: t.event_description as string | null,
      created_at: t.created_at as string,
    })),
    comments,
    currentUser: { id: user.id, roles: roleNames },
  }
}

async function DocumentDetailWrapper({ id }: { id: string }) {
  const data = await getDocumentWithDetails(id)
  if (!data) notFound()
  return <DocumentDetail {...data} />
}

export default function DocumentPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DocumentDetailWrapper id={params.id} />
    </Suspense>
  )
}
