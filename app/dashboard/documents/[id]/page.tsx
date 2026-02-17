import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DocumentDetail from './DocumentDetail'

export const metadata = {
  title: 'Document Details | Document Controller',
}

interface PageProps {
  params: { id: string }
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 bg-slate-200 rounded"></div>
      <div className="card p-6"><div className="space-y-4">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-4 w-full bg-slate-200 rounded"></div>)}</div></div>
    </div>
  )
}

async function getDocumentWithDetails(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
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
  
  const { data: document, error } = await supabase.from('documents_with_details').select('*').eq('id', id).single()
  if (error || !document) return null
  
  const { data: assignmentsRaw } = await supabase
    .from('document_assignments')
    .select('id, user_id, role_type, sequence_order, is_completed, completed_at, due_date, assignment_notes, profiles (id, full_name, email)')
    .eq('document_id', id)
    .order('role_type')
    .order('sequence_order')
  
  const assignments = (assignmentsRaw || []).map(a => ({
    id: a.id as string,
    user_id: a.user_id as string,
    role_type: a.role_type as string,
    sequence_order: a.sequence_order as number,
    is_completed: a.is_completed as boolean,
    completed_at: a.completed_at as string | null,
    due_date: a.due_date as string | null,
    assignment_notes: a.assignment_notes as string | null,
    profiles: Array.isArray(a.profiles) ? a.profiles[0] || null : a.profiles as { id: string; full_name: string | null; email: string | null } | null,
  }))
  
  const { data: affectedDeptsRaw } = await supabase.from('affected_departments').select('departments (id, name, code)').eq('document_id', id)
  const affectedDepartments = (affectedDeptsRaw || []).map(ad => {
    const dept = ad.departments
    if (Array.isArray(dept)) return dept[0] || null
    return dept as { id: string; name: string; code: string | null } | null
  })
  
  const { data: timeline } = await supabase.from('document_timeline').select('*').eq('document_id', id).order('created_at', { ascending: false })
  
  const { data: commentsRaw } = await supabase
    .from('document_comments')
    .select('id, content, created_at, profiles (id, full_name, email)')
    .eq('document_id', id)
    .order('created_at', { ascending: false })
  
  const comments = (commentsRaw || []).map(c => ({
    id: c.id as string,
    content: c.content as string,
    created_at: c.created_at as string,
    profiles: Array.isArray(c.profiles) ? c.profiles[0] || null : c.profiles as { id: string; full_name: string | null; email: string | null } | null,
  }))
  
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
