'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResponse } from '@/types/database'

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
    
    // Check if all reviewers completed
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
      await supabase.from('documents').update({ status: 'Approved', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', documentId)
      await supabase.from('document_timeline').insert({
        document_id: documentId,
        event_type: 'approved',
        event_title: 'Document Approved',
        event_description: 'All approvers have approved.',
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
