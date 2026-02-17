'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResponse, Department, DepartmentFormData } from '@/types/database'

// ============================================================================
// Helper: Check if user has Admin or BPM role
// ============================================================================
async function checkAdminOrBPMRole(): Promise<{ allowed: boolean; userId: string | null; error?: string }> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { allowed: false, userId: null, error: 'Not authenticated' }
  }

 // Check if user has Admin or BPM role
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
  const hasPermission = roleNames.includes('Admin') || roleNames.includes('BPM')

  if (!hasPermission) {
    return { allowed: false, userId: user.id, error: 'Access denied. Admin or BPM role required.' }
  }

  return { allowed: true, userId: user.id }
}

// ============================================================================
// Get all departments (including soft-deleted for admin view)
// ============================================================================
export async function getDepartments(includeDeleted = false): Promise<ActionResponse<Department[]>> {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true })
    
    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching departments:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as Department[] }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Get a single department by ID
// ============================================================================
export async function getDepartmentById(id: string): Promise<ActionResponse<Department>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching department:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as Department }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Create a new department
// ============================================================================
export async function createDepartment(formData: DepartmentFormData): Promise<ActionResponse<Department>> {
  try {
    // Check permissions
    const { allowed, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) {
      return { success: false, error: permError || 'Access denied' }
    }

    // Validate input
    if (!formData.name.trim()) {
      return { success: false, error: 'Department name is required' }
    }

    const supabase = await createClient()
    
    // Check for duplicate name or code
    const { data: existing } = await supabase
      .from('departments')
      .select('id')
      .or(`name.eq.${formData.name},code.eq.${formData.code || ''}`)
      .is('deleted_at', null)
      .limit(1)
    
    if (existing && existing.length > 0) {
      return { success: false, error: 'A department with this name or code already exists' }
    }
    
    const { data, error } = await supabase
      .from('departments')
      .insert({
        name: formData.name.trim(),
        code: formData.code?.trim().toUpperCase() || null,
        description: formData.description?.trim() || null,
        is_active: formData.is_active ?? true,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating department:', error)
      return { success: false, error: error.message }
    }
    
    revalidatePath('/dashboard/departments')
    return { success: true, data: data as Department, message: 'Department created successfully' }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Update a department
// ============================================================================
export async function updateDepartment(id: string, formData: DepartmentFormData): Promise<ActionResponse<Department>> {
  try {
    // Check permissions
    const { allowed, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) {
      return { success: false, error: permError || 'Access denied' }
    }

    // Validate input
    if (!formData.name.trim()) {
      return { success: false, error: 'Department name is required' }
    }

    const supabase = await createClient()
    
    // Check for duplicate name or code (excluding current department)
    const { data: existing } = await supabase
      .from('departments')
      .select('id')
      .or(`name.eq.${formData.name},code.eq.${formData.code || ''}`)
      .neq('id', id)
      .is('deleted_at', null)
      .limit(1)
    
    if (existing && existing.length > 0) {
      return { success: false, error: 'A department with this name or code already exists' }
    }
    
    const { data, error } = await supabase
      .from('departments')
      .update({
        name: formData.name.trim(),
        code: formData.code?.trim().toUpperCase() || null,
        description: formData.description?.trim() || null,
        is_active: formData.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating department:', error)
      return { success: false, error: error.message }
    }
    
    revalidatePath('/dashboard/departments')
    return { success: true, data: data as Department, message: 'Department updated successfully' }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Soft delete a department
// ============================================================================
export async function deleteDepartment(id: string): Promise<ActionResponse> {
  try {
    // Check permissions
    const { allowed, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) {
      return { success: false, error: permError || 'Access denied' }
    }

    const supabase = await createClient()
    
    // Check if department is being used by any profiles
    const { data: usersInDept } = await supabase
      .from('profiles')
      .select('id')
      .eq('department_id', id)
      .limit(1)
    
    if (usersInDept && usersInDept.length > 0) {
      return { 
        success: false, 
        error: 'Cannot delete department: Users are still assigned to it. Please reassign users first.' 
      }
    }

    // Check if department is being used by any documents
    const { data: docsInDept } = await supabase
      .from('documents')
      .select('id')
      .eq('department_id', id)
      .eq('is_deleted', false)
      .limit(1)
    
    if (docsInDept && docsInDept.length > 0) {
      return { 
        success: false, 
        error: 'Cannot delete department: Documents are associated with it.' 
      }
    }
    
    // Perform soft delete
    const { error } = await supabase
      .from('departments')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting department:', error)
      return { success: false, error: error.message }
    }
    
    revalidatePath('/dashboard/departments')
    return { success: true, message: 'Department deleted successfully' }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Restore a soft-deleted department
// ============================================================================
export async function restoreDepartment(id: string): Promise<ActionResponse<Department>> {
  try {
    // Check permissions
    const { allowed, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) {
      return { success: false, error: permError || 'Access denied' }
    }

    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('departments')
      .update({
        deleted_at: null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error restoring department:', error)
      return { success: false, error: error.message }
    }
    
    revalidatePath('/dashboard/departments')
    return { success: true, data: data as Department, message: 'Department restored successfully' }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Toggle department active status
// ============================================================================
export async function toggleDepartmentStatus(id: string): Promise<ActionResponse<Department>> {
  try {
    // Check permissions
    const { allowed, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) {
      return { success: false, error: permError || 'Access denied' }
    }

    const supabase = await createClient()
    
    // Get current status
    const { data: current, error: fetchError } = await supabase
      .from('departments')
      .select('is_active')
      .eq('id', id)
      .single()
    
    if (fetchError || !current) {
      return { success: false, error: 'Department not found' }
    }
    
    // Toggle status
    const { data, error } = await supabase
      .from('departments')
      .update({
        is_active: !current.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error toggling department status:', error)
      return { success: false, error: error.message }
    }
    
    revalidatePath('/dashboard/departments')
    return { 
      success: true, 
      data: data as Department, 
      message: `Department ${data.is_active ? 'activated' : 'deactivated'} successfully` 
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
