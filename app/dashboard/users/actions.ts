'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResponse, Profile, Role } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

export interface UserWithRoles {
  id: string
  full_name: string | null
  email: string | null
  employee_id: string | null
  phone: string | null
  job_title: string | null
  department_id: string | null
  department_name: string | null
  department_code: string | null
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
  roles: string[]
  role_ids: string[]
}

export interface UpdateProfileData {
  full_name: string
  employee_id?: string
  phone?: string
  job_title?: string
  department_id: string | null
  is_active: boolean
}

export interface CreateUserData {
  email: string
  password: string
  full_name: string
  department_id?: string | null
  role_ids?: string[]
}

// ============================================================================
// Helper: Check if current user has Admin or BPM role
// ============================================================================
async function checkAdminOrBPMRole(): Promise<{ allowed: boolean; userId: string | null; error?: string }> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { allowed: false, userId: null, error: 'Not authenticated' }
  }

  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select(`
      role_id,
      roles (name)
    `)
    .eq('user_id', user.id)
  
  if (rolesError) {
    return { allowed: false, userId: user.id, error: 'Failed to check permissions' }
  }

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
  
  const hasPermission = roleNames.includes('Admin') || roleNames.includes('BPM')

  if (!hasPermission) {
    return { allowed: false, userId: user.id, error: 'Access denied. Admin or BPM role required.' }
  }

  return { allowed: true, userId: user.id }
}

// ============================================================================
// Get all users with profiles and roles
// ============================================================================
export async function getUsers(): Promise<ActionResponse<UserWithRoles[]>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('users_with_roles')
      .select('*')
      .order('full_name', { ascending: true })
    
    if (error) {
      console.error('Error fetching users:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as UserWithRoles[] }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Get single user by ID
// ============================================================================
export async function getUserById(id: string): Promise<ActionResponse<UserWithRoles>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('users_with_roles')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching user:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as UserWithRoles }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Get all roles
// ============================================================================
export async function getRoles(): Promise<ActionResponse<Role[]>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) {
      console.error('Error fetching roles:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as Role[] }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Update user profile
// ============================================================================
export async function updateUserProfile(
  userId: string, 
  data: UpdateProfileData
): Promise<ActionResponse<Profile>> {
  try {
    const { allowed, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) {
      return { success: false, error: permError || 'Access denied' }
    }

    const supabase = await createClient()
    
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name.trim(),
        employee_id: data.employee_id?.trim() || null,
        phone: data.phone?.trim() || null,
        job_title: data.job_title?.trim() || null,
        department_id: data.department_id || null,
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: error.message }
    }
    
    revalidatePath('/dashboard/users')
    return { success: true, data: updated as Profile, message: 'Profile updated successfully' }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Update user roles
// ============================================================================
export async function updateUserRoles(
  userId: string, 
  roleIds: string[]
): Promise<ActionResponse> {
  try {
    const { allowed, userId: currentUserId, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) {
      return { success: false, error: permError || 'Access denied' }
    }

    const supabase = await createClient()
    
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
    
    if (deleteError) {
      console.error('Error deleting existing roles:', deleteError)
      return { success: false, error: deleteError.message }
    }
    
    if (roleIds.length > 0) {
      const newRoles = roleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId,
        assigned_by: currentUserId,
        assigned_at: new Date().toISOString(),
      }))
      
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert(newRoles)
      
      if (insertError) {
        console.error('Error inserting roles:', insertError)
        return { success: false, error: insertError.message }
      }
    }
    
    revalidatePath('/dashboard/users')
    return { success: true, message: 'Roles updated successfully' }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Toggle user active status
// ============================================================================
export async function toggleUserStatus(userId: string): Promise<ActionResponse<Profile>> {
  try {
    const { allowed, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) {
      return { success: false, error: permError || 'Access denied' }
    }

    const supabase = await createClient()
    
    const { data: current, error: fetchError } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', userId)
      .single()
    
    if (fetchError || !current) {
      return { success: false, error: 'User not found' }
    }
    
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        is_active: !current.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Error toggling status:', error)
      return { success: false, error: error.message }
    }
    
    revalidatePath('/dashboard/users')
    return { 
      success: true, 
      data: updated as Profile, 
      message: `User ${updated.is_active ? 'activated' : 'deactivated'} successfully` 
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Create new user (requires service role)
// ============================================================================
export async function createUser(data: CreateUserData): Promise<ActionResponse> {
  try {
    const { allowed, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) {
      return { success: false, error: permError || 'Access denied' }
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return { 
        success: false, 
        error: 'Service role key not configured. Please add SUPABASE_SERVICE_ROLE_KEY to environment variables.' 
      }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return { success: false, error: authError.message }
    }

    if (!authUser.user) {
      return { success: false, error: 'Failed to create user' }
    }

    const supabase = await createClient()
    
    await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        department_id: data.department_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.user.id)

    if (data.role_ids && data.role_ids.length > 0) {
      const { allowed: stillAllowed, userId: currentUserId } = await checkAdminOrBPMRole()
      if (stillAllowed && currentUserId) {
        const newRoles = data.role_ids.map(roleId => ({
          user_id: authUser.user!.id,
          role_id: roleId,
          assigned_by: currentUserId,
          assigned_at: new Date().toISOString(),
        }))
        
        await supabase.from('user_roles').insert(newRoles)
      }
    }
    
    revalidatePath('/dashboard/users')
    return { success: true, message: 'User created successfully' }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Deactivate user
// ============================================================================
export async function deactivateUser(userId: string): Promise<ActionResponse> {
  try {
    const { allowed, userId: currentUserId, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) {
      return { success: false, error: permError || 'Access denied' }
    }

    if (userId === currentUserId) {
      return { success: false, error: 'You cannot deactivate your own account' }
    }

    const supabase = await createClient()
    
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', userId)
    
    if (error) {
      console.error('Error deactivating user:', error)
      return { success: false, error: error.message }
    }
    
    revalidatePath('/dashboard/users')
    return { success: true, message: 'User deactivated successfully' }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
