import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DocumentForm from './DocumentForm'
import { getFormOptions } from './actions'

export const metadata = {
  title: 'New Document | Document Controller',
  description: 'Create a new document',
}

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="h-8 w-48 bg-slate-200 rounded animate-pulse"></div>
      <div className="card p-6 space-y-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-10 w-full bg-slate-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

async function NewDocumentWrapper() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const result = await getFormOptions()
  
  if (!result.success || !result.data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Failed to load form options. Please try again.</p>
      </div>
    )
  }

  return (
    <DocumentForm
      documentTypes={result.data.documentTypes}
      departments={result.data.departments}
      users={result.data.users}
      currentUserId={user.id}
    />
  )
}

export default function NewDocumentPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <NewDocumentWrapper />
    </Suspense>
  )
}
