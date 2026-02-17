import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DocumentDetail from './DocumentDetail'
import { FileText, Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Document Details | Document Controller',
  description: 'View and manage document details',
}

interface PageProps {
  params: { id: string }
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 bg-slate-200 rounded"></div>
      <div className="card p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 w-full bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

async function getDocumentWithDetails(id: string) {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  // Get user roles
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles (name)')
    .eq('user_id', user.id)
  
  const roleNames: string[] = []
  if (userRoles) {
    for (const ur of userRoles) {
      const rolesData = ur.roles as { name: string } | { name: string }[] | null
      if (rolesData) {
        if (Array.isArray(rolesData)) {
          rolesData.forEach(r => roleNames.push(r.name))
        } else {
          roleNames.push(rolesData.name)
        }
      }
    }
  }
  
  // Get document
  const { data: document, error } = await supabase
    .from('documents_with_details')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error || !document) return null
  
  // Get assignments
  const { data: assignments } = await supabase
    .from('document_assignments')
    .select(`
      id,
      user_id,
      role_type,
      sequence_order,
      is_completed,
      completed_at,
      due_date,
      assignment_notes,
      profiles (id, full_name, email)
    `)
    .eq('document_id', id)
    .order('role_type')
    .order('sequence_order')
  
  // Get affected departments
  const { data: affectedDepts } = await supabase
    .from('affected_departments')
    .select('departments (id, name, code)')
    .eq('document_id', id)
  
  // Get timeline
  const { data: timeline } = await supabase
    .from('document_timeline')
    .select('*')
    .eq('document_id', id)
    .order('created_at', { ascending: false })
  
  // Get comments
  const { data: comments } = await supabase
    .from('document_comments')
    .select(`
      id,
      comment,
      comment_type,
      created_at,
      profiles (id, full_name, email)
    `)
    .eq('document_id', id)
    .order('created_at', { ascending: false })
  
  return {
    document,
    assignments: assignments || [],
    affectedDepartments: affectedDepts?.map(ad => ad.departments) || [],
    timeline: timeline || [],
    comments: comments || [],
    currentUser: {
      id: user.id,
      roles: roleNames,
    },
  }
}

async function DocumentDetailWrapper({ id }: { id: string }) {
  const data = await getDocumentWithDetails(id)
  
  if (!data) {
    notFound()
  }

  return <DocumentDetail {...data} />
}

export default function DocumentPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DocumentDetailWrapper id={params.id} />
    </Suspense>
  )
}
