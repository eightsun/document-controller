'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

interface ActionResponse<T = unknown> {
  success: boolean
  error?: string
  message?: string
  data?: T
}

interface CreateDocumentData {
  title: string
  description?: string
  document_type_id: string
  department_id: string
  draft_link?: string
  target_approval_date?: string
  affected_department_ids: string[]
  reviewer_ids: string[]
  approver_ids: string[]
}

export async function createDocument(data: CreateDocumentData): Promise<ActionResponse<{ id: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Validate required fields
    if (!data.title?.trim()) {
      return { success: false, error: 'Title is required' }
    }
    if (!data.document_type_id) {
      return { success: false, error: 'Document type is required' }
    }
    if (!data.department_id) {
      return { success: false, error: 'Department is required' }
    }

    // Generate temporary document number
    const tempDocNumber = `PENDING-${Date.now()}`

    // Create document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        document_number: tempDocNumber,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        document_type_id: data.document_type_id,
        department_id: data.department_id,
        draft_link: data.draft_link?.trim() || null,
        target_approval_date: data.target_approval_date || null,
        status: 'Initiation',
        version: '1.0',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (docError || !document) {
      console.error('Error creating document:', docError)
      return { success: false, error: docError?.message || 'Failed to create document' }
    }

    const documentId = document.id

    // Create affected departments
    if (data.affected_department_ids && data.affected_department_ids.length > 0) {
      const affectedDepts = data.affected_department_ids.map(deptId => ({
        document_id: documentId,
        department_id: deptId,
      }))
      const { error: affectedError } = await supabase
        .from('affected_departments')
        .insert(affectedDepts)
      
      if (affectedError) {
        console.error('Error creating affected departments:', affectedError)
      }
    }

    // Create assignments
    const assignments: Array<{
      document_id: string
      user_id: string
      role_type: string
      sequence_order: number
      assigned_by: string
    }> = []

    // Add submitter (creator)
    assignments.push({
      document_id: documentId,
      user_id: user.id,
      role_type: 'submitter',
      sequence_order: 1,
      assigned_by: user.id,
    })

    // Add reviewers
    if (data.reviewer_ids && data.reviewer_ids.length > 0) {
      data.reviewer_ids.forEach((reviewerId, index) => {
        assignments.push({
          document_id: documentId,
          user_id: reviewerId,
          role_type: 'reviewer',
          sequence_order: index + 1,
          assigned_by: user.id,
        })
      })
    }

    // Add approvers
    if (data.approver_ids && data.approver_ids.length > 0) {
      data.approver_ids.forEach((approverId, index) => {
        assignments.push({
          document_id: documentId,
          user_id: approverId,
          role_type: 'approver',
          sequence_order: index + 1,
          assigned_by: user.id,
        })
      })
    }

    if (assignments.length > 0) {
      const { error: assignError } = await supabase
        .from('document_assignments')
        .insert(assignments)
      
      if (assignError) {
        console.error('Error creating assignments:', assignError)
        return { success: false, error: `Failed to create assignments: ${assignError.message}` }
      }
    }

    // Create timeline entry
    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'created',
      event_title: 'Document Initiated',
      event_description: `Document "${data.title}" has been created.`,
      performed_by: user.id,
    })

    revalidatePath('/dashboard/documents')
    
    return { 
      success: true, 
      message: 'Document created successfully',
      data: { id: documentId }
    }
  } catch (error) {
    console.error('Error in createDocument:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getFormOptions(): Promise<ActionResponse<{
  documentTypes: Array<{ id: string; name: string; code: string }>
  departments: Array<{ id: string; name: string; code: string | null }>
  users: Array<{ id: string; full_name: string | null; email: string | null }>
}>> {
  try {
    const supabase = await createClient()
    
    const { data: documentTypes } = await supabase
      .from('document_types')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name')
    
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name, code')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name')
    
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('is_active', true)
      .order('full_name')
    
    return {
      success: true,
      data: {
        documentTypes: documentTypes || [],
        departments: departments || [],
        users: users || [],
      }
    }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}
