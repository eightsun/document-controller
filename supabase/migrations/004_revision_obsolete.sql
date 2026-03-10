-- ============================================================================
-- DOCUMENT CONTROLLER - MIGRATION 004
-- ============================================================================
-- Version: 1.0.0
-- Description: Add Document Revision and Obsolete workflow
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Add parent_document_id for revision tracking
-- ----------------------------------------------------------------------------
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(id);

-- ----------------------------------------------------------------------------
-- STEP 2: Add obsolete workflow columns
-- ----------------------------------------------------------------------------
ALTER TABLE documents ADD COLUMN IF NOT EXISTS obsolete_reason TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS obsolete_requested_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS obsolete_requested_by UUID REFERENCES auth.users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS obsolete_approver_id UUID REFERENCES auth.users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS obsolete_approved_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS obsolete_rejected_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS obsolete_rejection_reason TEXT;

-- ----------------------------------------------------------------------------
-- STEP 3: Add new status enum values
-- (PostgreSQL only allows adding, not reordering enum values)
-- ----------------------------------------------------------------------------
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'Obsolete Pending' AFTER 'Closed';
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'Obsolete' AFTER 'Obsolete Pending';

-- ----------------------------------------------------------------------------
-- STEP 4: Recreate documents_with_details view
-- Adds: obsolete_approver_name, parent_document_number (from migration 003 base)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS documents_with_details;
CREATE VIEW documents_with_details AS
SELECT
    d.*,
    dt.name    AS document_type_name,
    dt.prefix  AS document_type_prefix,
    dep.name   AS department_name,
    dep.code   AS department_code,
    le.name    AS legal_entity_name,
    le.code    AS legal_entity_code,
    sd.name    AS sub_department_name,
    p.full_name  AS created_by_name,
    p.email      AS created_by_email,
    oa.full_name AS obsolete_approver_name,
    pdoc.document_number AS parent_document_number,
    (SELECT COUNT(*) FROM document_reviews    WHERE document_id = d.id AND document_reviews.review_status = 'completed') AS completed_reviews,
    (SELECT COUNT(*) FROM document_assignments WHERE document_id = d.id AND role_type = 'reviewer')                       AS total_reviewers,
    (SELECT COUNT(*) FROM document_approvals  WHERE document_id = d.id AND decision IS NOT NULL)                          AS completed_approvals,
    (SELECT COUNT(*) FROM document_training   WHERE document_id = d.id)                                                   AS total_trainees,
    (SELECT COUNT(*) FROM document_training   WHERE document_id = d.id AND acknowledged = true)                           AS completed_trainees
FROM documents d
LEFT JOIN document_types  dt   ON d.document_type_id    = dt.id
LEFT JOIN departments     dep  ON d.department_id        = dep.id
LEFT JOIN legal_entities  le   ON dep.legal_entity_id    = le.id
LEFT JOIN sub_departments sd   ON d.sub_department_id    = sd.id
LEFT JOIN profiles        p    ON d.created_by           = p.id
LEFT JOIN profiles        oa   ON d.obsolete_approver_id = oa.id
LEFT JOIN documents       pdoc ON d.parent_document_id   = pdoc.id
WHERE d.is_deleted = false;
