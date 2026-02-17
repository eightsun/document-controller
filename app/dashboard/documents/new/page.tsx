import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getDocumentTypes, getActiveDepartments, getAllActiveUsers, getCurrentUser } from './actions'
import DocumentForm from './DocumentForm'
import { FileText } from 'lucide-react'

export const metadata = {
  title: 'New Document | Document Controller',
  description: 'Create a new document for review and approval',
}

function FormLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="card p-6">
        <div className="space-y-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i}>
              <div className="h-4 w-32 bg-slate-200 rounded mb-2"></div>
              <div className="h-10 w-full bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

async function checkAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles (name)')
    .eq('user_id', user.id)
  
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
  
  if (!roleNames.includes('Admin') && !roleNames.includes('BPM') && !roleNames.includes('MQS Reps')) {
    redirect('/dashboard')
  }
  return true
}

async function DocumentFormWrapper() {
  await checkAccess()
  
  const [documentTypesResult, departmentsResult, usersResult, currentUserResult] = await Promise.all([
    getDocumentTypes(),
    getActiveDepartments(),
    getAllActiveUsers(),
    getCurrentUser(),
  ])
  
  if (!documentTypesResult.success || !departmentsResult.success || !usersResult.success) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <FileText className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Error Loading Form</h3>
        <p className="text-slate-500">{documentTypesResult.error || departmentsResult.error || usersResult.error}</p>
      </div>
    )
  }

  const allUsers = usersResult.data || []

  return (
    <DocumentForm 
      documentTypes={documentTypesResult.data || []}
      departments={departmentsResult.data || []}
      users={allUsers}
      currentUser={currentUserResult.data || null}
    />
  )
}

export default function NewDocumentPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">New Document</h1>
          <p className="text-slate-500 mt-1">Create a new document for review and approval</p>
        </div>
      </div>
      <Suspense fallback={<FormLoadingSkeleton />}>
        <DocumentFormWrapper />
      </Suspense>
    </div>
  )
}
