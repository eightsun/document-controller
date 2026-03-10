-- ============================================================================
-- DOCUMENT CONTROLLER - MIGRATION 004b
-- ============================================================================
-- Version: 1.0.0
-- Description: Fix timeline_event_type enum and status-change trigger
--              to handle Obsolete Pending, Obsolete, and training statuses.
--              Also fixes missing training event types that caused silent
--              failures in training timeline inserts.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Add missing timeline event type enum values
-- ----------------------------------------------------------------------------
ALTER TYPE timeline_event_type ADD VALUE IF NOT EXISTS 'training_started'     AFTER 'cancelled';
ALTER TYPE timeline_event_type ADD VALUE IF NOT EXISTS 'training_acknowledged' AFTER 'training_started';
ALTER TYPE timeline_event_type ADD VALUE IF NOT EXISTS 'training_completed'    AFTER 'training_acknowledged';
ALTER TYPE timeline_event_type ADD VALUE IF NOT EXISTS 'obsolete_requested'    AFTER 'training_completed';
ALTER TYPE timeline_event_type ADD VALUE IF NOT EXISTS 'obsolete_approved'     AFTER 'obsolete_requested';
ALTER TYPE timeline_event_type ADD VALUE IF NOT EXISTS 'obsolete_rejected'     AFTER 'obsolete_approved';
ALTER TYPE timeline_event_type ADD VALUE IF NOT EXISTS 'revision_initiated'    AFTER 'obsolete_rejected';

-- ----------------------------------------------------------------------------
-- STEP 2: Fix the status-change trigger to handle new statuses
--         (previously unhandled statuses caused NULL event_type → NOT NULL error)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION track_document_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM add_document_timeline(
            NEW.id,
            CASE NEW.status
                WHEN 'Initiation'       THEN 'created'::timeline_event_type
                WHEN 'Review'           THEN 'review_started'::timeline_event_type
                WHEN 'Waiting Approval' THEN 'submitted_for_approval'::timeline_event_type
                WHEN 'Approved'         THEN 'approved'::timeline_event_type
                WHEN 'Closed'           THEN 'closed'::timeline_event_type
                WHEN 'Rejected'         THEN 'rejected'::timeline_event_type
                WHEN 'Cancel'           THEN 'cancelled'::timeline_event_type
                WHEN 'Training'         THEN 'training_started'::timeline_event_type
                WHEN 'Obsolete Pending' THEN 'obsolete_requested'::timeline_event_type
                WHEN 'Obsolete'         THEN 'obsolete_approved'::timeline_event_type
                ELSE                         'edited'::timeline_event_type
            END,
            'Status changed to ' || NEW.status::TEXT,
            NULL,
            auth.uid(),
            OLD.status,
            NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
