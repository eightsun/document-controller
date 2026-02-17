// app/api/cron/reminders/route.ts
// API Route for daily reminder emails (called by external cron service)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const CRON_SECRET = process.env.CRON_SECRET // Optional security
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  // Optional: Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const results = {
    deadlineReminders: 0,
    overdueReminders: 0,
    expiryReminders: 0,
    errors: [] as string[],
  }

  try {
    // 1. Find documents approaching target approval date (within 3 days)
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0]

    const { data: approachingDocs } = await supabase
      .from('documents')
      .select('id, document_number, title, target_approval_date, status, created_by')
      .not('status', 'in', '("Approved","Closed","Rejected","Cancel")')
      .not('target_approval_date', 'is', null)
      .gte('target_approval_date', todayStr)
      .lte('target_approval_date', threeDaysStr)

    if (approachingDocs) {
      for (const doc of approachingDocs) {
        const daysRemaining = Math.ceil(
          (new Date(doc.target_approval_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Get pending assignments
        const { data: assignments } = await supabase
          .from('document_assignments')
          .select('user_id, role_type, profiles!inner(email, full_name)')
          .eq('document_id', doc.id)
          .eq('is_completed', false)

        if (assignments) {
          for (const assignment of assignments) {
            const profile = (assignment as any).profiles
            if (profile?.email) {
              await sendReminderEmail({
                to: profile.email,
                documentTitle: doc.title,
                documentNumber: doc.document_number,
                documentId: doc.id,
                daysRemaining,
                targetDate: new Date(doc.target_approval_date).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                }),
                recipientRole: assignment.role_type === 'reviewer' ? 'Reviewer' : 'Approver',
              })
              results.deadlineReminders++
            }
          }
        }
      }
    }

    // 2. Find overdue documents
    const { data: overdueDocs } = await supabase
      .from('documents')
      .select('id, document_number, title, target_approval_date, status, created_by')
      .not('status', 'in', '("Approved","Closed","Rejected","Cancel")')
      .not('target_approval_date', 'is', null)
      .lt('target_approval_date', todayStr)

    if (overdueDocs) {
      for (const doc of overdueDocs) {
        const daysOverdue = Math.ceil(
          (today.getTime() - new Date(doc.target_approval_date).getTime()) / (1000 * 60 * 60 * 24)
        )

        // Only send weekly reminders (every 7 days) or on day 1
        if (daysOverdue % 7 !== 0 && daysOverdue !== 1) continue

        // Get pending assignments
        const { data: assignments } = await supabase
          .from('document_assignments')
          .select('user_id, role_type, profiles!inner(email, full_name)')
          .eq('document_id', doc.id)
          .eq('is_completed', false)

        if (assignments) {
          for (const assignment of assignments) {
            const profile = (assignment as any).profiles
            if (profile?.email) {
              await sendReminderEmail({
                to: profile.email,
                documentTitle: doc.title,
                documentNumber: doc.document_number,
                documentId: doc.id,
                daysRemaining: -daysOverdue,
                targetDate: new Date(doc.target_approval_date).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                }),
                recipientRole: assignment.role_type === 'reviewer' ? 'Reviewer' : 'Approver',
              })
              results.overdueReminders++
            }
          }
        }

        // Also notify document creator
        const { data: creator } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', doc.created_by)
          .single()

        if (creator?.email) {
          await sendReminderEmail({
            to: creator.email,
            documentTitle: doc.title,
            documentNumber: doc.document_number,
            documentId: doc.id,
            daysRemaining: -daysOverdue,
            targetDate: new Date(doc.target_approval_date).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            }),
            recipientRole: 'Document Owner',
          })
          results.overdueReminders++
        }
      }
    }

    // 3. Find documents expiring soon (30, 14, 7, 3, 1 days)
    const expiryThresholds = [30, 14, 7, 3, 1]

    for (const days of expiryThresholds) {
      const targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() + days)
      const targetDateStr = targetDate.toISOString().split('T')[0]

      const { data: expiringDocs } = await supabase
        .from('documents')
        .select('id, document_number, title, expiry_date, created_by')
        .in('status', ['Approved', 'Closed'])
        .eq('expiry_date', targetDateStr)

      if (expiringDocs) {
        for (const doc of expiringDocs) {
          const { data: creator } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', doc.created_by)
            .single()

          if (creator?.email) {
            await sendExpiryReminderEmail({
              to: creator.email,
              documentTitle: doc.title,
              documentNumber: doc.document_number,
              documentId: doc.id,
              daysUntilExpiry: days,
              expiryDate: new Date(doc.expiry_date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
              }),
            })
            results.expiryReminders++
          }
        }
      }
    }

    console.log('Reminder job completed:', results)

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Reminder job failed:', error)
    return NextResponse.json(
      { success: false, error: String(error), ...results },
      { status: 500 }
    )
  }
}

// Helper functions
async function sendReminderEmail(params: {
  to: string
  documentTitle: string
  documentNumber: string
  documentId: string
  daysRemaining: number
  targetDate: string
  recipientRole: string
}) {
  try {
    await fetch(`${APP_URL}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: params.to,
        subject: params.daysRemaining < 0
          ? `🚨 Overdue: ${params.documentTitle}`
          : `⚠️ Reminder: ${params.documentTitle} - ${params.daysRemaining} days`,
        template: 'reminder',
        data: {
          documentTitle: params.documentTitle,
          documentNumber: params.documentNumber,
          documentId: params.documentId,
          daysRemaining: String(params.daysRemaining),
          targetDate: params.targetDate,
          recipientRole: params.recipientRole,
        },
      }),
    })
  } catch (error) {
    console.error('Failed to send reminder email:', error)
  }
}

async function sendExpiryReminderEmail(params: {
  to: string
  documentTitle: string
  documentNumber: string
  documentId: string
  daysUntilExpiry: number
  expiryDate: string
}) {
  try {
    await fetch(`${APP_URL}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: params.to,
        subject: `📅 Document Expiring: ${params.documentTitle} - ${params.daysUntilExpiry} days`,
        template: 'reminder',
        data: {
          documentTitle: params.documentTitle,
          documentNumber: params.documentNumber,
          documentId: params.documentId,
          daysRemaining: String(params.daysUntilExpiry),
          targetDate: params.expiryDate,
          recipientRole: 'Document Owner',
        },
      }),
    })
  } catch (error) {
    console.error('Failed to send expiry reminder email:', error)
  }
}
