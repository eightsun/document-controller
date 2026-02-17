# Document Controller - Database Schema

## Overview

This document describes the complete database schema for the Document Controller system. The schema is designed for Supabase (PostgreSQL) with Row Level Security (RLS) enabled for all tables.

## Key Features

- **SharePoint Integration**: Documents are stored in SharePoint, only links are stored in the database
- **Complete Audit Trail**: Every document status change is tracked in the timeline
- **Role-Based Access Control**: 5 predefined roles with granular permissions
- **Soft Delete**: Documents and departments support soft delete
- **Auto-generated Document Numbers**: Format: `{PREFIX}-{DEPT}-{YEAR}-{SEQUENCE}`

---

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   auth.users    │────<│    profiles     │>────│   departments   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   user_roles    │>────│     roles       │     │ affected_depts  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        │                                               │
        ▼                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                          documents                               │
│  (id, title, document_type_id, status, draft_link, final_link)  │
└─────────────────────────────────────────────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│assignments │ │  reviews   │ │ approvals  │ │  timeline  │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
                                                   │
                                                   ▼
                                           ┌────────────┐
                                           │notifications│
                                           └────────────┘
```

---

## Tables Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `departments` | 29 company departments with soft delete |
| `profiles` | Extended user profiles linked to auth.users |
| `roles` | 5 system roles (Admin, BPM, MQS Reps, SME, Approver) |
| `user_roles` | Many-to-many: Users ↔ Roles |
| `document_types` | 4 types (Policy, Procedure, Process, Working Instruction) |

### Document Tables

| Table | Description |
|-------|-------------|
| `documents` | Main document metadata with SharePoint links |
| `affected_departments` | Many-to-many: Documents ↔ Departments |
| `document_assignments` | Assigns users as submitter/reviewer/approver |
| `document_reviews` | Review records with comments and status |
| `document_approvals` | Approval decisions with comments |
| `document_timeline` | Complete audit trail of all events |
| `document_comments` | General comments on documents |

### System Tables

| Table | Description |
|-------|-------------|
| `notifications` | User notifications for assignments, updates |
| `settings` | System configuration key-value store |

---

## Document Status Flow

```
┌──────────────┐
│  Initiation  │ ← Document created
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Review    │ ← Assigned to reviewers
└──────┬───────┘
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
┌──────────────────┐              ┌──────────────┐
│ Waiting Approval │              │    Cancel    │
└──────┬───────────┘              └──────────────┘
       │
       ├─────────────────┬─────────────────┐
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Approved   │  │   Rejected   │  │    Cancel    │
└──────┬───────┘  └──────────────┘  └──────────────┘
       │
       ▼
┌──────────────┐
│    Closed    │ ← Document expired/superseded
└──────────────┘
```

---

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management, settings |
| **BPM** | Manage documents, departments, workflows |
| **MQS Reps** | Create documents, assign reviewers/approvers |
| **SME** | Review assigned documents, provide feedback |
| **Approver** | Approve/reject documents |

---

## Row Level Security (RLS) Summary

### Read Access

| Table | Who Can Read |
|-------|-------------|
| departments | All authenticated users (active only) |
| profiles | All authenticated users |
| roles | All authenticated users |
| documents | All authenticated users (non-deleted) |
| notifications | Only the notification owner |

### Write Access

| Table | Who Can Write |
|-------|-------------|
| departments | Admin, BPM only |
| documents | MQS Reps, BPM, Admin (create); Creator, BPM, Admin (update) |
| document_reviews | Assigned reviewers only |
| document_approvals | Assigned approvers only |
| user_roles | Admin only |

### Delete Access

| Table | Who Can Delete |
|-------|-------------|
| departments | Admin only (soft delete) |
| documents | Admin, BPM only (soft delete) |
| notifications | Notification owner only |

---

## How to Run the Migration

### Option 1: Supabase Dashboard (Recommended for beginners)

1. **Open Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com) and sign in
   - Select your project

2. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

3. **Run the Migration**
   - Copy the entire contents of `001_initial_schema.sql`
   - Paste into the SQL Editor
   - Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)

4. **Verify**
   - Go to **"Table Editor"** in the sidebar
   - You should see all tables: `departments`, `profiles`, `roles`, etc.
   - Check `departments` table - should have 29 rows
   - Check `roles` table - should have 5 rows
   - Check `document_types` table - should have 4 rows

### Option 2: Supabase CLI (For developers)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-id

# Run migration
supabase db push
```

### Option 3: Direct PostgreSQL Connection

```bash
# Using psql
psql -h db.your-project-id.supabase.co -p 5432 -U postgres -d postgres -f 001_initial_schema.sql
```

---

## Post-Migration Steps

### 1. Assign Admin Role to Your User

After creating your first user, assign them the Admin role:

```sql
-- First, find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then, find the Admin role ID
SELECT id, name FROM roles WHERE name = 'Admin';

-- Finally, assign the role (replace UUIDs with actual values)
INSERT INTO user_roles (user_id, role_id, assigned_by)
VALUES (
    'your-user-uuid',
    (SELECT id FROM roles WHERE name = 'Admin'),
    'your-user-uuid'
);
```

Or use this simplified version:

```sql
-- Assign Admin role to user by email
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT 
    u.id,
    r.id,
    u.id
FROM auth.users u
CROSS JOIN roles r
WHERE u.email = 'your-email@example.com'
  AND r.name = 'Admin';
```

### 2. Update Your Profile

```sql
-- Update profile with department
UPDATE profiles
SET 
    full_name = 'Your Full Name',
    department_id = (SELECT id FROM departments WHERE code = 'IT'),
    job_title = 'System Administrator'
WHERE email = 'your-email@example.com';
```

### 3. Configure SharePoint URL (Optional)

```sql
UPDATE settings 
SET value = '"https://yourcompany.sharepoint.com/sites/documents"'
WHERE key = 'sharepoint_base_url';
```

---

## Useful Queries

### View All Documents with Details

```sql
SELECT * FROM documents_with_details;
```

### View Users with Their Roles

```sql
SELECT * FROM users_with_roles;
```

### View My Pending Assignments

```sql
SELECT * FROM my_pending_assignments;
```

### Get Document Timeline

```sql
SELECT 
    dt.event_type,
    dt.event_title,
    dt.event_description,
    dt.performed_by_name,
    dt.old_status,
    dt.new_status,
    dt.created_at
FROM document_timeline dt
WHERE dt.document_id = 'your-document-uuid'
ORDER BY dt.created_at DESC;
```

### Get Unread Notifications

```sql
SELECT * FROM notifications 
WHERE user_id = auth.uid() 
  AND is_read = false
ORDER BY created_at DESC;
```

---

## Database Maintenance

### Soft Delete a Department

```sql
UPDATE departments 
SET deleted_at = NOW(), is_active = false 
WHERE id = 'department-uuid';
```

### Soft Delete a Document

```sql
UPDATE documents 
SET 
    is_deleted = true, 
    deleted_at = NOW(),
    deleted_by = auth.uid()
WHERE id = 'document-uuid';
```

### Clean Up Old Notifications (older than 90 days)

```sql
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## Troubleshooting

### Error: "permission denied for table"

Make sure you're logged in as an authenticated user and have the correct role.

```sql
-- Check your current roles
SELECT * FROM users_with_roles WHERE id = auth.uid();
```

### Error: "new row violates row-level security policy"

You don't have permission for that action. Check the RLS policies above.

### Error: "duplicate key value violates unique constraint"

The record already exists. Check for duplicates:

```sql
-- Example: Check for duplicate user_roles
SELECT * FROM user_roles WHERE user_id = 'your-uuid';
```

---

## Schema Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial schema with all tables, RLS, and seed data |

---

## Support

For issues or questions, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
