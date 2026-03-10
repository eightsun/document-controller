'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface ActionResponse<T = unknown> {
  success: boolean
  error?: string
  message?: string
  data?: T
}

// ============ EMAIL NOTIFICATION HELPER ============
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'Document Controller <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function sendEmailNotification(
  to: string,
  subject: string,
  templateType: 'assignment' | 'review' | 'approval' | 'ready',
  data: {
    documentTitle: string
    documentNumber: string
    documentId: string
    personName?: string
    roleType?: string
    decision?: string
    comments?: string
  }
) {
  if (!RESEND_API_KEY) {
    console.log('Email not sent (RESEND_API_KEY not configured):', { to, subject })
    return
  }

  const templates: Record<string, string> = {
    assignment: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📋 ${data.roleType === 'approver' ? 'Approval' : 'Review'} Assignment</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 16px;">You have been assigned as a <strong>${data.roleType}</strong> for:</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 4px 0; color: #1e293b; font-size: 18px; font-weight: bold;">${data.documentTitle}</p>
            <p style="margin: 0; color: #64748b; font-size: 14px; font-family: monospace;">${data.documentNumber}</p>
          </div>
          <p style="color: #64748b; font-size: 14px;">Assigned by: ${data.personName}</p>
          <a href="${APP_URL}/dashboard/documents/${data.documentId}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">View Document →</a>
        </div>
      </div>
    `,
    review: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📝 Review Submitted</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 16px;">A review has been submitted for your document:</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 4px 0; color: #1e293b; font-size: 18px; font-weight: bold;">${data.documentTitle}</p>
            <p style="margin: 0; color: #64748b; font-size: 14px; font-family: monospace;">${data.documentNumber}</p>
          </div>
          <p style="color: #64748b; font-size: 14px;"><strong>Reviewer:</strong> ${data.personName}</p>
          ${data.comments ? `<p style="color: #64748b; font-size: 14px;"><strong>Comments:</strong> ${data.comments}</p>` : ''}
          <a href="${APP_URL}/dashboard/documents/${data.documentId}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">View Document →</a>
        </div>
      </div>
    `,
    approval: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, ${data.decision === 'approved' ? '#10b981, #059669' : '#ef4444, #dc2626'}); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${data.decision === 'approved' ? '✅ Document Approved' : '❌ Document Rejected'}</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 16px;">Your document has been <strong>${data.decision}</strong>:</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 4px 0; color: #1e293b; font-size: 18px; font-weight: bold;">${data.documentTitle}</p>
            <p style="margin: 0; color: #64748b; font-size: 14px; font-family: monospace;">${data.documentNumber}</p>
          </div>
          <p style="color: #64748b; font-size: 14px;"><strong>By:</strong> ${data.personName}</p>
          ${data.comments ? `<p style="color: #64748b; font-size: 14px;"><strong>Comments:</strong> ${data.comments}</p>` : ''}
          <a href="${APP_URL}/dashboard/documents/${data.documentId}" style="display: inline-block; background: ${data.decision === 'approved' ? '#10b981' : '#ef4444'}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">View Document →</a>
        </div>
      </div>
    `,
    ready: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Ready for Your Approval</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 16px;">All reviews completed. This document is ready for your approval:</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 4px 0; color: #1e293b; font-size: 18px; font-weight: bold;">${data.documentTitle}</p>
            <p style="margin: 0; color: #64748b; font-size: 14px; font-family: monospace;">${data.documentNumber}</p>
          </div>
          <a href="${APP_URL}/dashboard/documents/${data.documentId}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">Review & Approve →</a>
        </div>
      </div>
    `,
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: templates[templateType],
      }),
    })
    if (response.ok) {
      console.log('Email sent to:', to)
    } else {
      console.error('Email failed:', await response.text())
    }
  } catch (error) {
    console.error('Email error:', error)
  }
}
// ============ END EMAIL HELPER ============

// Document numbering uses the legal entity code from the department's legal entity (dynamic lookup)

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

async function getUserProfile(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('id, full_name, email').eq('id', userId).single()
  return data
}

// Create notification helper
async function createNotification(
  userId: string,
  documentId: string,
  type: string,
  title: string,
  message: string
) {
  const supabase = await createClient()
  await supabase.from('notifications').insert({
    user_id: userId,
    document_id: documentId,
    type,
    title,
    message,
  })
}

// Notify multiple users
async function notifyUsers(
  userIds: string[],
  documentId: string,
  type: string,
  title: string,
  message: string
) {
  const uniqueIds = Array.from(new Set(userIds))
  for (const userId of uniqueIds) {
    await createNotification(userId, documentId, type, title, message)
  }
}

async function generateDocumentNumber(departmentId: string, documentTypeId: string): Promise<string | null> {
  const supabase = await createClient()
  // Fetch department with its linked legal entity code
  const { data: department } = await supabase
    .from('departments')
    .select('code, legal_entities(code)')
    .eq('id', departmentId)
    .single()
  const { data: documentType } = await supabase.from('document_types').select('code').eq('id', documentTypeId).single()
  if (!department?.code || !documentType?.code) return null

  const leRaw = department.legal_entities as unknown
  const leCodeRaw: string | null =
    Array.isArray(leRaw) ? (leRaw[0]?.code ?? null) : ((leRaw as { code: string } | null)?.code ?? null)
  const leCode = (leCodeRaw ?? 'XXX').substring(0, 3).toUpperCase().padEnd(3, 'X')
  const deptCode = department.code.substring(0, 3).toUpperCase().padEnd(3, 'X')
  const docTypeCode = documentType.code.substring(0, 3).toUpperCase().padEnd(3, 'X')
  const prefix = `${leCode}-${deptCode}-${docTypeCode}`
  
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

// Submit Review - Main review function with status transitions and notifications
export async function submitReview(
  documentId: string,
  assignmentId: string,
  reviewStatus: 'submitted' | 'requested_changes' | 'approved',
  comments: string
): Promise<ActionResponse> {
  try {
    const { user, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }

    const supabase = await createClient()
    
    // Get assignment and verify user
    const { data: assignment, error: assignError } = await supabase
      .from('document_assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .eq('role_type', 'reviewer')
      .single()
    
    if (assignError || !assignment) return { success: false, error: 'Review assignment not found' }
    if (assignment.is_completed) return { success: false, error: 'You have already submitted a review' }

    // Get document info
    const { data: document } = await supabase
      .from('documents')
      .select('id, title, document_number, status, created_by')
      .eq('id', documentId)
      .single()
    
    if (!document) return { success: false, error: 'Document not found' }

    // Check for existing review (prevent duplicates)
    const { data: existingReview } = await supabase
      .from('document_reviews')
      .select('id')
      .eq('document_id', documentId)
      .eq('reviewer_id', user.id)
      .single()
    
    if (existingReview) return { success: false, error: 'You have already submitted a review for this document' }

    // Get user's profile for notification messages
    const reviewerProfile = await getUserProfile(user.id)
    const reviewerName = reviewerProfile?.full_name || reviewerProfile?.email || 'A reviewer'

    // Insert review record
    const { error: reviewError } = await supabase.from('document_reviews').insert({
      document_id: documentId,
      reviewer_id: user.id,
      assignment_id: assignmentId,
      review_status: reviewStatus,
      comments: comments?.trim() || null,
      review_date: new Date().toISOString(),
    })

    if (reviewError) {
      console.error('Error inserting review:', reviewError)
      return { success: false, error: `Failed to submit review: ${reviewError.message}` }
    }

    // Mark assignment as completed
    await supabase.from('document_assignments').update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      assignment_notes: comments?.trim() || null,
    }).eq('id', assignmentId)

    // Add comment if provided
    if (comments && comments.trim()) {
      await supabase.from('document_comments').insert({
        document_id: documentId,
        user_id: user.id,
        content: `Review: ${comments.trim()}`,
      })
    }

    // Create timeline entry
    const statusLabels: Record<string, string> = {
      'submitted': 'Submitted',
      'requested_changes': 'Requested Changes',
      'approved': 'Approved',
    }
    
    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'review_completed',
      event_title: `Review ${statusLabels[reviewStatus]}`,
      event_description: comments 
        ? `${reviewerName} submitted review (${statusLabels[reviewStatus]}). Comment: ${comments.substring(0, 100)}${comments.length > 100 ? '...' : ''}`
        : `${reviewerName} submitted review (${statusLabels[reviewStatus]}).`,
      performed_by: user.id,
    })

    // Get all reviewer assignments to check completion status
    const { data: allReviewerAssignments } = await supabase
      .from('document_assignments')
      .select('is_completed')
      .eq('document_id', documentId)
      .eq('role_type', 'reviewer')

    const reviewers = allReviewerAssignments || []
    const completedReviewers = reviewers.filter(r => r.is_completed).length
    const totalReviewers = reviewers.length

    // Status transition logic
    let newStatus = document.status
    let statusChanged = false

    // If current status is 'Initiation' and this is the first review, change to 'Review'
    if (document.status === 'Initiation' && completedReviewers === 1) {
      newStatus = 'Review'
      statusChanged = true
      
      await supabase.from('document_timeline').insert({
        document_id: documentId,
        event_type: 'status_change',
        event_title: 'Review Process Started',
        event_description: 'First review has been submitted. Document is now under review.',
        performed_by: user.id,
      })
    }

    // If all reviewers have completed, change to 'Waiting Approval'
    if (completedReviewers === totalReviewers && totalReviewers > 0) {
      newStatus = 'Waiting Approval'
      statusChanged = true
      
      await supabase.from('document_timeline').insert({
        document_id: documentId,
        event_type: 'submitted_for_approval',
        event_title: 'All Reviews Completed',
        event_description: `All ${totalReviewers} reviewer(s) have submitted their reviews. Document is now waiting for approval.`,
        performed_by: user.id,
      })

      // Notify approvers
      const { data: approverAssignments } = await supabase
        .from('document_assignments')
        .select('user_id')
        .eq('document_id', documentId)
        .eq('role_type', 'approver')
      
      if (approverAssignments && approverAssignments.length > 0) {
        const approverIds = approverAssignments.map(a => a.user_id)
        await notifyUsers(
          approverIds,
          documentId,
          'approval_needed',
          'Document Ready for Approval',
          `"${document.title}" has completed all reviews and is waiting for your approval.`
        )

        // Send email to all approvers
        for (const approverId of approverIds) {
          const approverProfile = await getUserProfile(approverId)
          if (approverProfile?.email) {
            await sendEmailNotification(
              approverProfile.email,
              `Ready for Approval: ${document.title}`,
              'ready',
              {
                documentTitle: document.title,
                documentNumber: document.document_number || '',
                documentId: documentId,
              }
            )
          }
        }
      }
    }

    // Update document status if changed
    if (statusChanged) {
      await supabase.from('documents').update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', documentId)
    }

    // Notify document creator
    if (document.created_by && document.created_by !== user.id) {
      await createNotification(
        document.created_by,
        documentId,
        'review_submitted',
        'Review Submitted',
        `${reviewerName} has submitted a review for "${document.title}" (${statusLabels[reviewStatus]}).`
      )

      // Send email to document creator
      const creatorProfile = await getUserProfile(document.created_by)
      if (creatorProfile?.email) {
        await sendEmailNotification(
          creatorProfile.email,
          `Review Submitted: ${document.title}`,
          'review',
          {
            documentTitle: document.title,
            documentNumber: document.document_number || '',
            documentId: documentId,
            personName: reviewerName,
            comments: comments || '',
          }
        )
      }
    }

    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')
    
    return { 
      success: true, 
      message: completedReviewers === totalReviewers 
        ? `Review submitted. All reviewers have completed. Document is now waiting for approval.`
        : `Review submitted successfully. ${completedReviewers}/${totalReviewers} reviews completed.`
    }
  } catch (error) {
    console.error('Error in submitReview:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Legacy completeReview - redirects to submitReview
export async function completeReview(documentId: string, assignmentId: string, comment: string): Promise<ActionResponse> {
  return submitReview(documentId, assignmentId, 'submitted', comment)
}

export async function approveDocument(documentId: string, assignmentId: string, comment?: string): Promise<ActionResponse> {
  try {
    const { user, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }

    const supabase = await createClient()
    
    // Verify assignment
    const { data: assignment } = await supabase.from('document_assignments').select('*').eq('id', assignmentId).eq('document_id', documentId).eq('user_id', user.id).eq('role_type', 'approver').single()
    if (!assignment) return { success: false, error: 'Approval assignment not found' }
    if (assignment.is_completed) return { success: false, error: 'Already approved' }
    
    // Check document status
    const { data: document } = await supabase
      .from('documents')
      .select('id, title, document_number, status, created_by')
      .eq('id', documentId)
      .single()
    
    if (!document) return { success: false, error: 'Document not found' }
    if (document.status !== 'Waiting Approval') {
      return { success: false, error: `Cannot approve document with status "${document.status}". Document must be in "Waiting Approval" status.` }
    }
    
    // Check all reviewers completed
    const { data: reviewers } = await supabase.from('document_assignments').select('is_completed').eq('document_id', documentId).eq('role_type', 'reviewer')
    const allReviewersComplete = !reviewers || reviewers.length === 0 || reviewers.every(r => r.is_completed)
    if (!allReviewersComplete) return { success: false, error: 'Cannot approve until all reviewers complete' }

    // Check for existing approval (prevent duplicates)
    const { data: existingApproval } = await supabase
      .from('document_approvals')
      .select('id')
      .eq('document_id', documentId)
      .eq('approver_id', user.id)
      .single()
    
    if (existingApproval) return { success: false, error: 'You have already submitted an approval decision for this document' }

    const approverProfile = await getUserProfile(user.id)
    const approverName = approverProfile?.full_name || approverProfile?.email || 'An approver'

    // Insert approval record
    const { error: approvalError } = await supabase.from('document_approvals').insert({
      document_id: documentId,
      approver_id: user.id,
      assignment_id: assignmentId,
      decision: 'approved',
      comments: comment?.trim() || null,
      approval_date: new Date().toISOString(),
    })

    if (approvalError) {
      console.error('Error inserting approval:', approvalError)
      return { success: false, error: `Failed to record approval: ${approvalError.message}` }
    }
    
    // Mark assignment as completed
    await supabase.from('document_assignments').update({ 
      is_completed: true, 
      completed_at: new Date().toISOString(), 
      assignment_notes: comment || null 
    }).eq('id', assignmentId)
    
    // Add comment if provided
    if (comment && comment.trim()) {
      await supabase.from('document_comments').insert({ 
        document_id: documentId, 
        user_id: user.id, 
        content: `Approval: ${comment.trim()}` 
      })
    }
    
    // Add timeline entry
    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'approved',
      event_title: 'Approval Received',
      event_description: comment 
        ? `${approverName} approved. Comment: ${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}` 
        : `${approverName} approved the document.`,
      performed_by: user.id,
    })
    
    // Check if all approvers have completed
    const { data: allApprovers } = await supabase.from('document_assignments').select('is_completed').eq('document_id', documentId).eq('role_type', 'approver')
    const allApproversComplete = allApprovers && allApprovers.length > 0 && allApprovers.every(a => a.is_completed)
    
    if (allApproversComplete) {
      // Calculate published date and expiry date (3 years from now)
      const publishedAt = new Date()
      const expiryDate = new Date(publishedAt)
      expiryDate.setFullYear(expiryDate.getFullYear() + 3)
      
      // Update document to Approved
      await supabase.from('documents').update({ 
        status: 'Approved', 
        approved_at: publishedAt.toISOString(),
        published_at: publishedAt.toISOString(),
        expiry_date: expiryDate.toISOString().split('T')[0],
        effective_date: publishedAt.toISOString().split('T')[0],
        updated_at: publishedAt.toISOString() 
      }).eq('id', documentId)
      
      // Add final approval timeline entry
      await supabase.from('document_timeline').insert({
        document_id: documentId,
        event_type: 'approved',
        event_title: 'Document Approved & Published',
        event_description: `All approvers have approved. Document published and will expire on ${expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
        performed_by: user.id,
      })

      // Notify document creator
      if (document.created_by) {
        await createNotification(
          document.created_by,
          documentId,
          'document_approved',
          'Document Approved',
          `"${document.title}" has been fully approved and published.`
        )

        // Send email to document creator
        const creatorProfile = await getUserProfile(document.created_by)
        if (creatorProfile?.email) {
          await sendEmailNotification(
            creatorProfile.email,
            `Document Approved: ${document.title}`,
            'approval',
            {
              documentTitle: document.title,
              documentNumber: document.document_number || '',
              documentId: documentId,
              personName: approverName,
              decision: 'approved',
              comments: comment || '',
            }
          )
        }
      }

      // Notify all reviewers
      const { data: reviewerAssignments } = await supabase
        .from('document_assignments')
        .select('user_id')
        .eq('document_id', documentId)
        .eq('role_type', 'reviewer')
      
      if (reviewerAssignments && reviewerAssignments.length > 0) {
        const reviewerIds = reviewerAssignments.map(r => r.user_id).filter(id => id !== document.created_by)
        await notifyUsers(
          reviewerIds,
          documentId,
          'document_approved',
          'Document Approved',
          `"${document.title}" that you reviewed has been approved and published.`
        )
      }
    } else {
      // Notify document creator of partial approval
      if (document.created_by && document.created_by !== user.id) {
        await createNotification(
          document.created_by,
          documentId,
          'document_approved',
          'Approval Received',
          `${approverName} has approved "${document.title}".`
        )
      }
    }
    
    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')
    return { success: true, message: allApproversComplete ? 'Document approved and published!' : 'Approval submitted successfully' }
  } catch (error) {
    console.error('Error in approveDocument:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function rejectDocument(documentId: string, assignmentId: string, reason: string): Promise<ActionResponse> {
  try {
    const { user, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }
    if (!reason || !reason.trim()) return { success: false, error: 'Rejection reason is required' }

    const supabase = await createClient()
    
    // Verify assignment
    const { data: assignment } = await supabase.from('document_assignments').select('*').eq('id', assignmentId).eq('document_id', documentId).eq('user_id', user.id).eq('role_type', 'approver').single()
    if (!assignment) return { success: false, error: 'Approval assignment not found' }

    // Get document info
    const { data: document } = await supabase
      .from('documents')
      .select('id, title, document_number, status, created_by')
      .eq('id', documentId)
      .single()

    if (!document) return { success: false, error: 'Document not found' }
    if (document.status !== 'Waiting Approval') {
      return { success: false, error: `Cannot reject document with status "${document.status}". Document must be in "Waiting Approval" status.` }
    }

    // Check for existing approval decision (prevent duplicates)
    const { data: existingApproval } = await supabase
      .from('document_approvals')
      .select('id')
      .eq('document_id', documentId)
      .eq('approver_id', user.id)
      .single()
    
    if (existingApproval) return { success: false, error: 'You have already submitted an approval decision for this document' }

    const approverProfile = await getUserProfile(user.id)
    const approverName = approverProfile?.full_name || approverProfile?.email || 'An approver'

    // Insert rejection record into document_approvals
    const { error: approvalError } = await supabase.from('document_approvals').insert({
      document_id: documentId,
      approver_id: user.id,
      assignment_id: assignmentId,
      decision: 'rejected',
      comments: reason.trim(),
      approval_date: new Date().toISOString(),
    })

    if (approvalError) {
      console.error('Error inserting rejection:', approvalError)
      return { success: false, error: `Failed to record rejection: ${approvalError.message}` }
    }
    
    // Update document status to Rejected
    await supabase.from('documents').update({ 
      status: 'Rejected', 
      rejection_reason: reason.trim(), 
      rejected_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    }).eq('id', documentId)

    // Add rejection comment
    await supabase.from('document_comments').insert({ 
      document_id: documentId, 
      user_id: user.id, 
      content: `Rejected: ${reason.trim()}` 
    })

    // Add timeline entry
    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'rejected',
      event_title: 'Document Rejected',
      event_description: `${approverName} rejected the document. Reason: ${reason.substring(0, 200)}${reason.length > 200 ? '...' : ''}`,
      performed_by: user.id,
    })

    // Notify document creator
    if (document.created_by) {
      await createNotification(
        document.created_by,
        documentId,
        'document_rejected',
        'Document Rejected',
        `"${document.title}" has been rejected by ${approverName}. Reason: ${reason.substring(0, 100)}${reason.length > 100 ? '...' : ''}`
      )

      // Send email to document creator
      const creatorProfile = await getUserProfile(document.created_by)
      if (creatorProfile?.email) {
        await sendEmailNotification(
          creatorProfile.email,
          `Document Rejected: ${document.title}`,
          'approval',
          {
            documentTitle: document.title,
            documentNumber: document.document_number || '',
            documentId: documentId,
            personName: approverName,
            decision: 'rejected',
            comments: reason,
          }
        )
      }
    }

    // Notify all reviewers
    const { data: reviewerAssignments } = await supabase
      .from('document_assignments')
      .select('user_id')
      .eq('document_id', documentId)
      .eq('role_type', 'reviewer')
    
    if (reviewerAssignments && reviewerAssignments.length > 0) {
      const reviewerIds = reviewerAssignments
        .map(r => r.user_id)
        .filter(id => id !== document.created_by && id !== user.id)
      
      if (reviewerIds.length > 0) {
        await notifyUsers(
          reviewerIds,
          documentId,
          'document_rejected',
          'Document Rejected',
          `"${document.title}" that you reviewed has been rejected.`
        )
      }
    }
    
    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')
    return { success: true, message: 'Document rejected' }
  } catch (error) {
    console.error('Error in rejectDocument:', error)
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

    // Get document info for notification
    const { data: document } = await supabase
      .from('documents')
      .select('id, title, created_by')
      .eq('id', documentId)
      .single()

    // Notify document creator if comment is from someone else
    if (document?.created_by && document.created_by !== user.id) {
      const commenterProfile = await getUserProfile(user.id)
      const commenterName = commenterProfile?.full_name || commenterProfile?.email || 'Someone'
      
      await createNotification(
        document.created_by,
        documentId,
        'comment_added',
        'New Comment',
        `${commenterName} commented on "${document.title}".`
      )
    }
    
    revalidatePath(`/dashboard/documents/${documentId}`)
    return { success: true, message: 'Comment added' }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Get reviews for a document
export async function getDocumentReviews(documentId: string): Promise<ActionResponse<Array<{
  id: string
  reviewer_id: string
  reviewer_name: string | null
  reviewer_email: string | null
  review_status: string
  comments: string | null
  review_date: string
}>>> {
  try {
    const supabase = await createClient()
    
    const { data: reviews, error } = await supabase
      .from('document_reviews')
      .select('*')
      .eq('document_id', documentId)
      .order('review_date', { ascending: false })

    if (error) return { success: false, error: error.message }

    // Get profiles for each review
    const reviewsWithProfiles = []
    for (const review of (reviews || [])) {
      const profile = await getUserProfile(review.reviewer_id)
      reviewsWithProfiles.push({
        id: review.id,
        reviewer_id: review.reviewer_id,
        reviewer_name: profile?.full_name || null,
        reviewer_email: profile?.email || null,
        review_status: review.review_status,
        comments: review.comments,
        review_date: review.review_date,
      })
    }

    return { success: true, data: reviewsWithProfiles }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Get approvals for a document
export async function getDocumentApprovals(documentId: string): Promise<ActionResponse<Array<{
  id: string
  approver_id: string
  approver_name: string | null
  approver_email: string | null
  decision: string
  comments: string | null
  approval_date: string
}>>> {
  try {
    const supabase = await createClient()
    
    const { data: approvals, error } = await supabase
      .from('document_approvals')
      .select('*')
      .eq('document_id', documentId)
      .order('approval_date', { ascending: false })

    if (error) return { success: false, error: error.message }

    // Get profiles for each approval
    const approvalsWithProfiles = []
    for (const approval of (approvals || [])) {
      const profile = await getUserProfile(approval.approver_id)
      approvalsWithProfiles.push({
        id: approval.id,
        approver_id: approval.approver_id,
        approver_name: profile?.full_name || null,
        approver_email: profile?.email || null,
        decision: approval.decision,
        comments: approval.comments,
        approval_date: approval.approval_date,
      })
    }

    return { success: true, data: approvalsWithProfiles }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Mark notification as read
export async function markNotificationRead(notificationId: string): Promise<ActionResponse> {
  try {
    const { user, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }

    const supabase = await createClient()
    await supabase.from('notifications').update({
      is_read: true,
      read_at: new Date().toISOString(),
    }).eq('id', notificationId).eq('user_id', user.id)

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Mark all notifications as read
export async function markAllNotificationsRead(): Promise<ActionResponse> {
  try {
    const { user, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }

    const supabase = await createClient()
    await supabase.from('notifications').update({
      is_read: true,
      read_at: new Date().toISOString(),
    }).eq('user_id', user.id).eq('is_read', false)

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Close document (finalize after approval)
export async function closeDocument(documentId: string, comment?: string): Promise<ActionResponse> {
  try {
    const { user, roles, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }

    const supabase = await createClient()
    
    // Get document info
    const { data: document } = await supabase
      .from('documents')
      .select('id, title, status, created_by, effective_date, expiry_date, published_at, training_started_at')
      .eq('id', documentId)
      .single()

    if (!document) return { success: false, error: 'Document not found' }

    // Check status — document must be in Training before it can be closed
    if (document.status !== 'Training') {
      return { success: false, error: `Cannot close document with status "${document.status}". Document must be in "Training" status first.` }
    }

    // Check all trainees have acknowledged — hard block
    const { count: pendingTrainees } = await supabase
      .from('document_training')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId)
      .eq('acknowledged', false)

    if (pendingTrainees && pendingTrainees > 0) {
      return {
        success: false,
        error: `Cannot close: ${pendingTrainees} participant(s) have not yet acknowledged their training. All training must be completed first.`,
      }
    }

    // Check permissions: creator, Admin, or BPM
    const isAdmin = roles.includes('Admin')
    const isBPM = roles.includes('BPM')
    const isCreator = document.created_by === user.id
    
    if (!isAdmin && !isBPM && !isCreator) {
      return { success: false, error: 'Only the document creator, Admin, or BPM can close this document' }
    }

    const userProfile = await getUserProfile(user.id)
    const userName = userProfile?.full_name || userProfile?.email || 'A user'
    
    const now = new Date()
    
    // Ensure effective_date and expiry_date are set
    const effectiveDate = document.effective_date || now.toISOString().split('T')[0]
    const publishedAt = document.published_at || now.toISOString()
    let expiryDate = document.expiry_date
    
    if (!expiryDate) {
      const expiry = new Date(effectiveDate)
      expiry.setFullYear(expiry.getFullYear() + 3)
      expiryDate = expiry.toISOString().split('T')[0]
    }
    
    // Update document to Closed
    const { error: updateError } = await supabase.from('documents').update({
      status: 'Closed',
      closed_at: now.toISOString(),
      closed_by: user.id,
      effective_date: effectiveDate,
      expiry_date: expiryDate,
      published_at: publishedAt,
      updated_at: now.toISOString(),
    }).eq('id', documentId)
    
    if (updateError) {
      console.error('Error closing document:', updateError)
      return { success: false, error: `Failed to close document: ${updateError.message}` }
    }

    // Add comment if provided
    if (comment && comment.trim()) {
      await supabase.from('document_comments').insert({
        document_id: documentId,
        user_id: user.id,
        content: `Document closed: ${comment.trim()}`,
      })
    }

    // Add timeline entry
    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'closed',
      event_title: 'Document Closed & Enacted',
      event_description: comment 
        ? `${userName} closed the document. Comment: ${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}`
        : `${userName} closed the document. The document is now officially enacted.`,
      performed_by: user.id,
    })

    // Notify document creator if closed by someone else
    if (document.created_by && document.created_by !== user.id) {
      await createNotification(
        document.created_by,
        documentId,
        'document_approved', // Reusing type since it's a positive outcome
        'Document Closed',
        `"${document.title}" has been closed and officially enacted by ${userName}.`
      )
    }

    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')
    return { success: true, message: 'Document closed and officially enacted!' }
  } catch (error) {
    console.error('Error in closeDocument:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Start Training — moves Approved document to Training and assigns trainees from affected departments
export async function startTraining(documentId: string): Promise<ActionResponse> {
  try {
    const { user, roles, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }

    const supabase = await createClient()

    const { data: document } = await supabase
      .from('documents')
      .select('id, title, document_number, status, created_by, published_link')
      .eq('id', documentId)
      .single()

    if (!document) return { success: false, error: 'Document not found' }

    const isAdmin = roles.includes('Admin')
    const isBPM = roles.includes('BPM')
    const isCreator = document.created_by === user.id

    if (!document.published_link) {
      return { success: false, error: 'A published document link must be set before starting training. Please set the published link first.' }
    }

    if (!isAdmin && !isBPM && !isCreator) {
      return { success: false, error: 'Only Admin, BPM, or the document creator can start training' }
    }

    if (document.status !== 'Approved') {
      return { success: false, error: `Cannot start training for a document with status "${document.status}". Document must be "Approved" first.` }
    }

    // Get affected departments for this document
    const { data: affectedDepts } = await supabase
      .from('affected_departments')
      .select('department_id')
      .eq('document_id', documentId)

    if (!affectedDepts || affectedDepts.length === 0) {
      return { success: false, error: 'No affected departments found. Please assign affected departments before starting training.' }
    }

    const departmentIds = affectedDepts.map(d => d.department_id)

    // Get all active users in those departments
    const { data: trainees } = await supabase
      .from('profiles')
      .select('id, full_name, email, department_id')
      .in('department_id', departmentIds)
      .eq('is_active', true)

    if (!trainees || trainees.length === 0) {
      return { success: false, error: 'No active users found in the affected departments.' }
    }

    const now = new Date()

    // Update document status to Training
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'Training',
        training_started_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', documentId)

    if (updateError) {
      return { success: false, error: `Failed to update document status: ${updateError.message}` }
    }

    // Create training records for all trainees (ignore duplicates)
    const trainingRecords = trainees.map(t => ({
      document_id: documentId,
      user_id: t.id,
      department_id: t.department_id,
      acknowledged: false,
    }))

    const { error: trainingInsertError } = await supabase
      .from('document_training')
      .upsert(trainingRecords, { onConflict: 'document_id,user_id', ignoreDuplicates: true })

    if (trainingInsertError) {
      // Rollback status
      await supabase.from('documents').update({ status: 'Approved', training_started_at: null, updated_at: now.toISOString() }).eq('id', documentId)
      return { success: false, error: `Failed to create training records: ${trainingInsertError.message}` }
    }

    const userProfile = await getUserProfile(user.id)
    const userName = userProfile?.full_name || userProfile?.email || 'A user'

    // Timeline entry
    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'training_started',
      event_title: 'Training Started',
      event_description: `${userName} started training for ${trainees.length} participant(s) across ${departmentIds.length} department(s).`,
      performed_by: user.id,
      old_status: 'Approved',
      new_status: 'Training',
    })

    // Notify all trainees
    await notifyUsers(
      trainees.map(t => t.id),
      documentId,
      'training_assigned',
      'Training Required',
      `You are required to acknowledge reading "${document.title}" (${document.document_number}). Please review the document and confirm your acknowledgment.`
    )

    // Notify document creator if training was started by someone else
    if (document.created_by && document.created_by !== user.id) {
      await createNotification(
        document.created_by,
        documentId,
        'status_change',
        'Training Started',
        `Training has been started for "${document.title}" by ${userName}. ${trainees.length} participant(s) notified.`
      )
    }

    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')
    revalidatePath('/dashboard')
    return { success: true, message: `Training started. ${trainees.length} participant(s) have been notified.` }
  } catch (error) {
    console.error('Error in startTraining:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Acknowledge Training — current user marks themselves as trained
export async function acknowledgeTraining(documentId: string): Promise<ActionResponse> {
  try {
    const { user, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }

    const supabase = await createClient()

    const { data: document } = await supabase
      .from('documents')
      .select('id, title, status, created_by')
      .eq('id', documentId)
      .single()

    if (!document) return { success: false, error: 'Document not found' }
    if (document.status !== 'Training') {
      return { success: false, error: 'Document is not in Training status' }
    }

    // Find this user's training record
    const { data: trainingRecord } = await supabase
      .from('document_training')
      .select('id, acknowledged')
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .single()

    if (!trainingRecord) {
      return { success: false, error: 'You are not assigned as a trainee for this document' }
    }

    if (trainingRecord.acknowledged) {
      return { success: false, error: 'You have already acknowledged this training' }
    }

    const now = new Date()

    const { error: updateError } = await supabase
      .from('document_training')
      .update({
        acknowledged: true,
        acknowledged_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', trainingRecord.id)

    if (updateError) {
      return { success: false, error: `Failed to acknowledge training: ${updateError.message}` }
    }

    // Check if all trainees have now acknowledged
    const { data: allTraining } = await supabase
      .from('document_training')
      .select('acknowledged')
      .eq('document_id', documentId)

    const allAcknowledged = allTraining && allTraining.length > 0 && allTraining.every(t => t.acknowledged)

    if (allAcknowledged) {
      // Timeline entry for full completion
      await supabase.from('document_timeline').insert({
        document_id: documentId,
        event_type: 'training_completed',
        event_title: 'All Training Completed',
        event_description: `All ${allTraining.length} participant(s) have acknowledged training. Document is ready to be closed.`,
        performed_by: user.id,
      })

      // Notify creator that all training is complete
      if (document.created_by) {
        await createNotification(
          document.created_by,
          documentId,
          'status_change',
          'All Training Completed',
          `All trainees have acknowledged training for "${document.title}". The document can now be closed.`
        )
      }
    }

    revalidatePath(`/dashboard/documents/${documentId}`)
    return {
      success: true,
      message: allAcknowledged
        ? 'Training acknowledged. All participants have now completed training — the document is ready to be closed!'
        : 'Training acknowledged successfully.',
    }
  } catch (error) {
    console.error('Error in acknowledgeTraining:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Cancel document
export async function cancelDocument(documentId: string, reason: string): Promise<ActionResponse> {
  try {
    const { user, roles, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }
    if (!reason || !reason.trim()) return { success: false, error: 'Cancellation reason is required' }

    const supabase = await createClient()
    
    // Get document info
    const { data: document } = await supabase
      .from('documents')
      .select('id, title, document_number, status, created_by')
      .eq('id', documentId)
      .single()
    
    if (!document) return { success: false, error: 'Document not found' }
    
    // Check status - can only cancel documents that are not yet approved/rejected/closed
    const allowedStatuses = ['Initiation', 'Review', 'Waiting Approval']
    if (!allowedStatuses.includes(document.status)) {
      return { success: false, error: `Cannot cancel document with status "${document.status}". Only documents in Initiation, Review, or Waiting Approval can be cancelled.` }
    }
    
    // Check permissions: creator, Admin, or BPM
    const isAdmin = roles.includes('Admin')
    const isBPM = roles.includes('BPM')
    const isCreator = document.created_by === user.id
    
    if (!isAdmin && !isBPM && !isCreator) {
      return { success: false, error: 'Only the document creator, Admin, or BPM can cancel this document' }
    }

    const userProfile = await getUserProfile(user.id)
    const userName = userProfile?.full_name || userProfile?.email || 'A user'
    
    const now = new Date()
    
    // Update document to Cancel
    const { error: updateError } = await supabase.from('documents').update({
      status: 'Cancel',
      cancelled_at: now.toISOString(),
      cancelled_by: user.id,
      cancellation_reason: reason.trim(),
      updated_at: now.toISOString(),
    }).eq('id', documentId)
    
    if (updateError) {
      console.error('Error cancelling document:', updateError)
      return { success: false, error: `Failed to cancel document: ${updateError.message}` }
    }

    // Add comment
    await supabase.from('document_comments').insert({
      document_id: documentId,
      user_id: user.id,
      content: `Document cancelled: ${reason.trim()}`,
    })

    // Add timeline entry
    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'cancelled',
      event_title: 'Document Cancelled',
      event_description: `${userName} cancelled the document. Reason: ${reason.substring(0, 200)}${reason.length > 200 ? '...' : ''}`,
      performed_by: user.id,
    })

    // Notify all assigned users
    const { data: assignments } = await supabase
      .from('document_assignments')
      .select('user_id')
      .eq('document_id', documentId)
    
    if (assignments && assignments.length > 0) {
      const userIds = assignments
        .map(a => a.user_id)
        .filter(id => id !== user.id && id !== document.created_by)
      
      if (userIds.length > 0) {
        await notifyUsers(
          userIds,
          documentId,
          'document_rejected', // Reusing type for cancellation notification
          'Document Cancelled',
          `"${document.title}" has been cancelled by ${userName}.`
        )
      }
    }

    // Notify document creator if cancelled by someone else
    if (document.created_by && document.created_by !== user.id) {
      await createNotification(
        document.created_by,
        documentId,
        'document_rejected',
        'Document Cancelled',
        `"${document.title}" has been cancelled. Reason: ${reason.substring(0, 100)}${reason.length > 100 ? '...' : ''}`
      )
    }

    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')
    return { success: true, message: 'Document cancelled' }
  } catch (error) {
    console.error('Error in cancelDocument:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export interface UpdateDocumentData {
  title?: string
  description?: string
  document_type_id?: string
  department_id?: string
  sub_department_id?: string | null
  document_number?: string
  draft_link?: string
  effective_date?: string | null
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
    
    const { data: currentDoc } = await supabase.from('documents').select('created_by, title').eq('id', documentId).single()
    
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.title) updateData.title = data.title.trim()
    if (data.description !== undefined) updateData.description = data.description?.trim() || null
    if (data.document_type_id) updateData.document_type_id = data.document_type_id
    if (data.department_id) updateData.department_id = data.department_id
    if (data.sub_department_id !== undefined) updateData.sub_department_id = data.sub_department_id || null
    if (data.document_number !== undefined && data.document_number.trim()) updateData.document_number = data.document_number.trim()
    if (data.draft_link !== undefined) updateData.draft_link = data.draft_link?.trim() || null
    if (data.effective_date !== undefined) updateData.effective_date = data.effective_date || null
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
    
    // Track new assignments for notifications
    const newReviewerIds: string[] = []
    const newApproverIds: string[] = []
    
    if (data.reviewer_ids !== undefined || data.approver_ids !== undefined) {
      // Get existing assignments
      const { data: existingAssignments } = await supabase
        .from('document_assignments')
        .select('user_id, role_type')
        .eq('document_id', documentId)
      
      const existingReviewerIds = existingAssignments?.filter(a => a.role_type === 'reviewer').map(a => a.user_id) || []
      const existingApproverIds = existingAssignments?.filter(a => a.role_type === 'approver').map(a => a.user_id) || []
      
      // Find new assignments
      if (data.reviewer_ids) {
        data.reviewer_ids.forEach(id => {
          if (!existingReviewerIds.includes(id)) newReviewerIds.push(id)
        })
      }
      if (data.approver_ids) {
        data.approver_ids.forEach(id => {
          if (!existingApproverIds.includes(id)) newApproverIds.push(id)
        })
      }
      
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

    // Notify new reviewers
    if (newReviewerIds.length > 0) {
      await notifyUsers(
        newReviewerIds,
        documentId,
        'review_requested',
        'Review Requested',
        `You have been assigned to review "${currentDoc?.title || 'a document'}".`
      )
    }

    // Notify new approvers
    if (newApproverIds.length > 0) {
      await notifyUsers(
        newApproverIds,
        documentId,
        'assignment_added',
        'Approval Assignment',
        `You have been assigned as an approver for "${currentDoc?.title || 'a document'}".`
      )
    }
    
    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath('/dashboard/documents')
    return { success: true, message: 'Document updated successfully' }
  } catch (error) {
    console.error('Error updating document:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getDocumentForEdit(documentId: string): Promise<ActionResponse<{
  document: {
    id: string; title: string; description: string | null
    document_type_id: string; department_id: string
    sub_department_id: string | null; document_number: string
    draft_link: string | null; target_approval_date: string | null
    effective_date: string | null; legal_entity_id: string | null
  }
  affected_department_ids: string[]
  reviewer_ids: string[]
  approver_ids: string[]
}>> {
  try {
    const { user, roles, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }
    if (!roles.includes('Admin') && !roles.includes('BPM')) return { success: false, error: 'Only Admin or BPM can edit documents' }

    const supabase = await createClient()

    const { data: doc, error } = await supabase
      .from('documents')
      .select('id, title, description, document_type_id, department_id, sub_department_id, document_number, draft_link, target_approval_date, effective_date, departments(legal_entity_id)')
      .eq('id', documentId)
      .single()
    if (error || !doc) return { success: false, error: 'Document not found' }

    const { data: affectedDepts } = await supabase.from('affected_departments').select('department_id').eq('document_id', documentId)
    const { data: reviewerAssignments } = await supabase.from('document_assignments').select('user_id').eq('document_id', documentId).eq('role_type', 'reviewer')
    const { data: approverAssignments } = await supabase.from('document_assignments').select('user_id').eq('document_id', documentId).eq('role_type', 'approver')

    const deptData = doc.departments as { legal_entity_id: string | null } | null

    return {
      success: true,
      data: {
        document: {
          id: doc.id as string,
          title: doc.title as string,
          description: doc.description as string | null,
          document_type_id: doc.document_type_id as string,
          department_id: doc.department_id as string,
          sub_department_id: doc.sub_department_id as string | null,
          document_number: doc.document_number as string,
          draft_link: doc.draft_link as string | null,
          target_approval_date: doc.target_approval_date as string | null,
          effective_date: doc.effective_date as string | null,
          legal_entity_id: deptData?.legal_entity_id ?? null,
        },
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
  departments: Array<{ id: string; name: string; code: string | null; legal_entity_id: string | null }>
  subDepartments: Array<{ id: string; name: string; department_id: string }>
  legalEntities: Array<{ id: string; name: string; code: string }>
  users: Array<{ id: string; full_name: string | null; email: string | null }>
}>> {
  try {
    const supabase = await createClient()

    const [docTypesRes, deptsRes, subDeptsRes, leRes, usersRes] = await Promise.all([
      supabase.from('document_types').select('id, name, code').eq('is_active', true).order('name'),
      supabase.from('departments').select('id, name, code, legal_entity_id').eq('is_active', true).is('deleted_at', null).order('name'),
      supabase.from('sub_departments').select('id, name, department_id').eq('is_active', true).is('deleted_at', null).order('name'),
      supabase.from('legal_entities').select('id, name, code').eq('is_active', true).is('deleted_at', null).order('name'),
      supabase.from('profiles').select('id, full_name, email').eq('is_active', true).order('full_name'),
    ])

    return {
      success: true,
      data: {
        documentTypes: (docTypesRes.data || []) as Array<{ id: string; name: string; code: string }>,
        departments: (deptsRes.data || []) as Array<{ id: string; name: string; code: string | null; legal_entity_id: string | null }>,
        subDepartments: (subDeptsRes.data || []) as Array<{ id: string; name: string; department_id: string }>,
        legalEntities: (leRes.data || []) as Array<{ id: string; name: string; code: string }>,
        users: (usersRes.data || []) as Array<{ id: string; full_name: string | null; email: string | null }>,
      }
    }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function setPublishedLink(documentId: string, link: string): Promise<ActionResponse> {
  try {
    const { user, roles, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }
    if (!roles.includes('Admin') && !roles.includes('BPM')) return { success: false, error: 'Only Admin or BPM can set the published link' }

    if (!link.trim()) return { success: false, error: 'Published link is required' }

    const supabase = await createClient()
    const { data: doc } = await supabase.from('documents').select('status').eq('id', documentId).single()
    if (!doc) return { success: false, error: 'Document not found' }
    if (!['Approved', 'Training', 'Closed'].includes(doc.status as string)) {
      return { success: false, error: 'Published link can only be set on Approved, Training, or Closed documents' }
    }

    const { error: updateError } = await supabase.from('documents').update({
      published_link: link.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', documentId)

    if (updateError) return { success: false, error: `Failed to save: ${updateError.message}` }

    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'edited',
      event_title: 'Published Link Set',
      event_description: 'The published document link has been updated.',
      performed_by: user.id,
    })

    revalidatePath(`/dashboard/documents/${documentId}`)
    return { success: true, message: 'Published link saved successfully' }
  } catch (err) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function requestObsolete(
  documentId: string,
  data: { reason: string; approverId: string }
): Promise<ActionResponse> {
  try {
    const { user, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }

    if (!data.reason?.trim()) return { success: false, error: 'Reason is required' }
    if (!data.approverId) return { success: false, error: 'Approver is required' }

    const supabase = await createClient()
    const { data: document } = await supabase
      .from('documents')
      .select('id, title, document_number, status, created_by')
      .eq('id', documentId)
      .single()

    if (!document) return { success: false, error: 'Document not found' }
    if (document.status !== 'Closed') return { success: false, error: 'Only Closed documents can be requested for obsolescence' }

    const userProfile = await getUserProfile(user.id)
    const userName = userProfile?.full_name || userProfile?.email || 'A user'
    const now = new Date().toISOString()

    const { error: updateError } = await supabase.from('documents').update({
      status: 'Obsolete Pending',
      obsolete_reason: data.reason.trim(),
      obsolete_requested_at: now,
      obsolete_requested_by: user.id,
      obsolete_approver_id: data.approverId,
      updated_at: now,
    }).eq('id', documentId)

    if (updateError) return { success: false, error: `Failed to update status: ${updateError.message}` }

    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'obsolete_requested',
      event_title: 'Obsolete Requested',
      event_description: `${userName} requested to mark this document as obsolete. Reason: ${data.reason.substring(0, 200)}`,
      performed_by: user.id,
    })

    await createNotification(
      data.approverId,
      documentId,
      'obsolete_approval_required',
      'Obsolete Approval Required',
      `"${document.title}" has been requested for obsolescence. Your approval is required.`
    )

    revalidatePath(`/dashboard/documents/${documentId}`)
    return { success: true, message: 'Obsolete request submitted successfully' }
  } catch (err) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function approveObsolete(
  documentId: string,
  comments?: string
): Promise<ActionResponse> {
  try {
    const { user, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }

    const supabase = await createClient()
    const { data: document } = await supabase
      .from('documents')
      .select('id, title, status, obsolete_approver_id, created_by')
      .eq('id', documentId)
      .single()

    if (!document) return { success: false, error: 'Document not found' }
    if (document.status !== 'Obsolete Pending') return { success: false, error: 'Document is not pending obsolete approval' }
    if (document.obsolete_approver_id !== user.id) return { success: false, error: 'You are not the designated approver for this request' }

    const userProfile = await getUserProfile(user.id)
    const userName = userProfile?.full_name || userProfile?.email || 'A user'
    const now = new Date().toISOString()

    const { error: updateError } = await supabase.from('documents').update({
      status: 'Obsolete',
      obsolete_approved_at: now,
      updated_at: now,
    }).eq('id', documentId)

    if (updateError) return { success: false, error: `Failed to update status: ${updateError.message}` }

    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'obsolete_approved',
      event_title: 'Document Obsoleted',
      event_description: comments
        ? `${userName} approved the obsolete request. Comment: ${comments}`
        : `${userName} approved the obsolete request. Document is now obsolete.`,
      performed_by: user.id,
    })

    if (document.created_by) {
      await createNotification(
        document.created_by,
        documentId,
        'document_obsoleted',
        'Document Marked as Obsolete',
        `"${document.title}" has been officially marked as obsolete.`
      )
    }

    revalidatePath(`/dashboard/documents/${documentId}`)
    return { success: true, message: 'Document marked as obsolete' }
  } catch (err) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function rejectObsolete(
  documentId: string,
  reason: string
): Promise<ActionResponse> {
  try {
    const { user, error: authError } = await getCurrentUserWithRoles()
    if (!user || authError) return { success: false, error: authError || 'Not authenticated' }

    const supabase = await createClient()
    const { data: document } = await supabase
      .from('documents')
      .select('id, title, status, obsolete_approver_id, created_by')
      .eq('id', documentId)
      .single()

    if (!document) return { success: false, error: 'Document not found' }
    if (document.status !== 'Obsolete Pending') return { success: false, error: 'Document is not pending obsolete approval' }
    if (document.obsolete_approver_id !== user.id) return { success: false, error: 'You are not the designated approver for this request' }

    const userProfile = await getUserProfile(user.id)
    const userName = userProfile?.full_name || userProfile?.email || 'A user'
    const now = new Date().toISOString()

    const { error: updateError } = await supabase.from('documents').update({
      status: 'Closed',
      obsolete_rejected_at: now,
      obsolete_rejection_reason: reason?.trim() || null,
      updated_at: now,
    }).eq('id', documentId)

    if (updateError) return { success: false, error: `Failed to update status: ${updateError.message}` }

    await supabase.from('document_timeline').insert({
      document_id: documentId,
      event_type: 'obsolete_rejected',
      event_title: 'Obsolete Request Rejected',
      event_description: reason
        ? `${userName} rejected the obsolete request. Reason: ${reason}`
        : `${userName} rejected the obsolete request.`,
      performed_by: user.id,
    })

    if (document.created_by) {
      await createNotification(
        document.created_by,
        documentId,
        'obsolete_rejected',
        'Obsolete Request Rejected',
        `The obsolete request for "${document.title}" was rejected.`
      )
    }

    revalidatePath(`/dashboard/documents/${documentId}`)
    return { success: true, message: 'Obsolete request rejected' }
  } catch (err) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}
