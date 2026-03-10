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
  sub_department_id?: string
  draft_link?: string
  target_approval_date?: string
  affected_department_ids: string[]
  reviewer_ids: string[]
  approver_ids: string[]
  parent_document_id?: string
}

export async function createDocument(data: CreateDocumentData): Promise<ActionResponse<{ id: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Determine version: increment from parent if revision
    let newVersion = '1.0'
    let parentDocMeta: { version: string; document_number: string; title: string; expiry_date: string | null } | null = null
    if (data.parent_document_id) {
      const { data: parentDoc } = await supabase
        .from('documents')
        .select('version, document_number, title, expiry_date')
        .eq('id', data.parent_document_id)
        .single()
      if (parentDoc) {
        parentDocMeta = parentDoc as typeof parentDocMeta
        const parentMajor = parseInt((parentDoc.version as string).split('.')[0], 10)
        newVersion = `${(isNaN(parentMajor) ? 1 : parentMajor) + 1}.0`
      }
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
        sub_department_id: data.sub_department_id || null,
        draft_link: data.draft_link?.trim() || null,
        target_approval_date: data.target_approval_date || null,
        status: 'Initiation',
        version: newVersion,
        created_by: user.id,
        parent_document_id: data.parent_document_id || null,
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
    if (data.parent_document_id && parentDocMeta) {
      const validUntil = parentDocMeta.expiry_date
        ? ` | Valid Until: ${new Date(parentDocMeta.expiry_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : ''
      await supabase.from('document_timeline').insert({
        document_id: documentId,
        event_type: 'created',
        event_title: 'Document Revision Initiated',
        event_description: `New revision (v${newVersion}) created from: ${parentDocMeta.document_number} — "${parentDocMeta.title}" (v${parentDocMeta.version}${validUntil})`,
        performed_by: user.id,
      })
      // Add timeline entry to parent document
      await supabase.from('document_timeline').insert({
        document_id: data.parent_document_id,
        event_type: 'revision_initiated',
        event_title: 'Revision Created',
        event_description: `A new revision (v${newVersion}) has been initiated from this document.\nPrevious: ${parentDocMeta.document_number} — v${parentDocMeta.version}${validUntil}`,
        performed_by: user.id,
      })
      revalidatePath(`/dashboard/documents/${data.parent_document_id}`)
    } else {
      await supabase.from('document_timeline').insert({
        document_id: documentId,
        event_type: 'created',
        event_title: 'Document Initiated',
        event_description: `Document "${data.title}" has been created.`,
        performed_by: user.id,
      })
    }

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
  departments: Array<{ id: string; name: string; code: string | null; legal_entity_id: string | null }>
  users: Array<{ id: string; full_name: string | null; email: string | null }>
  legalEntities: Array<{ id: string; name: string; code: string }>
  subDepartments: Array<{ id: string; name: string; code: string | null; department_id: string }>
}>> {
  try {
    const supabase = await createClient()

    const [
      { data: documentTypes },
      { data: departments },
      { data: users },
      { data: legalEntities },
      { data: subDepartments },
    ] = await Promise.all([
      supabase.from('document_types').select('id, name, code').eq('is_active', true).order('name'),
      supabase.from('departments').select('id, name, code, legal_entity_id').eq('is_active', true).is('deleted_at', null).order('name'),
      supabase.from('profiles').select('id, full_name, email').eq('is_active', true).order('full_name'),
      supabase.from('legal_entities').select('id, name, code').eq('is_active', true).is('deleted_at', null).order('name'),
      supabase.from('sub_departments').select('id, name, code, department_id').eq('is_active', true).is('deleted_at', null).order('name'),
    ])

    return {
      success: true,
      data: {
        documentTypes: documentTypes || [],
        departments: departments || [],
        users: users || [],
        legalEntities: legalEntities || [],
        subDepartments: subDepartments || [],
      }
    }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getDocumentForRevise(docId: string): Promise<{
  id: string
  title: string
  description: string | null
  documentTypeId: string
  departmentId: string
  subDepartmentId: string | null
  draftLink: string | null
  targetDate: string | null
  version: string
  documentNumber: string
  legalEntityId: string | null
} | null> {
  try {
    const supabase = await createClient()
    const { data: doc } = await supabase
      .from('documents')
      .select('id, title, description, document_type_id, department_id, sub_department_id, draft_link, target_approval_date, version, document_number')
      .eq('id', docId)
      .single()
    if (!doc) return null

    const { data: dept } = await supabase
      .from('departments')
      .select('legal_entity_id')
      .eq('id', doc.department_id)
      .single()

    return {
      id: doc.id as string,
      title: doc.title as string,
      description: doc.description as string | null,
      documentTypeId: doc.document_type_id as string,
      departmentId: doc.department_id as string,
      subDepartmentId: doc.sub_department_id as string | null,
      draftLink: doc.draft_link as string | null,
      targetDate: doc.target_approval_date as string | null,
      version: doc.version as string,
      documentNumber: doc.document_number as string,
      legalEntityId: (dept?.legal_entity_id as string | null) ?? null,
    }
  } catch {
    return null
  }
}
