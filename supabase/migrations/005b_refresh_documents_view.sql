-- ============================================================================
-- DOCUMENT CONTROLLER - MIGRATION 005b
-- ============================================================================
-- Version: 1.0.0
-- Description: Recreate documents_with_details view so that d.* expands to
--              include the published_link column added in migration 005.
--              In PostgreSQL, SELECT d.* inside a view is locked to the columns
--              present at view creation time — new columns on the base table
--              are NOT automatically visible until the view is recreated.
-- ============================================================================

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
