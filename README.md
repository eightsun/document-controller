# Document Controller

A professional document management and control system built with Next.js 14 and Supabase.

## ✨ Features

### 📄 Document Management
- Create, edit, and manage documents with rich metadata
- Automatic document numbering (e.g., MRT-OPS-MAN-001)
- Document categorization by department and type
- Effective date, expiry date, and revision tracking
- File attachments support

### 👥 Workflow & Approvals
- **Parallel review workflow** - Multiple reviewers can review simultaneously
- **Approval process** - Single or multiple approvers
- **Status transitions**: Initiation → Review → Waiting Approval → Approved → Closed
- Rejection handling with reasons
- Document cancellation option

### 🔔 Notifications
- **In-app notifications** with bell icon and dropdown
- **Email notifications** via Resend API
- Deadline reminders (3 days before target date)
- Overdue document alerts (weekly)
- Document expiry reminders (30, 14, 7, 3, 1 days before)

### 📊 Dashboard & Reports
- Real-time statistics and metrics
- Department-wise document breakdown
- Monthly trend charts
- Expiring documents alerts
- My Tasks section (pending reviews/approvals)

### 🔐 Security
- Role-based access control (Admin, Document Controller, User)
- Row Level Security (RLS) in Supabase
- Secure authentication with Supabase Auth

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Email | Resend API |
| Icons | Lucide React |
| Forms | React Hook Form + Zod validation |
| Notifications | React Hot Toast |

---

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- [Supabase](https://supabase.com) account (free tier available)
- [Resend](https://resend.com) account for emails (free: 100 emails/day)

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/document-controller.git
cd document-controller
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration files in order:
   - All files in `supabase/migrations/`

### 3. Configure Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Resend) - Optional
RESEND_API_KEY=re_xxxxxxxxxx
FROM_EMAIL=Document Controller <noreply@yourdomain.com>
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
document-controller/
├── app/
│   ├── (auth)/               # Auth pages (login, register)
│   ├── dashboard/            # Main dashboard pages
│   │   ├── documents/        # Document management
│   │   │   ├── [id]/         # Document detail & actions
│   │   │   └── new/          # Create document
│   │   ├── departments/      # Department management
│   │   ├── users/            # User management
│   │   ├── notifications/    # Notifications page
│   │   └── page.tsx          # Dashboard home
│   ├── api/                  # API routes
│   │   ├── email/send/       # Email sending endpoint
│   │   └── cron/reminders/   # Scheduled reminder job
│   ├── error.tsx             # Error boundary
│   ├── not-found.tsx         # 404 page
│   └── layout.tsx            # Root layout
├── components/
│   ├── layout/               # Header, Sidebar, NotificationDropdown
│   └── ui/                   # Skeleton, ToastProvider
├── utils/
│   ├── supabase/             # Supabase client utilities
│   ├── email.ts              # Email helpers
│   └── toast.ts              # Toast notifications
└── supabase/
    └── migrations/           # SQL migration files
```

---

## 🗃️ Database Schema

### Main Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (extends auth.users) |
| `departments` | Organization departments |
| `document_types` | Document type definitions |
| `documents` | Main documents table |
| `document_assignments` | Reviewer/approver assignments |
| `document_reviews` | Review submissions |
| `document_approvals` | Approval decisions |
| `document_comments` | Document comments |
| `document_timeline` | Activity timeline |
| `notifications` | User notifications |

### Document Statuses

| Status | Description |
|--------|-------------|
| `Initiation` | Document created, pending reviews |
| `Review` | Under review (at least one review started) |
| `Waiting Approval` | All reviews complete, awaiting approval |
| `Approved` | Approved and published |
| `Closed` | Manually closed after approval |
| `Rejected` | Rejected by approver |
| `Cancel` | Cancelled before approval |

---

## 🌐 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
RESEND_API_KEY=re_xxxxxxxxxx
```

4. Deploy!

### Configure Supabase Redirects

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://your-domain.vercel.app`
- **Redirect URLs**: `https://your-domain.vercel.app/api/auth/callback`

### Set up Cron Jobs (for reminders)

Use [cron-job.org](https://cron-job.org) (free):

| Job | URL | Schedule |
|-----|-----|----------|
| Daily Reminders | `https://your-domain.vercel.app/api/cron/reminders` | 8:00 AM daily |

---

## 📧 Email Configuration

### Using Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Create API key
3. Add to environment variables
4. (Production) Verify your domain

### Email Types Sent

- Assignment notifications (reviewer/approver)
- Review submitted notifications
- Approval/rejection notifications
- Ready for approval notifications
- Deadline reminders
- Document expiry reminders

---

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Adding New Features

1. Create page in `app/dashboard/your-feature/page.tsx`
2. Add server actions in `actions.ts`
3. Update sidebar navigation in `components/layout/Sidebar.tsx`

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Check environment variables in Vercel |
| Login not working | Enable Email provider in Supabase Auth |
| Notifications not showing | Run the notifications SQL migration |
| Emails not sending | Verify RESEND_API_KEY is set |

### Debug Mode

Check browser console (F12) for client-side errors.
Check Vercel deployment logs for server-side errors.

---

## 📄 License

MIT License - feel free to use for personal or commercial projects.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

Built with ❤️ using Next.js and Supabase
