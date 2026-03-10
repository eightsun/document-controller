-- ============================================================================
-- DOCUMENT CONTROLLER - MIGRATION 004d
-- ============================================================================
-- Version: 1.0.0
-- Description: Fix RLS UPDATE policy on documents to allow the designated
--              obsolete approver to update the document status when approving
--              or rejecting an obsolete request.
--
-- Problem: The existing UPDATE policy only allows creator or Admin/BPM to
--          update documents. The obsolete approver (who may be neither) cannot
--          change the document status when approving/rejecting.
-- ============================================================================

-- Drop the existing update policy
DROP POLICY IF EXISTS "Document creator and Admin/BPM can update documents" ON documents;

-- Recreate with obsolete approver included
CREATE POLICY "Document creator, Admin/BPM, or obsolete approver can update documents"
    ON documents FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid() OR
        is_admin_or_bpm(auth.uid()) OR
        obsolete_approver_id = auth.uid()
    )
    WITH CHECK (
        created_by = auth.uid() OR
        is_admin_or_bpm(auth.uid()) OR
        obsolete_approver_id = auth.uid()
    );
