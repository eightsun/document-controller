import { Suspense } from 'react'
import { getUsers, getRoles } from './actions'
import { getDepartments } from '../departments/actions'
import UsersClient from './UsersClient'
import { Users, Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Users | Document Controller',
  description: 'Manage system users and role assignments',
}

function UsersLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-slate-200 rounded"></div>
            <div className="h-10 w-32 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
        <div className="p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
              <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 w-48 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 w-32 bg-slate-200 rounded"></div>
              </div>
              <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
              <div className="h-8 w-8 bg-slate-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

async function UsersList() {
  const [usersResult, rolesResult, departmentsResult] = await Promise.all([
    getUsers(),
    getRoles(),
    getDepartments(),
  ])
  
  if (!usersResult.success) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <Users className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Error Loading Users</h3>
        <p className="text-slate-500">{usersResult.error}</p>
      </div>
    )
  }

  return (
    <UsersClient 
      initialUsers={usersResult.data || []} 
      roles={rolesResult.data || []}
      departments={departmentsResult.data || []}
    />
  )
}

export default function UsersPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Users</h1>
          <p className="text-slate-500 mt-1">
            Manage user profiles and role assignments
          </p>
        </div>
      </div>

      {/* Users List */}
      <Suspense fallback={<UsersLoadingSkeleton />}>
        <UsersList />
      </Suspense>
    </div>
  )
}
