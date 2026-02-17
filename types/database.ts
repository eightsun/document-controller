// ============================================================================
// DATABASE TYPES
// ============================================================================

export type DocumentStatus = 
  | 'Initiation'
  | 'Review'
  | 'Waiting Approval'
  | 'Approved'
  | 'Closed'
  | 'Rejected'
  | 'Cancel';

export type AssignmentRoleType = 'submitter' | 'reviewer' | 'approver';

export type ApprovalDecision = 'approved' | 'rejected' | 'returned';

export type ReviewStatus = 'pending' | 'in_progress' | 'completed';

export type TimelineEventType =
  | 'created'
  | 'submitted'
  | 'assigned_reviewer'
  | 'review_started'
  | 'review_completed'
  | 'submitted_for_approval'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'published'
  | 'closed'
  | 'cancelled'
  | 'edited'
  | 'comment_added'
  | 'reopened';

export type NotificationType =
  | 'assignment'
  | 'review_request'
  | 'approval_request'
  | 'status_change'
  | 'comment'
  | 'reminder'
  | 'system';

// ============================================================================
// TABLE INTERFACES
// ============================================================================

export interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, unknown>;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  employee_id: string | null;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  job_title: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  expires_at: string | null;
}

export interface DocumentType {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  prefix: string | null;
  template_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  document_number: string | null;
  title: string;
  description: string | null;
  document_type_id: string;
  department_id: string | null;
  status: DocumentStatus;
  version: string;
  revision_number: number;
  draft_link: string | null;
  final_link: string | null;
  sharepoint_folder_url: string | null;
  target_approval_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  next_review_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  rejected_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  keywords: string[] | null;
  notes: string | null;
  cancellation_reason: string | null;
  rejection_reason: string | null;
}

export interface DocumentAssignment {
  id: string;
  document_id: string;
  user_id: string;
  role_type: AssignmentRoleType;
  sequence_order: number;
  assigned_by: string | null;
  assigned_at: string;
  is_completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  assignment_notes: string | null;
}

export interface DocumentReview {
  id: string;
  document_id: string;
  reviewer_id: string;
  assignment_id: string | null;
  status: ReviewStatus;
  comments: string | null;
  remarks: string | null;
  feedback_summary: string | null;
  reviewed_document_link: string | null;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentApproval {
  id: string;
  document_id: string;
  approver_id: string;
  assignment_id: string | null;
  decision: ApprovalDecision | null;
  comments: string | null;
  conditions: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface DocumentTimeline {
  id: string;
  document_id: string;
  event_type: TimelineEventType;
  event_title: string;
  event_description: string | null;
  old_status: DocumentStatus | null;
  new_status: DocumentStatus | null;
  performed_by: string | null;
  performed_by_name: string | null;
  related_user_id: string | null;
  related_user_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  document_id: string | null;
  link: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  priority: number;
  created_at: string;
  expires_at: string | null;
}

export interface DocumentComment {
  id: string;
  document_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VIEW INTERFACES
// ============================================================================

export interface DocumentWithDetails extends Document {
  document_type_name: string;
  document_type_prefix: string;
  department_name: string | null;
  department_code: string | null;
  created_by_name: string;
  created_by_email: string;
  completed_reviews: number;
  total_reviewers: number;
  completed_approvals: number;
}

export interface UserWithRoles extends Profile {
  department_name: string | null;
  roles: string[];
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface DepartmentFormData {
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

export interface DocumentFormData {
  title: string;
  description: string;
  document_type_id: string;
  department_id: string;
  draft_link: string;
  target_approval_date: string;
  affected_department_ids: string[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface UserSession {
  id: string;
  email: string;
  roles: string[];
  profile: Profile | null;
}
