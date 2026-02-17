import { Suspense } from 'react'
import { getDepartments } from './actions'
import DepartmentsClient from './DepartmentsClient'
import { Building2, Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Departments | Document Controller',
  description: 'Manage company departments',
}

// Loading skeleton component
function DepartmentsLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-slate-200 rounded"></div>
            <div className="h-10 w-40 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
        <div className="p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
              <div className="h-10 w-10 bg-slate-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 w-48 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 w-32 bg-slate-200 rounded"></div>
              </div>
              <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-slate-200 rounded-lg"></div>
                <div className="h-8 w-8 bg-slate-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Server component to fetch data
async function DepartmentsList() {
  const result = await getDepartments(false)
  
  if (!result.success) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <Building2 className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Error Loading Departments</h3>
        <p className="text-slate-500">{result.error}</p>
      </div>
    )
  }

  return <DepartmentsClient initialDepartments={result.data || []} />
}

export default function DepartmentsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Departments</h1>
          <p className="text-slate-500 mt-1">
            Manage company departments for document organization
          </p>
        </div>
      </div>

      {/* Departments List */}
      <Suspense fallback={<DepartmentsLoadingSkeleton />}>
        <DepartmentsList />
      </Suspense>
    </div>
  )
}
