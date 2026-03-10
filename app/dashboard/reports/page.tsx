import { createClient } from '@/utils/supabase/server'
import ReportsClient from './ReportsClient'

export const metadata = {
  title: 'Reports | Document Controller',
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const [
    { data: documents },
    { data: recentActivityRaw },
    { data: reviewAssignmentsRaw },
    { data: reviewsRaw },
    { data: profilesRaw },
  ] = await Promise.all([
    // All non-deleted documents for period charts
    supabase
      .from('documents_with_details')
      .select('id, created_at, status, department_id, department_name, document_type_name, document_type_code')
      .order('created_at', { ascending: false }),

    // Latest 10 timeline events
    supabase
      .from('document_timeline')
      .select('id, event_type, event_title, created_at, documents(document_number, title)')
      .order('created_at', { ascending: false })
      .limit(10),

    // All reviewer assignments (no role filter — reviewer only)
    supabase
      .from('document_assignments')
      .select('id, user_id, document_id, assigned_at, is_completed, completed_at')
      .eq('role_type', 'reviewer'),

    // All document reviews — used to get submitted_at for SLA
    supabase
      .from('document_reviews')
      .select('id, document_id, reviewer_id, assignment_id, submitted_at'),

    // All active profiles with department for BPM filter
    supabase
      .from('profiles')
      .select('id, full_name, email, departments(name)')
      .eq('is_active', true),
  ])

  // ── Lookup maps ────────────────────────────────────────────────
  const profileMap: Record<string, { full_name: string; email: string | null; department_name: string | null }> = {}
  for (const p of profilesRaw ?? []) {
    profileMap[(p as any).id] = {
      full_name: (p as any).full_name ?? 'Unknown',
      email: (p as any).email ?? null,
      department_name: (p as any).departments?.name ?? null,
    }
  }

  // submitted_at lookup: by assignment_id (primary) and reviewer_id+document_id (fallback)
  const reviewByAssignment: Record<string, string | null> = {}
  const reviewByReviewerDoc: Record<string, string | null> = {}
  for (const r of reviewsRaw ?? []) {
    const ra = r as any
    if (ra.assignment_id) reviewByAssignment[ra.assignment_id] = ra.submitted_at ?? null
    reviewByReviewerDoc[`${ra.reviewer_id}_${ra.document_id}`] = ra.submitted_at ?? null
  }

  // Document status lookup (from documents_with_details — already non-deleted)
  const docStatusMap: Record<string, string> = {}
  for (const d of documents ?? []) {
    docStatusMap[(d as any).id] = (d as any).status
  }

  // ── Build denormalised reviewer assignment rows ─────────────────
  const reviewerAssignments = (reviewAssignmentsRaw ?? []).map(a => {
    const ra = a as any
    const profile = profileMap[ra.user_id] ?? { full_name: 'Unknown', email: null }
    const submittedAt =
      reviewByAssignment[ra.id] ??
      reviewByReviewerDoc[`${ra.user_id}_${ra.document_id}`] ??
      null
    return {
      assignment_id: ra.id as string,
      user_id: ra.user_id as string,
      document_id: ra.document_id as string,
      assigned_at: ra.assigned_at as string,
      is_completed: ra.is_completed as boolean,
      completed_at: ra.completed_at as string | null,
      reviewer_name: profile.full_name,
      reviewer_email: profile.email,
      reviewer_department: profile.department_name,
      document_status: docStatusMap[ra.document_id] ?? 'Unknown',
      review_submitted_at: submittedAt,
    }
  })

  // ── Map recent activity ─────────────────────────────────────────
  const recentActivity = (recentActivityRaw ?? []).map((a: any) => ({
    id: a.id as string,
    event_type: a.event_type as string,
    event_title: a.event_title as string,
    created_at: a.created_at as string,
    document_number: (a.documents as any)?.document_number as string | null,
    document_title: (a.documents as any)?.title as string | null,
  }))

  return (
    <ReportsClient
      documents={documents ?? []}
      recentActivity={recentActivity}
      reviewerAssignments={reviewerAssignments}
    />
  )
}
