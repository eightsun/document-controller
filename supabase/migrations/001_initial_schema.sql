-- ============================================================================
-- DOCUMENT CONTROLLER - DATABASE SCHEMA
-- ============================================================================
-- Version: 1.0.0
-- Created: 2024
-- Description: Complete database schema for Document Controller system
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CUSTOM TYPES (ENUMS)
-- ============================================================================

-- Document Status Enum
CREATE TYPE document_status AS ENUM (
    'Initiation',
    'Review',
    'Waiting Approval',
    'Approved',
    'Closed',
    'Rejected',
    'Cancel'
);

-- Assignment Role Type Enum
CREATE TYPE assignment_role_type AS ENUM (
    'submitter',
    'reviewer',
    'approver'
);

-- Approval Decision Enum
CREATE TYPE approval_decision AS ENUM (
    'approved',
    'rejected',
    'returned'
);

-- Review Status Enum
CREATE TYPE review_status AS ENUM (
    'pending',
    'in_progress',
    'completed'
);

-- Timeline Event Type Enum
CREATE TYPE timeline_event_type AS ENUM (
    'created',
    'submitted',
    'assigned_reviewer',
    'review_started',
    'review_completed',
    'submitted_for_approval',
    'approved',
    'rejected',
    'returned',
    'published',
    'closed',
    'cancelled',
    'edited',
    'comment_added',
    'reopened'
);

-- Notification Type Enum
CREATE TYPE notification_type AS ENUM (
    'assignment',
    'review_request',
    'approval_request',
    'status_change',
    'comment',
    'reminder',
    'system'
);

-- ============================================================================
-- TABLE: departments
-- ============================================================================
-- Stores all company departments
-- Supports soft delete via deleted_at column

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Index for faster lookups
CREATE INDEX idx_departments_name ON departments(name);
CREATE INDEX idx_departments_code ON departments(code);
CREATE INDEX idx_departments_active ON departments(is_active) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLE: roles
-- ============================================================================
-- System roles for access control

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for role lookups
CREATE INDEX idx_roles_name ON roles(name);

-- ============================================================================
-- TABLE: profiles
-- ============================================================================
-- Extended user profile linked to auth.users

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    employee_id VARCHAR(50) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(50),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    job_title VARCHAR(255),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profile lookups
CREATE INDEX idx_profiles_department ON profiles(department_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_employee_id ON profiles(employee_id);
CREATE INDEX idx_profiles_active ON profiles(is_active);

-- ============================================================================
-- TABLE: user_roles
-- ============================================================================
-- Many-to-many relationship between users and roles

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id, role_id)
);

-- Indexes for user role lookups
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- ============================================================================
-- TABLE: document_types
-- ============================================================================
-- Types of documents (Policy, Procedure, Process, Working Instruction)

CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) UNIQUE,
    description TEXT,
    prefix VARCHAR(10),
    template_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for document type lookups
CREATE INDEX idx_document_types_name ON document_types(name);
CREATE INDEX idx_document_types_code ON document_types(code);

-- ============================================================================
-- TABLE: documents
-- ============================================================================
-- Main documents table - stores metadata and SharePoint links

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Document Identification
    document_number VARCHAR(100) UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Classification
    document_type_id UUID NOT NULL REFERENCES document_types(id),
    department_id UUID REFERENCES departments(id),
    
    -- Status & Workflow
    status document_status DEFAULT 'Initiation',
    version VARCHAR(20) DEFAULT '1.0',
    revision_number INT DEFAULT 1,
    
    -- SharePoint Links (No direct file storage)
    draft_link TEXT,
    final_link TEXT,
    sharepoint_folder_url TEXT,
    
    -- Important Dates
    target_approval_date DATE,
    effective_date DATE,
    expiry_date DATE,
    next_review_date DATE,
    
    -- Audit Trail
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    
    -- Soft Delete
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    
    -- Additional Metadata
    keywords TEXT[],
    notes TEXT,
    cancellation_reason TEXT,
    rejection_reason TEXT
);

-- Indexes for document queries
CREATE INDEX idx_documents_number ON documents(document_number);
CREATE INDEX idx_documents_title ON documents(title);
CREATE INDEX idx_documents_type ON documents(document_type_id);
CREATE INDEX idx_documents_department ON documents(department_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_effective_date ON documents(effective_date);
CREATE INDEX idx_documents_expiry_date ON documents(expiry_date);
CREATE INDEX idx_documents_not_deleted ON documents(is_deleted) WHERE is_deleted = false;

-- ============================================================================
-- TABLE: affected_departments
-- ============================================================================
-- Many-to-many: Documents affecting multiple departments

CREATE TABLE affected_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, department_id)
);

-- Indexes
CREATE INDEX idx_affected_dept_document ON affected_departments(document_id);
CREATE INDEX idx_affected_dept_department ON affected_departments(department_id);

-- ============================================================================
-- TABLE: document_assignments
-- ============================================================================
-- Assigns users to documents as submitter, reviewer, or approver

CREATE TABLE document_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_type assignment_role_type NOT NULL,
    
    -- For ordering reviewers (Reviewer 1, Reviewer 2, etc.)
    sequence_order INT DEFAULT 1,
    
    -- Assignment tracking
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Completion tracking
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    
    -- Due date for this assignment
    due_date DATE,
    
    -- Notes from assigner
    assignment_notes TEXT,
    
    UNIQUE(document_id, user_id, role_type)
);

-- Indexes
CREATE INDEX idx_assignments_document ON document_assignments(document_id);
CREATE INDEX idx_assignments_user ON document_assignments(user_id);
CREATE INDEX idx_assignments_role ON document_assignments(role_type);
CREATE INDEX idx_assignments_pending ON document_assignments(is_completed) WHERE is_completed = false;

-- ============================================================================
-- TABLE: document_reviews
-- ============================================================================
-- Records review activities and comments

CREATE TABLE document_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id),
    assignment_id UUID REFERENCES document_assignments(id),
    
    -- Review Status
    status review_status DEFAULT 'pending',
    
    -- Review Content
    comments TEXT,
    remarks TEXT,
    feedback_summary TEXT,
    
    -- SharePoint link to reviewed document (if different from original)
    reviewed_document_link TEXT,
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reviews_document ON document_reviews(document_id);
CREATE INDEX idx_reviews_reviewer ON document_reviews(reviewer_id);
CREATE INDEX idx_reviews_status ON document_reviews(status);
CREATE INDEX idx_reviews_submitted ON document_reviews(submitted_at DESC);

-- ============================================================================
-- TABLE: document_approvals
-- ============================================================================
-- Records approval decisions

CREATE TABLE document_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES auth.users(id),
    assignment_id UUID REFERENCES document_assignments(id),
    
    -- Decision
    decision approval_decision,
    
    -- Comments
    comments TEXT,
    conditions TEXT,
    
    -- Timestamps
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_approvals_document ON document_approvals(document_id);
CREATE INDEX idx_approvals_approver ON document_approvals(approver_id);
CREATE INDEX idx_approvals_decision ON document_approvals(decision);
CREATE INDEX idx_approvals_decided ON document_approvals(decided_at DESC);

-- ============================================================================
-- TABLE: document_timeline
-- ============================================================================
-- Complete audit trail of all document events

CREATE TABLE document_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type timeline_event_type NOT NULL,
    event_title VARCHAR(255) NOT NULL,
    event_description TEXT,
    
    -- Status Change Tracking
    old_status document_status,
    new_status document_status,
    
    -- Who performed the action
    performed_by UUID REFERENCES auth.users(id),
    performed_by_name VARCHAR(255),
    
    -- Related entities
    related_user_id UUID REFERENCES auth.users(id),
    related_user_name VARCHAR(255),
    
    -- Additional data (flexible JSON storage)
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_timeline_document ON document_timeline(document_id);
CREATE INDEX idx_timeline_event ON document_timeline(event_type);
CREATE INDEX idx_timeline_created ON document_timeline(created_at DESC);
CREATE INDEX idx_timeline_performed_by ON document_timeline(performed_by);

-- ============================================================================
-- TABLE: notifications
-- ============================================================================
-- User notifications for assignments, updates, reminders

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification Content
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Related Document (optional)
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Link to action
    link TEXT,
    action_url TEXT,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Priority (1=low, 2=normal, 3=high, 4=urgent)
    priority INT DEFAULT 2,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_document ON notifications(document_id);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- ============================================================================
-- TABLE: document_comments
-- ============================================================================
-- General comments on documents (separate from review comments)

CREATE TABLE document_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Comment Content
    content TEXT NOT NULL,
    
    -- Reply threading
    parent_id UUID REFERENCES document_comments(id),
    
    -- Edit tracking
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    
    -- Soft delete
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_comments_document ON document_comments(document_id);
CREATE INDEX idx_comments_user ON document_comments(user_id);
CREATE INDEX idx_comments_parent ON document_comments(parent_id);
CREATE INDEX idx_comments_created ON document_comments(created_at DESC);

-- ============================================================================
-- TABLE: settings
-- ============================================================================
-- System-wide settings and configurations

CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_settings_key ON settings(key);

-- ============================================================================
-- FUNCTIONS: Auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_types_updated_at BEFORE UPDATE ON document_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_reviews_updated_at BEFORE UPDATE ON document_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_comments_updated_at BEFORE UPDATE ON document_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Auto-create profile on user signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- FUNCTION: Add timeline entry
-- ============================================================================

CREATE OR REPLACE FUNCTION add_document_timeline(
    p_document_id UUID,
    p_event_type timeline_event_type,
    p_event_title VARCHAR(255),
    p_event_description TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL,
    p_old_status document_status DEFAULT NULL,
    p_new_status document_status DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_timeline_id UUID;
    v_performer_name VARCHAR(255);
BEGIN
    -- Get performer name if provided
    IF p_performed_by IS NOT NULL THEN
        SELECT full_name INTO v_performer_name FROM profiles WHERE id = p_performed_by;
    END IF;
    
    INSERT INTO document_timeline (
        document_id, event_type, event_title, event_description,
        old_status, new_status, performed_by, performed_by_name, metadata
    ) VALUES (
        p_document_id, p_event_type, p_event_title, p_event_description,
        p_old_status, p_new_status, p_performed_by, v_performer_name, p_metadata
    )
    RETURNING id INTO v_timeline_id;
    
    RETURN v_timeline_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Auto-add timeline on document status change
-- ============================================================================

CREATE OR REPLACE FUNCTION track_document_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM add_document_timeline(
            NEW.id,
            CASE NEW.status
                WHEN 'Initiation' THEN 'created'::timeline_event_type
                WHEN 'Review' THEN 'review_started'::timeline_event_type
                WHEN 'Waiting Approval' THEN 'submitted_for_approval'::timeline_event_type
                WHEN 'Approved' THEN 'approved'::timeline_event_type
                WHEN 'Closed' THEN 'closed'::timeline_event_type
                WHEN 'Rejected' THEN 'rejected'::timeline_event_type
                WHEN 'Cancel' THEN 'cancelled'::timeline_event_type
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

CREATE TRIGGER track_document_status
    AFTER UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION track_document_status_change();

-- ============================================================================
-- FUNCTION: Generate document number
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_document_number(
    p_document_type_id UUID,
    p_department_id UUID DEFAULT NULL
)
RETURNS VARCHAR(100) AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_dept_code VARCHAR(10);
    v_year VARCHAR(4);
    v_sequence INT;
    v_doc_number VARCHAR(100);
BEGIN
    -- Get document type prefix
    SELECT COALESCE(prefix, 'DOC') INTO v_prefix FROM document_types WHERE id = p_document_type_id;
    
    -- Get department code if provided
    IF p_department_id IS NOT NULL THEN
        SELECT COALESCE(code, 'GEN') INTO v_dept_code FROM departments WHERE id = p_department_id;
    ELSE
        v_dept_code := 'GEN';
    END IF;
    
    -- Get current year
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(revision_number), 0) + 1 INTO v_sequence
    FROM documents
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND document_type_id = p_document_type_id;
    
    -- Generate document number: PREFIX-DEPT-YYYY-XXXX
    v_doc_number := v_prefix || '-' || v_dept_code || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');
    
    RETURN v_doc_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Check if user has role
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_role(p_user_id UUID, p_role_name VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND r.name = p_role_name
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Check if user is admin or BPM
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin_or_bpm(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN user_has_role(p_user_id, 'Admin') OR user_has_role(p_user_id, 'BPM');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE affected_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: departments
-- ============================================================================

-- Everyone can read active departments
CREATE POLICY "Departments are viewable by all authenticated users"
    ON departments FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- Only Admin/BPM can insert departments
CREATE POLICY "Only Admin/BPM can create departments"
    ON departments FOR INSERT
    TO authenticated
    WITH CHECK (is_admin_or_bpm(auth.uid()));

-- Only Admin/BPM can update departments
CREATE POLICY "Only Admin/BPM can update departments"
    ON departments FOR UPDATE
    TO authenticated
    USING (is_admin_or_bpm(auth.uid()));

-- Only Admin can delete (soft delete)
CREATE POLICY "Only Admin can delete departments"
    ON departments FOR DELETE
    TO authenticated
    USING (user_has_role(auth.uid(), 'Admin'));

-- ============================================================================
-- RLS POLICIES: roles
-- ============================================================================

-- Everyone can view roles
CREATE POLICY "Roles are viewable by all authenticated users"
    ON roles FOR SELECT
    TO authenticated
    USING (true);

-- Only Admin can manage roles
CREATE POLICY "Only Admin can create roles"
    ON roles FOR INSERT
    TO authenticated
    WITH CHECK (user_has_role(auth.uid(), 'Admin'));

CREATE POLICY "Only Admin can update roles"
    ON roles FOR UPDATE
    TO authenticated
    USING (user_has_role(auth.uid(), 'Admin'));

-- ============================================================================
-- RLS POLICIES: profiles
-- ============================================================================

-- Users can view all profiles (for displaying names, assignments, etc.)
CREATE POLICY "Profiles are viewable by all authenticated users"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Admin/BPM can update any profile
CREATE POLICY "Admin/BPM can update any profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (is_admin_or_bpm(auth.uid()));

-- ============================================================================
-- RLS POLICIES: user_roles
-- ============================================================================

-- Users can view all user roles
CREATE POLICY "User roles are viewable by all authenticated users"
    ON user_roles FOR SELECT
    TO authenticated
    USING (true);

-- Only Admin can assign roles
CREATE POLICY "Only Admin can assign roles"
    ON user_roles FOR INSERT
    TO authenticated
    WITH CHECK (user_has_role(auth.uid(), 'Admin'));

CREATE POLICY "Only Admin can remove roles"
    ON user_roles FOR DELETE
    TO authenticated
    USING (user_has_role(auth.uid(), 'Admin'));

-- ============================================================================
-- RLS POLICIES: document_types
-- ============================================================================

-- Everyone can view document types
CREATE POLICY "Document types are viewable by all authenticated users"
    ON document_types FOR SELECT
    TO authenticated
    USING (true);

-- Only Admin/BPM can manage document types
CREATE POLICY "Only Admin/BPM can create document types"
    ON document_types FOR INSERT
    TO authenticated
    WITH CHECK (is_admin_or_bpm(auth.uid()));

CREATE POLICY "Only Admin/BPM can update document types"
    ON document_types FOR UPDATE
    TO authenticated
    USING (is_admin_or_bpm(auth.uid()));

-- ============================================================================
-- RLS POLICIES: documents
-- ============================================================================

-- Users can view non-deleted documents
CREATE POLICY "Users can view non-deleted documents"
    ON documents FOR SELECT
    TO authenticated
    USING (is_deleted = false);

-- MQS Reps and above can create documents
CREATE POLICY "MQS Reps can create documents"
    ON documents FOR INSERT
    TO authenticated
    WITH CHECK (
        user_has_role(auth.uid(), 'MQS Reps') OR
        user_has_role(auth.uid(), 'BPM') OR
        user_has_role(auth.uid(), 'Admin')
    );

-- Document creator, BPM, or Admin can update
CREATE POLICY "Document creator and Admin/BPM can update documents"
    ON documents FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid() OR
        is_admin_or_bpm(auth.uid())
    );

-- Only Admin/BPM can delete (soft delete)
CREATE POLICY "Only Admin/BPM can delete documents"
    ON documents FOR DELETE
    TO authenticated
    USING (is_admin_or_bpm(auth.uid()));

-- ============================================================================
-- RLS POLICIES: affected_departments
-- ============================================================================

CREATE POLICY "Affected departments are viewable by all authenticated users"
    ON affected_departments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Document creator can manage affected departments"
    ON affected_departments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents
            WHERE id = document_id
            AND (created_by = auth.uid() OR is_admin_or_bpm(auth.uid()))
        )
    );

CREATE POLICY "Document creator can remove affected departments"
    ON affected_departments FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM documents
            WHERE id = document_id
            AND (created_by = auth.uid() OR is_admin_or_bpm(auth.uid()))
        )
    );

-- ============================================================================
-- RLS POLICIES: document_assignments
-- ============================================================================

CREATE POLICY "Assignments are viewable by all authenticated users"
    ON document_assignments FOR SELECT
    TO authenticated
    USING (true);

-- MQS Reps, BPM, Admin can create assignments
CREATE POLICY "MQS Reps can create assignments"
    ON document_assignments FOR INSERT
    TO authenticated
    WITH CHECK (
        user_has_role(auth.uid(), 'MQS Reps') OR
        user_has_role(auth.uid(), 'BPM') OR
        user_has_role(auth.uid(), 'Admin')
    );

-- Assigned user can update their own assignment (mark complete)
CREATE POLICY "Assigned user can update their assignment"
    ON document_assignments FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid() OR
        is_admin_or_bpm(auth.uid())
    );

-- ============================================================================
-- RLS POLICIES: document_reviews
-- ============================================================================

CREATE POLICY "Reviews are viewable by all authenticated users"
    ON document_reviews FOR SELECT
    TO authenticated
    USING (true);

-- Assigned reviewers can create reviews
CREATE POLICY "Assigned reviewers can create reviews"
    ON document_reviews FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM document_assignments
            WHERE document_id = document_reviews.document_id
            AND user_id = auth.uid()
            AND role_type = 'reviewer'
        )
    );

-- Reviewer can update their own review
CREATE POLICY "Reviewers can update their own reviews"
    ON document_reviews FOR UPDATE
    TO authenticated
    USING (
        reviewer_id = auth.uid() OR
        is_admin_or_bpm(auth.uid())
    );

-- ============================================================================
-- RLS POLICIES: document_approvals
-- ============================================================================

CREATE POLICY "Approvals are viewable by all authenticated users"
    ON document_approvals FOR SELECT
    TO authenticated
    USING (true);

-- Assigned approvers can create approvals
CREATE POLICY "Assigned approvers can create approvals"
    ON document_approvals FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM document_assignments
            WHERE document_id = document_approvals.document_id
            AND user_id = auth.uid()
            AND role_type = 'approver'
        )
    );

-- Approver can update their own approval
CREATE POLICY "Approvers can update their own approvals"
    ON document_approvals FOR UPDATE
    TO authenticated
    USING (
        approver_id = auth.uid() OR
        is_admin_or_bpm(auth.uid())
    );

-- ============================================================================
-- RLS POLICIES: document_timeline
-- ============================================================================

CREATE POLICY "Timeline is viewable by all authenticated users"
    ON document_timeline FOR SELECT
    TO authenticated
    USING (true);

-- System (functions) and Admin can create timeline entries
CREATE POLICY "Authenticated users can create timeline entries"
    ON document_timeline FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: notifications
-- ============================================================================

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- System can create notifications for any user
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
    ON notifications FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: document_comments
-- ============================================================================

CREATE POLICY "Comments are viewable by all authenticated users"
    ON document_comments FOR SELECT
    TO authenticated
    USING (is_deleted = false);

CREATE POLICY "Authenticated users can create comments"
    ON document_comments FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
    ON document_comments FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Users can delete their own comments, Admin can delete any
CREATE POLICY "Users can delete their own comments"
    ON document_comments FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid() OR
        user_has_role(auth.uid(), 'Admin')
    );

-- ============================================================================
-- RLS POLICIES: settings
-- ============================================================================

-- Public settings viewable by all, private only by Admin
CREATE POLICY "Public settings viewable by all"
    ON settings FOR SELECT
    TO authenticated
    USING (is_public = true OR user_has_role(auth.uid(), 'Admin'));

CREATE POLICY "Only Admin can manage settings"
    ON settings FOR ALL
    TO authenticated
    USING (user_has_role(auth.uid(), 'Admin'));

-- ============================================================================
-- INITIAL DATA: Roles
-- ============================================================================

INSERT INTO roles (name, description, is_system_role, permissions) VALUES
    ('Admin', 'System Administrator - Full access to all features including user management and system configuration', true, 
     '{"all": true}'),
    ('BPM', 'Business Process Management - Can manage documents, workflows, and department configurations', true,
     '{"documents": {"create": true, "read": true, "update": true, "delete": true}, "departments": {"manage": true}, "users": {"view": true}}'),
    ('MQS Reps', 'Management Quality System Representatives - Can create and manage documents, assign reviewers and approvers', true,
     '{"documents": {"create": true, "read": true, "update": true, "assign": true}}'),
    ('SME', 'Subject Matter Expert - Can review documents and provide feedback', true,
     '{"documents": {"read": true, "review": true}}'),
    ('Approver', 'Document Approver - Can approve or reject documents', true,
     '{"documents": {"read": true, "approve": true}}');

-- ============================================================================
-- INITIAL DATA: Document Types
-- ============================================================================

INSERT INTO document_types (name, code, prefix, description, sort_order) VALUES
    ('Policy', 'POL', 'POL', 'High-level organizational policies that define principles and guidelines', 1),
    ('Procedure', 'PRC', 'PRC', 'Step-by-step instructions for carrying out specific processes', 2),
    ('Process', 'PRS', 'PRS', 'Documentation of business processes and workflows', 3),
    ('Working Instruction', 'WI', 'WI', 'Detailed work instructions for specific tasks', 4);

-- ============================================================================
-- INITIAL DATA: 29 Departments
-- ============================================================================

INSERT INTO departments (name, code, description) VALUES
    ('Board of Director', 'BOD', 'Board of Directors - Executive leadership and governance'),
    ('Internal Audit', 'IA', 'Internal Audit Department - Compliance and audit functions'),
    ('Business Development', 'BD', 'Business Development - Growth strategies and partnerships'),
    ('Corporate Secretary', 'CS', 'Corporate Secretary - Legal and corporate governance'),
    ('Finance', 'FIN', 'Finance Department - Financial planning and accounting'),
    ('Information Technology', 'IT', 'Information Technology - Systems and digital infrastructure'),
    ('Human Capital', 'HC', 'Human Capital - Human resources and talent management'),
    ('Legal', 'LEG', 'Legal Department - Legal affairs and compliance'),
    ('Procurement', 'PRC', 'Procurement - Purchasing and vendor management'),
    ('Corporate Communication', 'CC', 'Corporate Communication - Public relations and communications'),
    ('Health Safety Security Environment', 'HSSE', 'HSSE - Health, Safety, Security, and Environment'),
    ('Commercial Domestics', 'CD', 'Commercial Domestics - Domestic commercial operations'),
    ('Commercial International', 'CI', 'Commercial International - International commercial operations'),
    ('Commercial Bulk and Energy', 'CBE', 'Commercial Bulk and Energy - Bulk cargo and energy sector'),
    ('Operations', 'OPS', 'Operations - Core operational activities'),
    ('Fleet Management', 'FM', 'Fleet Management - Vessel and fleet operations'),
    ('Technical', 'TECH', 'Technical Department - Engineering and technical support'),
    ('Container Depot', 'DEPOT', 'Container Depot - Container storage and handling'),
    ('Trucking', 'TRK', 'Trucking - Land transportation and logistics'),
    ('Logistic', 'LOG', 'Logistics - Supply chain and logistics management'),
    ('Warehouse', 'WH', 'Warehouse - Warehousing and inventory management'),
    ('Port', 'PORT', 'Port Operations - Port and terminal operations'),
    ('Project Logistics', 'PL', 'Project Logistics - Special project logistics'),
    ('Forwarding', 'FWD', 'Forwarding - Freight forwarding services'),
    ('Agency', 'AGY', 'Agency - Shipping agency services'),
    ('Ship Management', 'SM', 'Ship Management - Vessel management services'),
    ('Manning', 'MAN', 'Manning - Crew management and recruitment'),
    ('Marine Operation', 'MO', 'Marine Operations - Marine and vessel operations'),
    ('Research and Development', 'RND', 'Research and Development - Innovation and R&D');

-- ============================================================================
-- INITIAL DATA: System Settings
-- ============================================================================

INSERT INTO settings (key, value, description, is_public) VALUES
    ('app_name', '"Document Controller"', 'Application name', true),
    ('app_version', '"1.0.0"', 'Application version', true),
    ('company_name', '"PT Meratus Line"', 'Company name', true),
    ('default_review_days', '7', 'Default number of days for review completion', true),
    ('default_approval_days', '3', 'Default number of days for approval', true),
    ('document_number_format', '"{prefix}-{dept}-{year}-{seq}"', 'Document numbering format', false),
    ('max_reviewers', '5', 'Maximum number of reviewers per document', true),
    ('notification_email_enabled', 'true', 'Enable email notifications', false),
    ('sharepoint_base_url', '""', 'SharePoint base URL for document storage', false);

-- ============================================================================
-- VIEWS: Useful data views
-- ============================================================================

-- View: Documents with full details
CREATE OR REPLACE VIEW documents_with_details AS
SELECT 
    d.*,
    dt.name AS document_type_name,
    dt.prefix AS document_type_prefix,
    dep.name AS department_name,
    dep.code AS department_code,
    p.full_name AS created_by_name,
    p.email AS created_by_email,
    (SELECT COUNT(*) FROM document_reviews WHERE document_id = d.id AND status = 'completed') AS completed_reviews,
    (SELECT COUNT(*) FROM document_assignments WHERE document_id = d.id AND role_type = 'reviewer') AS total_reviewers,
    (SELECT COUNT(*) FROM document_approvals WHERE document_id = d.id AND decision IS NOT NULL) AS completed_approvals
FROM documents d
LEFT JOIN document_types dt ON d.document_type_id = dt.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN profiles p ON d.created_by = p.id
WHERE d.is_deleted = false;

-- View: User with roles
CREATE OR REPLACE VIEW users_with_roles AS
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.employee_id,
    p.job_title,
    p.department_id,
    dep.name AS department_name,
    p.is_active,
    ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL) AS roles
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN departments dep ON p.department_id = dep.id
GROUP BY p.id, p.full_name, p.email, p.employee_id, p.job_title, p.department_id, dep.name, p.is_active;

-- View: Pending assignments for current user
CREATE OR REPLACE VIEW my_pending_assignments AS
SELECT 
    da.*,
    d.title AS document_title,
    d.document_number,
    d.status AS document_status,
    dt.name AS document_type_name,
    creator.full_name AS created_by_name
FROM document_assignments da
JOIN documents d ON da.document_id = d.id
LEFT JOIN document_types dt ON d.document_type_id = dt.id
LEFT JOIN profiles creator ON d.created_by = creator.id
WHERE da.user_id = auth.uid()
  AND da.is_completed = false
  AND d.is_deleted = false;

-- ============================================================================
-- INDEXES: Additional performance indexes
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_documents_status_created ON documents(status, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_documents_type_status ON documents(document_type_id, status) WHERE is_deleted = false;
CREATE INDEX idx_assignments_user_pending ON document_assignments(user_id, is_completed) WHERE is_completed = false;
CREATE INDEX idx_reviews_document_status ON document_reviews(document_id, status);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
