'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResponse, DocumentType, Department } from '@/types/database'

// ============================================================================
// Constants
// ============================================================================
const COMPANY_CODE = 'MRT' // Meratus

// ============================================================================
// Types
// ============================================================================

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
  sme_ids: string[]
  bpm_ids: string[]
  approver_ids: string[]
  mqs_reps_ids: string[]
}

export interface AssignDocumentNumberData {
  document_id: string
  document_number?: string
}

// ============================================================================
// Helper: Check if current user can create documents
// ============================================================================
async function checkCanCreateDocument(): Promise<{ allowed: boolean; userId: string | null; error?: string }> {
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
  
  const hasPermission = roleNames.includes('Admin') || roleNames.includes('BPM') || roleNames.includes('MQS Reps')

  if (!hasPermission) {
    return { allowed: false, userId: user.id, error: 'Access denied. MQS Reps, Admin, or BPM role required.' }
  }

  return { allowed: true, userId: user.id }
}

// ============================================================================
// Helper: Check if current user is Admin or BPM
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
// Get Document Types
// ============================================================================
export async function getDocumentTypes(): Promise<ActionResponse<DocumentType[]>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('document_types')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })
    
    if (error) {
      console.error('Error fetching document types:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as DocumentType[] }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Get Active Departments
// ============================================================================
export async function getActiveDepartments(): Promise<ActionResponse<Department[]>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name', { ascending: true })
    
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
// Get Users by Role
// ============================================================================
export async function getUsersByRole(roleName: string): Promise<ActionResponse<UserOption[]>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('users_with_roles')
      .select('*')
      .eq('is_active', true)
      .contains('roles', [roleName])
    
    if (error) {
      console.error('Error fetching users by role:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as UserOption[] }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Get All Active Users
// ============================================================================
export async function getAllActiveUsers(): Promise<ActionResponse<UserOption[]>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('users_with_roles')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true })
    
    if (error) {
      console.error('Error fetching users:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as UserOption[] }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Get Current User Info
// ============================================================================
export async function getCurrentUser(): Promise<ActionResponse<UserOption>> {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }
    
    const { data, error } = await supabase
      .from('users_with_roles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) {
      console.error('Error fetching current user:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as UserOption }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Generate Document Number
// Format: MRT-AST-PLC-001 (Company-Department-DocType-Sequence)
// ============================================================================
export async function generateDocumentNumber(
  departmentId: string,
  documentTypeId: string
): Promise<ActionResponse<string>> {
  try {
    const supabase = await createClient()
    
    const { data: department } = await supabase
      .from('departments')
      .select('code')
      .eq('id', departmentId)
      .single()
    
    const { data: documentType } = await supabase
      .from('document_types')
      .select('code')
      .eq('id', documentTypeId)
      .single()
    
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
      .neq('document_number', 'Waiting Document Verification')
      .order('document_number', { ascending: false })
      .limit(1)
      .single()
    
    let sequence = 1
    if (latestDoc?.document_number) {
      const parts = latestDoc.document_number.split('-')
      const lastSequence = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }
    
    const documentNumber = `${prefix}-${sequence.toString().padStart(3, '0')}`
    
    return { success: true, data: documentNumber }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Validate Document Number Format
// ============================================================================
function validateDocumentNumberFormat(docNumber: string): boolean {
  const pattern = /^[A-Z]{3}-[A-Z]{3}-[A-Z]{3}-\d{3}$/
  return pattern.test(docNumber)
}

// ============================================================================
// Create Document
// ============================================================================
export async function createDocument(data: CreateDocumentData): Promise<ActionResponse<{ id: string }>> {
  try {
    const { allowed, userId, error: permError } = await checkCanCreateDocument()
    if (!allowed || !userId) {
      return { success: false, error: permError || 'Access denied' }
    }

    // Validation
    if (!data.title.trim()) {
      return { success: false, error: 'Document title is required' }
    }
    
    if (!data.document_type_id) {
      return { success: false, error: 'Document type is required' }
    }
    
    if (!data.department_id) {
      return { success: false, error: 'Department is required' }
    }
    
    if (!data.sharepoint_link.trim()) {
      return { success: false, error: 'SharePoint link is required' }
    }
    
    if (!data.sharepoint_link.includes('sharepoint.com') && !data.sharepoint_link.startsWith('http')) {
      return { success: false, error: 'Please provide a valid SharePoint link' }
    }
    
    if (!data.target_approval_date) {
      return { success: false, error: 'Target approval date is required' }
    }
    
    const targetDate = new Date(data.target_approval_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (targetDate < today) {
      return { success: false, error: 'Target approval date must be in the future' }
    }
    
    if (data.affected_department_ids.length === 0) {
      return { success: false, error: 'At least one affected department is required' }
    }
    
    if (data.approver_ids.length === 0) {
      return { success: false, error: 'At least one approver is required' }
    }

    const supabase = await createClient()
    
    // Create document with temporary unique document number
    // Format: PENDING-{timestamp} (will be replaced by BPM later)
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
    const affectedDeptInserts = data.affected_department_ids.map(deptId => ({
      document_id: documentId,
      department_id: deptId,
    }))
    
    if (affectedDeptInserts.length > 0) {
      const { error: affectedError } = await supabase
        .from('affected_departments')
        .insert(affectedDeptInserts)
      
      if (affectedError) {
        console.error('Error creating affected departments:', affectedError)
      }
    }
    
    // Create document assignments
    const assignments: Array<{
      document_id: string
      user_id: string
      role_type: string
      sequence_order: number
      assigned_by: string
    }> = []
    
    // Add MQS Reps (submitters)
    const mqsRepsIds = data.mqs_reps_ids.length > 0 ? data.mqs_reps_ids : [userId]
    mqsRepsIds.forEach((id, index) => {
      assignments.push({
        document_id: documentId,
        user_id: id,
        role_type: 'Submitter',
        sequence_order: index + 1,
        assigned_by: userId,
      })
    })
    
    // Add SMEs
    data.sme_ids.forEach((id, index) => {
      assignments.push({
        document_id: documentId,
        user_id: id,
        role_type: 'SME',
        sequence_order: index + 1,
        assigned_by: userId,
      })
    })
    
    // Add BPMs
    data.bpm_ids.forEach((id, index) => {
      assignments.push({
        document_id: documentId,
        user_id: id,
        role_type: 'BPM',
        sequence_order: index + 1,
        assigned_by: userId,
      })
    })
    
    // Add Approvers
    data.approver_ids.forEach((id, index) => {
      assignments.push({
        document_id: documentId,
        user_id: id,
        role_type: 'Approver',
        sequence_order: index + 1,
        assigned_by: userId,
      })
    })
    
    if (assignments.length > 0) {
      const { error: assignError } = await supabase
        .from('document_assignments')
        .insert(assignments)
      
      if (assignError) {
        console.error('Error creating assignments:', assignError)
      }
    }
    
    // Create initial timeline entry
    await supabase
      .from('document_timeline')
      .insert({
        document_id: documentId,
        event_type: 'Created',
        event_title: 'Document Initiated',
        event_description: `Document "${data.title}" has been created and is waiting for document number verification.`,
        performed_by: userId,
        old_status: null,
        new_status: 'Initiation',
      })
    
    revalidatePath('/dashboard/documents')
    return { 
      success: true, 
      data: { id: documentId }, 
      message: 'Document created successfully. Waiting for BPM to assign document number.' 
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Assign Document Number (BPM Only)
// ============================================================================
export async function assignDocumentNumber(
  data: AssignDocumentNumberData
): Promise<ActionResponse<{ document_number: string }>> {
  try {
    const { allowed, userId, error: permError } = await checkAdminOrBPMRole()
    if (!allowed || !userId) {
      return { success: false, error: permError || 'Access denied. Only BPM or Admin can assign document numbers.' }
    }

    const supabase = await createClient()
    
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, department_id, document_type_id, document_number')
      .eq('id', data.document_id)
      .single()
    
    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }
    
    let documentNumber: string
    
    if (data.document_number && data.document_number.trim()) {
      documentNumber = data.document_number.trim().toUpperCase()
      
      if (!validateDocumentNumberFormat(documentNumber)) {
        return { 
          success: false, 
          error: 'Invalid document number format. Expected: XXX-XXX-XXX-NNN (e.g., MRT-AST-PLC-001)' 
        }
      }
      
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('document_number', documentNumber)
        .neq('id', data.document_id)
        .single()
      
      if (existing) {
        return { success: false, error: 'Document number already exists' }
      }
    } else {
      const generateResult = await generateDocumentNumber(
        document.department_id,
        document.document_type_id
      )
      
      if (!generateResult.success || !generateResult.data) {
        return { success: false, error: generateResult.error || 'Failed to generate document number' }
      }
      
      documentNumber = generateResult.data
    }
    
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        document_number: documentNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.document_id)
    
    if (updateError) {
      console.error('Error updating document number:', updateError)
      return { success: false, error: updateError.message }
    }
    
    // Create timeline entry (CORRECT COLUMN NAMES)
    await supabase
      .from('document_timeline')
      .insert({
        document_id: data.document_id,
        event_type: 'Updated',
        event_title: 'Document Number Assigned',
        event_description: `Document number "${documentNumber}" has been assigned.`,
        performed_by: userId,
        old_status: 'Initiation',
        new_status: 'Initiation',
      })
    
    revalidatePath('/dashboard/documents')
    return { 
      success: true, 
      data: { document_number: documentNumber },
      message: `Document number ${documentNumber} assigned successfully` 
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Preview Generated Document Number
// ============================================================================
export async function previewDocumentNumber(
  departmentId: string,
  documentTypeId: string
): Promise<ActionResponse<string>> {
  return generateDocumentNumber(departmentId, documentTypeId)
}
