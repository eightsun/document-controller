// app/api/email/send/route.ts
// API Route to send emails via Resend

import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'Document Controller <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface EmailRequest {
  to: string | string[]
  subject: string
  template: string
  data: Record<string, unknown>
}

// Email templates
function generateEmailHtml(template: string, data: Record<string, unknown>): string {
  const d = data as Record<string, string>
  
  const templates: Record<string, string> = {
    assignmentReviewer: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📋 Review Assignment</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            You have been assigned as a <strong>reviewer</strong> for the following document:
          </p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Document</p>
            <p style="margin: 0 0 4px 0; color: #1e293b; font-size: 18px; font-weight: bold;">${d.documentTitle}</p>
            <p style="margin: 0; color: #64748b; font-size: 14px; font-family: monospace;">${d.documentNumber}</p>
          </div>
          <p style="color: #64748b; font-size: 14px;">Assigned by: ${d.assignerName}</p>
          <a href="${APP_URL}/dashboard/documents/${d.documentId}" 
             style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px;">
            Review Document →
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
          This is an automated notification from Document Controller.
        </p>
      </div>
    `,

    assignmentApprover: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✅ Approval Assignment</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            You have been assigned as an <strong>approver</strong> for the following document:
          </p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Document</p>
            <p style="margin: 0 0 4px 0; color: #1e293b; font-size: 18px; font-weight: bold;">${d.documentTitle}</p>
            <p style="margin: 0; color: #64748b; font-size: 14px; font-family: monospace;">${d.documentNumber}</p>
          </div>
          <p style="color: #64748b; font-size: 14px;">Assigned by: ${d.assignerName}</p>
          <a href="${APP_URL}/dashboard/documents/${d.documentId}" 
             style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px;">
            View Document →
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
          This is an automated notification from Document Controller.
        </p>
      </div>
    `,

    reviewSubmitted: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📝 Review Submitted</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            A review has been submitted for your document:
          </p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Document</p>
            <p style="margin: 0 0 4px 0; color: #1e293b; font-size: 18px; font-weight: bold;">${d.documentTitle}</p>
            <p style="margin: 0; color: #64748b; font-size: 14px; font-family: monospace;">${d.documentNumber}</p>
          </div>
          <p style="color: #64748b; font-size: 14px;"><strong>Reviewer:</strong> ${d.reviewerName}</p>
          <p style="color: #64748b; font-size: 14px;"><strong>Decision:</strong> ${d.reviewStatus === 'approved' ? '✅ Approved' : d.reviewStatus === 'requested_changes' ? '⚠️ Changes Requested' : '📝 Reviewed'}</p>
          ${d.comments ? `<p style="color: #64748b; font-size: 14px;"><strong>Comments:</strong> ${d.comments}</p>` : ''}
          <a href="${APP_URL}/dashboard/documents/${d.documentId}" 
             style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px;">
            View Document →
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
          This is an automated notification from Document Controller.
        </p>
      </div>
    `,

    approvalSubmitted: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, ${d.decision === 'approved' ? '#10b981, #059669' : '#ef4444, #dc2626'}); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${d.decision === 'approved' ? '✅ Document Approved' : '❌ Document Rejected'}</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Your document has been <strong>${d.decision}</strong>:
          </p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Document</p>
            <p style="margin: 0 0 4px 0; color: #1e293b; font-size: 18px; font-weight: bold;">${d.documentTitle}</p>
            <p style="margin: 0; color: #64748b; font-size: 14px; font-family: monospace;">${d.documentNumber}</p>
          </div>
          <p style="color: #64748b; font-size: 14px;"><strong>By:</strong> ${d.approverName}</p>
          ${d.comments ? `<p style="color: #64748b; font-size: 14px;"><strong>Comments:</strong> ${d.comments}</p>` : ''}
          <a href="${APP_URL}/dashboard/documents/${d.documentId}" 
             style="display: inline-block; background: ${d.decision === 'approved' ? '#10b981' : '#ef4444'}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px;">
            View Document →
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
          This is an automated notification from Document Controller.
        </p>
      </div>
    `,

    readyForApproval: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Ready for Your Approval</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            All reviews have been completed. This document is now ready for your approval:
          </p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Document</p>
            <p style="margin: 0 0 4px 0; color: #1e293b; font-size: 18px; font-weight: bold;">${d.documentTitle}</p>
            <p style="margin: 0; color: #64748b; font-size: 14px; font-family: monospace;">${d.documentNumber}</p>
          </div>
          <a href="${APP_URL}/dashboard/documents/${d.documentId}" 
             style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px;">
            Review & Approve →
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
          This is an automated notification from Document Controller.
        </p>
      </div>
    `,

    reminder: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, ${parseInt(d.daysRemaining) < 0 ? '#ef4444, #dc2626' : '#f59e0b, #d97706'}); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ ${parseInt(d.daysRemaining) < 0 ? 'Overdue Document' : 'Deadline Approaching'}</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            ${parseInt(d.daysRemaining) < 0 
              ? `This document is <strong>${Math.abs(parseInt(d.daysRemaining))} days overdue</strong>:`
              : `This document is due in <strong>${d.daysRemaining} days</strong>:`}
          </p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Document</p>
            <p style="margin: 0 0 4px 0; color: #1e293b; font-size: 18px; font-weight: bold;">${d.documentTitle}</p>
            <p style="margin: 0; color: #64748b; font-size: 14px; font-family: monospace;">${d.documentNumber}</p>
          </div>
          <p style="color: #64748b; font-size: 14px;"><strong>Target Date:</strong> ${d.targetDate}</p>
          <p style="color: #64748b; font-size: 14px;"><strong>Your Role:</strong> ${d.recipientRole}</p>
          <a href="${APP_URL}/dashboard/documents/${d.documentId}" 
             style="display: inline-block; background: ${parseInt(d.daysRemaining) < 0 ? '#ef4444' : '#f59e0b'}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px;">
            Take Action →
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
          This is an automated reminder from Document Controller.
        </p>
      </div>
    `,
  }

  return templates[template] || `<p>Notification: ${template}</p>`
}

async function sendEmailViaResend(to: string | string[], subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping email:', { to, subject })
    return { success: false, error: 'Email service not configured' }
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
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error:', error)
      return { success: false, error }
    }

    const result = await response.json()
    console.log('Email sent:', result)
    return { success: true, id: result.id }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error: String(error) }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json()
    
    if (!body.to || !body.subject || !body.template || !body.data) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, template, data' },
        { status: 400 }
      )
    }

    const html = generateEmailHtml(body.template, body.data)
    const result = await sendEmailViaResend(body.to, body.subject, html)

    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
