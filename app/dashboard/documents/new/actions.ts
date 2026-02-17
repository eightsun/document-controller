'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResponse, DocumentType, Department } from '@/types/database'

const COMPANY_CODE = 'MRT'

export interface UserOption {
  id: string
  full_name: string | null
  email: string | null
  department_name: string | null
  roles: string[]
}

export interface CreateDocumentData {
  title: string
  description?: string
  document_type_id: string
  department_id: string
  sharepoint_link: string
  target_approval_date: string
  affected_department_ids: string[]
  reviewer_ids: string[]
  approver_ids: string[]
}

async function checkCanCreateDocument(): Promise<{ allowed: boolean; userId: string | null; error?: string }> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { allowed: false, userId: null, error: 'Not authenticated' }
  }

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
  
  const hasPermission = roleNames.includes('Admin') || roleNames.includes('BPM') || roleNames.includes('MQS Reps')
  if (!hasPermission) {
    return { allowed: false, userId: user.id, error: 'Access denied. MQS Reps, Admin, or BPM role required.' }
  }

  return { allowed: true, userId: user.id }
}

export async function getDocumentTypes(): Promise<ActionResponse<DocumentType[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('document_types')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })
    
    if (error) return { success: false, error: error.message }
    return { success: true, data: data as DocumentType[] }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getActiveDepartments(): Promise<ActionResponse<Department[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name', { ascending: true })
    
    if (error) return { success: false, error: error.message }
    return { success: true, data: data as Department[] }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getAllActiveUsers(): Promise<ActionResponse<UserOption[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('users_with_roles')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true })
    
    if (error) return { success: false, error: error.message }
    return { success: true, data: data as UserOption[] }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getCurrentUser(): Promise<ActionResponse<UserOption>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated' }
    
    const { data, error } = await supabase
      .from('users_with_roles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) return { success: false, error: error.message }
    return { success: true, data: data as UserOption }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function generateDocumentNumber(departmentId: string, documentTypeId: string): Promise<ActionResponse<string>> {
  try {
    const supabase = await createClient()
    
    const { data: department } = await supabase.from('departments').select('code').eq('id', departmentId).single()
    const { data: documentType } = await supabase.from('document_types').select('code').eq('id', documentTypeId).single()
    
    if (!department?.code || !documentType?.code) {
      return { success: false, error: 'Department or document type code not found' }
    }
    
    const deptCode = department.code.substring(0, 3).toUpperCase().padEnd(3, 'X')
    const docTypeCode = documentType.code.substring(0, 3).toUpperCase().padEnd(3, 'X')
    const prefix = `${COMPANY_CODE}-${deptCode}-${docTypeCode}`
    
    const { data: latestDoc } = await supabase
      .from('documents')
      .select('document_number')
      .like('document_number', `${prefix}-%`)
      .not('document_number', 'like', 'PENDING-%')
      .order('document_number', { ascending: false })
      .limit(1)
      .single()
    
    let sequence = 1
    if (latestDoc?.document_number) {
      const parts = latestDoc.document_number.split('-')
      const lastSequence = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(lastSequence)) sequence = lastSequence + 1
    }
    
    return { success: true, data: `${prefix}-${sequence.toString().padStart(3, '0')}` }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function createDocument(data: CreateDocumentData): Promise<ActionResponse<{ id: string }>> {
  try {
    const { allowed, userId, error: permError } = await checkCanCreateDocument()
    if (!allowed || !userId) return { success: false, error: permError || 'Access denied' }

    if (!data.title.trim()) return { success: false, error: 'Document title is required' }
    if (!data.document_type_id) return { success: false, error: 'Document type is required' }
    if (!data.department_id) return { success: false, error: 'Department is required' }
    if (!data.sharepoint_link.trim()) return { success: false, error: 'SharePoint link is required' }
    if (!data.target_approval_date) return { success: false, error: 'Target approval date is required' }
    
    const targetDate = new Date(data.target_approval_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (targetDate < today) return { success: false, error: 'Target approval date must be in the future' }
    
    if (data.affected_department_ids.length === 0) return { success: false, error: 'At least one affected department is required' }
    if (data.approver_ids.length === 0) return { success: false, error: 'At least one approver is required' }

    const supabase = await createClient()
    const tempDocNumber = `PENDING-${Date.now()}`
    
    const { data: newDocument, error: docError } = await supabase
      .from('documents')
      .insert({
        document_number: tempDocNumber,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        document_type_id: data.document_type_id,
        department_id: data.department_id,
        draft_link: data.sharepoint_link.trim(),
        status: 'Initiation',
        version: '1.0',
        revision_number: 0,
        target_approval_date: data.target_approval_date,
        created_by: userId,
      })
      .select('id')
      .single()
    
    if (docError || !newDocument) {
      console.error('Error creating document:', docError)
      return { success: false, error: docError?.message || 'Failed to create document' }
    }
    
    const documentId = newDocument.id
    
    // Create affected departments
    if (data.affected_department_ids.length > 0) {
      const affectedDeptInserts = data.affected_department_ids.map(deptId => ({
        document_id: documentId,
        department_id: deptId,
      }))
      await supabase.from('affected_departments').insert(affectedDeptInserts)
    }
    
    // Create document assignments with CORRECT ENUM values (lowercase)
    const assignments: Array<{
      document_id: string
      user_id: string
      role_type: string
      sequence_order: number
      assigned_by: string
    }> = []
    
    // Add submitter (current user)
    assignments.push({
      document_id: documentId,
      user_id: userId,
      role_type: 'submitter',  // lowercase
      sequence_order: 1,
      assigned_by: userId,
    })
    
    // Add reviewers
    data.reviewer_ids.forEach((id, index) => {
      assignments.push({
        document_id: documentId,
        user_id: id,
        role_type: 'reviewer',  // lowercase - single type for all reviewers
        sequence_order: index + 1,
        assigned_by: userId,
      })
    })
    
    // Add approvers
    data.approver_ids.forEach((id, index) => {
      assignments.push({
        document_id: documentId,
        user_id: id,
        role_type: 'approver',  // lowercase
        sequence_order: index + 1,
        assigned_by: userId,
      })
    })
    
     if (assignments.length > 0) {
      const { data: insertedAssignments, error: assignError } = await supabase
        .from('document_assignments')
        .insert(assignments)
        .select()
      
      if (assignError) {
        console.error('Error creating assignments:', assignError)
        // Don't fail the whole operation, but log it
      } else {
        console.log('Created assignments:', insertedAssignments?.length)
      }
    }
    
    // Create initial timeline entry with CORRECT ENUM value
    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'created',  // lowercase
      event_title: 'Document Initiated',
      event_description: `Document "${data.title}" has been created.`,
      performed_by: userId,
      old_status: null,
      new_status: 'Initiation',
    })
    
    revalidatePath('/dashboard/documents')
    return { success: true, data: { id: documentId }, message: 'Document created successfully' }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
