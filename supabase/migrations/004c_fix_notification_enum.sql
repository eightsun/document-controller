-- ============================================================================
-- DOCUMENT CONTROLLER - MIGRATION 004c
-- ============================================================================
-- Version: 1.0.0
-- Description: Add missing notification_type enum values that were being used
--              by server actions but were not present in the DB enum, causing
--              all those notification inserts to silently fail.
--
-- Missing types discovered:
--   review_submitted         — used when a reviewer submits their review
--   document_approved        — used when approver approves or training completes
--   document_rejected        — used when approver rejects or cancel is requested
--   comment_added            — used when a comment is posted on a document
--   obsolete_approval_required — used when obsolete is requested (notify approver)
--   document_obsoleted       — used when approver marks document as obsolete
--   obsolete_rejected        — used when approver rejects the obsolete request
-- ============================================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'review_submitted'          AFTER 'system';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'document_approved'         AFTER 'review_submitted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'document_rejected'         AFTER 'document_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'comment_added'             AFTER 'document_rejected';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'obsolete_approval_required' AFTER 'comment_added';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'document_obsoleted'        AFTER 'obsolete_approval_required';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'obsolete_rejected'         AFTER 'document_obsoleted';
