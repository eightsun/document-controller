-- ============================================================================
-- DOCUMENT CONTROLLER - MIGRATION 002
-- ============================================================================
-- Version: 1.0.1
-- Description: Add Training status stage between Approved and Closed
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Extend document_status enum with 'Training'
-- Note: PostgreSQL ALTER TYPE ADD VALUE is irreversible. Run on staging first.
-- ----------------------------------------------------------------------------
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'Training' BEFORE 'Closed';

-- ----------------------------------------------------------------------------
-- STEP 2: Extend timeline_event_type enum with training events
-- ----------------------------------------------------------------------------
ALTER TYPE timeline_event_type ADD VALUE IF NOT EXISTS 'training_started' AFTER 'published';
ALTER TYPE timeline_event_type ADD VALUE IF NOT EXISTS 'training_acknowledged' AFTER 'training_started';
ALTER TYPE timeline_event_type ADD VALUE IF NOT EXISTS 'training_completed' AFTER 'training_acknowledged';

-- ----------------------------------------------------------------------------
-- STEP 3: Extend notification_type enum with training notification
-- ----------------------------------------------------------------------------
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'training_assigned' AFTER 'status_change';

-- ----------------------------------------------------------------------------
-- STEP 4: Add training_started_at column to documents table
-- ----------------------------------------------------------------------------
ALTER TABLE documents ADD COLUMN IF NOT EXISTS training_started_at TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- STEP 5: Add closed_by column to documents table (actions.ts already writes it)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'closed_by'
  ) THEN
    ALTER TABLE documents ADD COLUMN closed_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 6: Create document_training table
-- Tracks each trainee's acknowledgment of a document after Approval
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_training (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    acknowledged       BOOLEAN      NOT NULL DEFAULT false,
    acknowledged_at    TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_training_document    ON document_training(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_training_user        ON document_training(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_training_ack         ON document_training(document_id, acknowledged);

-- ----------------------------------------------------------------------------
-- STEP 7: Enable Row Level Security on document_training
-- ----------------------------------------------------------------------------
ALTER TABLE document_training ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view training records
CREATE POLICY "Training records viewable by authenticated users"
    ON document_training FOR SELECT
    TO authenticated
    USING (true);

-- Only Admin/BPM can insert training records (done programmatically via startTraining)
CREATE POLICY "Admin and BPM can create training records"
    ON document_training FOR INSERT
    TO authenticated
    WITH CHECK (is_admin_or_bpm(auth.uid()));

-- Users can acknowledge their own training; Admin/BPM can update any record
CREATE POLICY "Users can acknowledge their own training"
    ON document_training FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR is_admin_or_bpm(auth.uid())
    );

-- Admin/BPM can delete training records (e.g., restarting training)
CREATE POLICY "Admin and BPM can delete training records"
    ON document_training FOR DELETE
    TO authenticated
    USING (is_admin_or_bpm(auth.uid()));

-- ----------------------------------------------------------------------------
-- STEP 8: Update track_document_status_change trigger to handle 'Training'
-- The original trigger has no WHEN 'Training' case, causing NULL event_type
-- which violates the NOT NULL constraint on document_timeline.event_type
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION track_document_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM add_document_timeline(
            NEW.id,
            CASE NEW.status
                WHEN 'Initiation'        THEN 'created'::timeline_event_type
                WHEN 'Review'            THEN 'review_started'::timeline_event_type
                WHEN 'Waiting Approval'  THEN 'submitted_for_approval'::timeline_event_type
                WHEN 'Approved'          THEN 'approved'::timeline_event_type
                WHEN 'Training'          THEN 'training_started'::timeline_event_type
                WHEN 'Closed'            THEN 'closed'::timeline_event_type
                WHEN 'Rejected'          THEN 'rejected'::timeline_event_type
                WHEN 'Cancel'            THEN 'cancelled'::timeline_event_type
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

-- ----------------------------------------------------------------------------
-- STEP 9: updated_at trigger for document_training
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_document_training_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_document_training_updated_at
    BEFORE UPDATE ON document_training
    FOR EACH ROW
    EXECUTE FUNCTION update_document_training_updated_at();
