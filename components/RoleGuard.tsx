'use client'

import { ReactNode } from 'react'
import { useUserRoles } from '@/hooks/useUserRoles'
import { Shield, Loader2 } from 'lucide-react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: string[]
  fallback?: ReactNode
  showAccessDenied?: boolean
}

export default function RoleGuard({
  children,
  allowedRoles,
  fallback,
  showAccessDenied = true,
}: RoleGuardProps) {
  const { roles, isLoading, hasAnyRole } = useUserRoles()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
      </div>
    )
  }

  if (!hasAnyRole(allowedRoles)) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showAccessDenied) {
      return (
        <div className="card p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Access Denied</h3>
          <p className="text-slate-500 mb-4">
            You don&apos;t have permission to access this page.
          </p>
          <p className="text-sm text-slate-400">
            Required roles: {allowedRoles.join(', ')}
          </p>
          {roles.length > 0 && (
            <p className="text-sm text-slate-400 mt-1">
              Your roles: {roles.join(', ')}
            </p>
          )}
        </div>
      )
    }

    return null
  }

  return <>{children}</>
}
