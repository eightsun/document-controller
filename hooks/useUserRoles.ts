'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { Profile } from '@/types/database'

interface UserRolesResult {
  roles: string[]
  profile: Profile | null
  isLoading: boolean
  error: string | null
  isAdmin: boolean
  isBPM: boolean
  isMQSReps: boolean
  isSME: boolean
  isApprover: boolean
  hasRole: (roleName: string) => boolean
  hasAnyRole: (roleNames: string[]) => boolean
}

export function useUserRoles(): UserRolesResult {
  const [roles, setRoles] = useState<string[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserRoles() {
      try {
        const supabase = createClient()
        
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          setError('Not authenticated')
          setIsLoading(false)
          return
        }

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
        } else {
          setProfile(profileData)
        }

        // Fetch roles
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select(`
            role_id,
            roles (name)
          `)
          .eq('user_id', user.id)

        if (rolesError) {
          setError('Failed to fetch roles')
          console.error('Error fetching roles:', rolesError)
        } else {
          // Extract role names from the query result
          const roleNames: string[] = []
          if (userRoles) {
            for (const ur of userRoles) {
              const roles = ur.roles as { name: string } | { name: string }[] | null
              if (roles) {
                if (Array.isArray(roles)) {
                  roles.forEach(r => roleNames.push(r.name))
                } else {
                  roleNames.push(roles.name)
                }
              }
            }
          }
          setRoles(roleNames)
        }

    fetchUserRoles()
  }, [])

  const hasRole = (roleName: string) => roles.includes(roleName)
  const hasAnyRole = (roleNames: string[]) => roleNames.some(r => roles.includes(r))

  return {
    roles,
    profile,
    isLoading,
    error,
    isAdmin: hasRole('Admin'),
    isBPM: hasRole('BPM'),
    isMQSReps: hasRole('MQS Reps'),
    isSME: hasRole('SME'),
    isApprover: hasRole('Approver'),
    hasRole,
    hasAnyRole,
  }
}
