'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResponse, LegalEntity } from '@/types/database'

interface LegalEntityFormData {
  name: string
  code: string
  description: string
  is_active: boolean
}

// ============================================================================
// Helper: Check if user has Admin or BPM role
// ============================================================================
async function checkAdminOrBPMRole(): Promise<{ allowed: boolean; userId: string | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { allowed: false, userId: null, error: 'Not authenticated' }

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role_id, roles (name)')
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
  if (!roleNames.includes('Admin') && !roleNames.includes('BPM')) {
    return { allowed: false, userId: user.id, error: 'Access denied. Admin or BPM role required.' }
  }
  return { allowed: true, userId: user.id }
}

// ============================================================================
// Get all legal entities
// ============================================================================
export async function getLegalEntities(includeDeleted = false): Promise<ActionResponse<LegalEntity[]>> {
  try {
    const supabase = await createClient()
    let query = supabase.from('legal_entities').select('*').order('name', { ascending: true })
    if (!includeDeleted) query = query.is('deleted_at', null)
    const { data, error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true, data: data as LegalEntity[] }
  } catch {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Create a new legal entity
// ============================================================================
export async function createLegalEntity(formData: LegalEntityFormData): Promise<ActionResponse<LegalEntity>> {
  try {
    const { allowed, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) return { success: false, error: permError || 'Access denied' }

    if (!formData.name.trim()) return { success: false, error: 'Legal entity name is required' }
    if (!formData.code.trim()) return { success: false, error: 'Legal entity code is required' }

    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('legal_entities')
      .select('id')
      .or(`name.eq.${formData.name.trim()},code.eq.${formData.code.trim().toUpperCase()}`)
      .is('deleted_at', null)
      .limit(1)

    if (existing && existing.length > 0) {
      return { success: false, error: 'A legal entity with this name or code already exists' }
    }

    const { data, error } = await supabase
      .from('legal_entities')
      .insert({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description?.trim() || null,
        is_active: formData.is_active ?? true,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/legal-entities')
    revalidatePath('/dashboard/departments')
    return { success: true, data: data as LegalEntity, message: 'Legal entity created successfully' }
  } catch {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Update a legal entity
// ============================================================================
export async function updateLegalEntity(id: string, formData: LegalEntityFormData): Promise<ActionResponse<LegalEntity>> {
  try {
    const { allowed, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) return { success: false, error: permError || 'Access denied' }

    if (!formData.name.trim()) return { success: false, error: 'Legal entity name is required' }
    if (!formData.code.trim()) return { success: false, error: 'Legal entity code is required' }

    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('legal_entities')
      .select('id')
      .or(`name.eq.${formData.name.trim()},code.eq.${formData.code.trim().toUpperCase()}`)
      .neq('id', id)
      .is('deleted_at', null)
      .limit(1)

    if (existing && existing.length > 0) {
      return { success: false, error: 'A legal entity with this name or code already exists' }
    }

    const { data, error } = await supabase
      .from('legal_entities')
      .update({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description?.trim() || null,
        is_active: formData.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/legal-entities')
    revalidatePath('/dashboard/departments')
    return { success: true, data: data as LegalEntity, message: 'Legal entity updated successfully' }
  } catch {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Soft delete a legal entity
// ============================================================================
export async function deleteLegalEntity(id: string): Promise<ActionResponse> {
  try {
    const { allowed, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) return { success: false, error: permError || 'Access denied' }

    const supabase = await createClient()

    // Block if departments reference this legal entity
    const { data: depts } = await supabase
      .from('departments')
      .select('id')
      .eq('legal_entity_id', id)
      .is('deleted_at', null)
      .limit(1)

    if (depts && depts.length > 0) {
      return { success: false, error: 'Cannot delete: Departments are still linked to this legal entity. Reassign them first.' }
    }

    const { error } = await supabase
      .from('legal_entities')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/legal-entities')
    return { success: true, message: 'Legal entity deleted successfully' }
  } catch {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Toggle legal entity active status
// ============================================================================
export async function toggleLegalEntityStatus(id: string): Promise<ActionResponse<LegalEntity>> {
  try {
    const { allowed, error: permError } = await checkAdminOrBPMRole()
    if (!allowed) return { success: false, error: permError || 'Access denied' }

    const supabase = await createClient()

    const { data: current, error: fetchError } = await supabase
      .from('legal_entities')
      .select('is_active')
      .eq('id', id)
      .single()

    if (fetchError || !current) return { success: false, error: 'Legal entity not found' }

    const { data, error } = await supabase
      .from('legal_entities')
      .update({ is_active: !current.is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/legal-entities')
    return {
      success: true,
      data: data as LegalEntity,
      message: `Legal entity ${data.is_active ? 'activated' : 'deactivated'} successfully`,
    }
  } catch {
    return { success: false, error: 'An unexpected error occurred' }
  }
}
