'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface ActionResponse<T = unknown> {
  success: boolean
  error?: string
  message?: string
  data?: T
}

const COMPANY_CODE = 'MRT'

async function getCurrentUserWithRoles() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { user: null, roles: [], error: 'Not authenticated' }

  const { data: userRoles } = await supabase.from('user_roles').select('roles (name)').eq('user_id', user.id)
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
  return { user, roles: roleNames, error: null }
}

async function generateDocumentNumber(departmentId: string, documentTypeId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: department } = await supabase.from('departments').select('code').eq('id', departmentId).single()
  const { data: documentType } = await supabase.from('document_types').select('code').eq('id', documentTypeId).single()
  if (!department?.code || !documentType?.code) return null
  
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
  return `${prefix}-${sequence.toString().padStart(3, '0')}`
}

export async function assignDocumentNumber(documentId: string, manualNumber?: string): Promise<ActionResponse<{ document_number: string }>> {
  try {
    const { user, roles, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }
    if (!roles.includes('Admin') && !roles.includes('BPM')) return { success: false, error: 'Only Admin or BPM can assign document numbers' }

    const supabase = await createClient()
    const { data: document, error: docError } = await supabase.from('documents').select('id, title, department_id, document_type_id').eq('id', documentId).single()
    if (docError || !document) return { success: false, error: 'Document not found' }
    
    let documentNumber: string
    if (manualNumber && manualNumber.trim()) {
      const pattern = /^[A-Z]{3}-[A-Z]{3}-[A-Z]{3}-\d{3}$/
      documentNumber = manualNumber.trim().toUpperCase()
      if (!pattern.test(documentNumber)) return { success: false, error: 'Invalid format. Expected: XXX-XXX-XXX-NNN' }
      const { data: existing } = await supabase.from('documents').select('id').eq('document_number', documentNumber).neq('id', documentId).single()
      if (existing) return { success: false, error: 'Document number already exists' }
    } else {
      const generated = await generateDocumentNumber(document.department_id, document.document_type_id)
      if (!generated) return { success: false, error: 'Failed to generate document number' }
      documentNumber = generated
    }
    
    await supabase.from('documents').update({ document_number: documentNumber, updated_at: new Date().toISOString() }).eq('id', documentId)
    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'edited',
      event_title: 'Document Number Assigned',
      event_description: `Document number "${documentNumber}" assigned.`,
      performed_by: user.id,
    })
    
    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')
    return { success: true, data: { document_number: documentNumber }, message: `Document number ${documentNumber} assigned` }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function completeReview(documentId: string, assignmentId: string, comment: string): Promise<ActionResponse> {
  try {
    const { user, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }

    const supabase = await createClient()
    const { data: assignment, error: assignError } = await supabase
      .from('document_assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .single()
    
    if (assignError || !assignment) return { success: false, error: 'Assignment not found' }
    if (assignment.is_completed) return { success: false, error: 'Review already completed' }
    
    await supabase.from('document_assignments').update({ is_completed: true, completed_at: new Date().toISOString(), assignment_notes: comment || null }).eq('id', assignmentId)
    
    if (comment && comment.trim()) {
      await supabase.from('document_comments').insert({ document_id: documentId, user_id: user.id, content: comment.trim() })
    }
    
    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'review_completed',
      event_title: 'Review Completed',
      event_description: comment ? `Review completed. Comment: ${comment.substring(0, 100)}` : 'Review completed.',
      performed_by: user.id,
    })
    
    const { data: allAssignments } = await supabase.from('document_assignments').select('role_type, is_completed').eq('document_id', documentId)
    const reviewers = allAssignments?.filter(a => a.role_type === 'reviewer') || []
    const allReviewersComplete = reviewers.length > 0 && reviewers.every(r => r.is_completed)
    
    if (allReviewersComplete) {
      await supabase.from('documents').update({ status: 'Waiting Approval', updated_at: new Date().toISOString() }).eq('id', documentId)
      await supabase.from('document_timeline').insert({
        document_id: documentId,
        event_type: 'submitted_for_approval',
        event_title: 'All Reviews Completed',
        event_description: 'Document is now waiting for approval.',
        performed_by: user.id,
      })
    }
    
    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')
    return { success: true, message: 'Review completed' }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function approveDocument(documentId: string, assignmentId: string, comment?: string): Promise<ActionResponse> {
  try {
    const { user, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }

    const supabase = await createClient()
    const { data: assignment } = await supabase.from('document_assignments').select('*').eq('id', assignmentId).eq('document_id', documentId).eq('user_id', user.id).eq('role_type', 'approver').single()
    if (!assignment) return { success: false, error: 'Approval assignment not found' }
    if (assignment.is_completed) return { success: false, error: 'Already approved' }
    
    const { data: reviewers } = await supabase.from('document_assignments').select('is_completed').eq('document_id', documentId).eq('role_type', 'reviewer')
    const allReviewersComplete = !reviewers || reviewers.length === 0 || reviewers.every(r => r.is_completed)
    if (!allReviewersComplete) return { success: false, error: 'Cannot approve until all reviewers complete' }
    
    await supabase.from('document_assignments').update({ is_completed: true, completed_at: new Date().toISOString(), assignment_notes: comment || null }).eq('id', assignmentId)
    
    if (comment && comment.trim()) {
      await supabase.from('document_comments').insert({ document_id: documentId, user_id: user.id, content: comment.trim() })
    }
    
    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'approved',
      event_title: 'Approval Received',
      event_description: comment ? `Approved. Comment: ${comment.substring(0, 100)}` : 'Document approved.',
      performed_by: user.id,
    })
    
    const { data: allApprovers } = await supabase.from('document_assignments').select('is_completed').eq('document_id', documentId).eq('role_type', 'approver')
    const allApproversComplete = allApprovers && allApprovers.length > 0 && allApprovers.every(a => a.is_completed)
    
    if (allApproversComplete) {
      // Calculate published date and expiry date (3 years from now)
      const publishedAt = new Date()
      const expiryDate = new Date(publishedAt)
      expiryDate.setFullYear(expiryDate.getFullYear() + 3)
      
      await supabase.from('documents').update({ 
        status: 'Approved', 
        approved_at: publishedAt.toISOString(),
        published_at: publishedAt.toISOString(),
        expiry_date: expiryDate.toISOString().split('T')[0],
        updated_at: publishedAt.toISOString() 
      }).eq('id', documentId)
      
      await supabase.from('document_timeline').insert({
        document_id: documentId,
        event_type: 'approved',
        event_title: 'Document Approved & Published',
        event_description: `All approvers have approved. Document published and will expire on ${expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
        performed_by: user.id,
      })
    }
    
    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')
    return { success: true, message: 'Document approved' }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function rejectDocument(documentId: string, assignmentId: string, reason: string): Promise<ActionResponse> {
  try {
    const { user, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }
    if (!reason || !reason.trim()) return { success: false, error: 'Rejection reason is required' }

    const supabase = await createClient()
    const { data: assignment } = await supabase.from('document_assignments').select('*').eq('id', assignmentId).eq('document_id', documentId).eq('user_id', user.id).eq('role_type', 'approver').single()
    if (!assignment) return { success: false, error: 'Approval assignment not found' }
    
    await supabase.from('documents').update({ status: 'Rejected', rejection_reason: reason.trim(), rejected_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', documentId)
    await supabase.from('document_comments').insert({ document_id: documentId, user_id: user.id, content: `Rejected: ${reason.trim()}` })
    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'rejected',
      event_title: 'Document Rejected',
      event_description: `Rejected. Reason: ${reason.substring(0, 200)}`,
      performed_by: user.id,
    })
    
    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')
    return { success: true, message: 'Document rejected' }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function addComment(documentId: string, content: string): Promise<ActionResponse> {
  try {
    const { user, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }
    if (!content || !content.trim()) return { success: false, error: 'Comment is required' }

    const supabase = await createClient()
    const { error } = await supabase.from('document_comments').insert({ document_id: documentId, user_id: user.id, content: content.trim() })
    if (error) return { success: false, error: error.message }
    
    revalidatePath(`/dashboard/documents/${documentId}`)
    return { success: true, message: 'Comment added' }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export interface UpdateDocumentData {
  title?: string
  description?: string
  document_type_id?: string
  department_id?: string
  draft_link?: string
  target_approval_date?: string
  affected_department_ids?: string[]
  reviewer_ids?: string[]
  approver_ids?: string[]
}

export async function updateDocument(documentId: string, data: UpdateDocumentData): Promise<ActionResponse> {
  try {
    const { user, roles, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }
    if (!roles.includes('Admin') && !roles.includes('BPM')) return { success: false, error: 'Only Admin or BPM can edit documents' }

    const supabase = await createClient()
    
    const { data: currentDoc } = await supabase.from('documents').select('created_by').eq('id', documentId).single()
    
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.title) updateData.title = data.title.trim()
    if (data.description !== undefined) updateData.description = data.description?.trim() || null
    if (data.document_type_id) updateData.document_type_id = data.document_type_id
    if (data.department_id) updateData.department_id = data.department_id
    if (data.draft_link !== undefined) updateData.draft_link = data.draft_link?.trim() || null
    if (data.target_approval_date) updateData.target_approval_date = data.target_approval_date
    
    const { error: updateError } = await supabase.from('documents').update(updateData).eq('id', documentId)
    if (updateError) return { success: false, error: `Update failed: ${updateError.message}` }
    
    if (data.affected_department_ids !== undefined) {
      await supabase.from('affected_departments').delete().eq('document_id', documentId)
      if (data.affected_department_ids.length > 0) {
        const affectedDeptInserts = data.affected_department_ids.map(deptId => ({ document_id: documentId, department_id: deptId }))
        await supabase.from('affected_departments').insert(affectedDeptInserts)
      }
    }
    
    if (data.reviewer_ids !== undefined || data.approver_ids !== undefined) {
      await supabase.from('document_assignments').delete().eq('document_id', documentId)
      
      const assignments: Array<{ document_id: string; user_id: string; role_type: string; sequence_order: number; assigned_by: string }> = []
      
      if (currentDoc?.created_by) {
        assignments.push({ document_id: documentId, user_id: currentDoc.created_by, role_type: 'submitter', sequence_order: 1, assigned_by: user.id })
      }
      
      if (data.reviewer_ids && data.reviewer_ids.length > 0) {
        data.reviewer_ids.forEach((id, index) => {
          assignments.push({ document_id: documentId, user_id: id, role_type: 'reviewer', sequence_order: index + 1, assigned_by: user.id })
        })
      }
      
      if (data.approver_ids && data.approver_ids.length > 0) {
        data.approver_ids.forEach((id, index) => {
          assignments.push({ document_id: documentId, user_id: id, role_type: 'approver', sequence_order: index + 1, assigned_by: user.id })
        })
      }
      
      if (assignments.length > 0) {
        const { error: assignError } = await supabase.from('document_assignments').insert(assignments)
        if (assignError) {
          console.error('Error inserting assignments:', assignError)
          return { success: false, error: `Failed to save assignments: ${assignError.message}` }
        }
      }
    }
    
    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'edited',
      event_title: 'Document Updated',
      event_description: 'Document details have been updated.',
      performed_by: user.id,
    })
    
    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')
    return { success: true, message: 'Document updated successfully' }
  } catch (error) {
    console.error('Error updating document:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getDocumentForEdit(documentId: string): Promise<ActionResponse<{
  document: { id: string; title: string; description: string | null; document_type_id: string; department_id: string; draft_link: string | null; target_approval_date: string | null }
  affected_department_ids: string[]
  reviewer_ids: string[]
  approver_ids: string[]
}>> {
  try {
    const { user, roles, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }
    if (!roles.includes('Admin') && !roles.includes('BPM')) return { success: false, error: 'Only Admin or BPM can edit documents' }

    const supabase = await createClient()
    
    const { data: doc, error } = await supabase.from('documents').select('id, title, description, document_type_id, department_id, draft_link, target_approval_date').eq('id', documentId).single()
    if (error || !doc) return { success: false, error: 'Document not found' }
    
    const { data: affectedDepts } = await supabase.from('affected_departments').select('department_id').eq('document_id', documentId)
    const { data: reviewerAssignments } = await supabase.from('document_assignments').select('user_id').eq('document_id', documentId).eq('role_type', 'reviewer')
    const { data: approverAssignments } = await supabase.from('document_assignments').select('user_id').eq('document_id', documentId).eq('role_type', 'approver')
    
    return {
      success: true,
      data: {
        document: doc,
        affected_department_ids: (affectedDepts || []).map(d => d.department_id),
        reviewer_ids: (reviewerAssignments || []).map(a => a.user_id),
        approver_ids: (approverAssignments || []).map(a => a.user_id),
      }
    }
  } catch (error) {
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
    
    const { data: documentTypes } = await supabase.from('document_types').select('id, name, code').eq('is_active', true).order('name')
    const { data: departments } = await supabase.from('departments').select('id, name, code').eq('is_active', true).is('deleted_at', null).order('name')
    const { data: users } = await supabase.from('profiles').select('id, full_name, email').eq('is_active', true).order('full_name')
    
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
