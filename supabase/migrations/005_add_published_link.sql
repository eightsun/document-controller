-- ============================================================================
-- DOCUMENT CONTROLLER - MIGRATION 005
-- ============================================================================
-- Version: 1.0.0
-- Description: Add published_link column to documents.
--              This is distinct from draft_link (used during review).
--              published_link is set by Admin/BPM after approval and contains
--              the final published document URL used during training.
-- ============================================================================

ALTER TABLE documents ADD COLUMN IF NOT EXISTS published_link TEXT;
