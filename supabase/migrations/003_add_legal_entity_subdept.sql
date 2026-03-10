-- ============================================================================
-- DOCUMENT CONTROLLER - MIGRATION 003
-- ============================================================================
-- Version: 1.0.2
-- Description: Add Legal Entity and Sub-Department organizational hierarchy
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Create legal_entities table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS legal_entities (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ  DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_legal_entities_code   ON legal_entities(code);
CREATE INDEX IF NOT EXISTS idx_legal_entities_active ON legal_entities(is_active) WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- STEP 2: Enable RLS on legal_entities
-- ----------------------------------------------------------------------------
ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Legal entities viewable by authenticated users"
    ON legal_entities FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Admin and BPM can manage legal entities"
    ON legal_entities FOR ALL
    TO authenticated
    USING (is_admin_or_bpm(auth.uid()))
    WITH CHECK (is_admin_or_bpm(auth.uid()));

-- ----------------------------------------------------------------------------
-- STEP 3: Add legal_entity_id FK to departments
-- ----------------------------------------------------------------------------
ALTER TABLE departments ADD COLUMN IF NOT EXISTS legal_entity_id UUID REFERENCES legal_entities(id);
CREATE INDEX IF NOT EXISTS idx_departments_legal_entity ON departments(legal_entity_id);

-- ----------------------------------------------------------------------------
-- STEP 4: Create sub_departments table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sub_departments (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(255) NOT NULL,
    code          VARCHAR(50),
    department_id UUID        NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ  DEFAULT NULL,
    UNIQUE(department_id, code)
);

CREATE INDEX IF NOT EXISTS idx_sub_departments_dept   ON sub_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_sub_departments_active ON sub_departments(is_active) WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- STEP 5: Enable RLS on sub_departments
-- ----------------------------------------------------------------------------
ALTER TABLE sub_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sub-departments viewable by authenticated users"
    ON sub_departments FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Admin and BPM can manage sub-departments"
    ON sub_departments FOR ALL
    TO authenticated
    USING (is_admin_or_bpm(auth.uid()))
    WITH CHECK (is_admin_or_bpm(auth.uid()));

-- ----------------------------------------------------------------------------
-- STEP 6: Add sub_department_id FK to documents
-- ----------------------------------------------------------------------------
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sub_department_id UUID REFERENCES sub_departments(id);

-- ----------------------------------------------------------------------------
-- STEP 7: Add updated_at triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_legal_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_legal_entities_updated_at
    BEFORE UPDATE ON legal_entities
    FOR EACH ROW EXECUTE FUNCTION update_legal_entities_updated_at();

CREATE OR REPLACE FUNCTION update_sub_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sub_departments_updated_at
    BEFORE UPDATE ON sub_departments
    FOR EACH ROW EXECUTE FUNCTION update_sub_departments_updated_at();

-- ----------------------------------------------------------------------------
-- STEP 8: Recreate documents_with_details view
-- Adds: legal_entity_name, legal_entity_code, sub_department_name,
--       sub_department_id, total_trainees, completed_trainees
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
    p.full_name AS created_by_name,
    p.email     AS created_by_email,
    (SELECT COUNT(*) FROM document_reviews    WHERE document_id = d.id AND document_reviews.review_status = 'completed')  AS completed_reviews,
    (SELECT COUNT(*) FROM document_assignments WHERE document_id = d.id AND role_type = 'reviewer')       AS total_reviewers,
    (SELECT COUNT(*) FROM document_approvals  WHERE document_id = d.id AND decision IS NOT NULL)          AS completed_approvals,
    (SELECT COUNT(*) FROM document_training   WHERE document_id = d.id)                                   AS total_trainees,
    (SELECT COUNT(*) FROM document_training   WHERE document_id = d.id AND acknowledged = true)           AS completed_trainees
FROM documents d
LEFT JOIN document_types  dt  ON d.document_type_id   = dt.id
LEFT JOIN departments     dep ON d.department_id       = dep.id
LEFT JOIN legal_entities  le  ON dep.legal_entity_id   = le.id
LEFT JOIN sub_departments sd  ON d.sub_department_id   = sd.id
LEFT JOIN profiles        p   ON d.created_by          = p.id
WHERE d.is_deleted = false;
