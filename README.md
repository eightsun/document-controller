# Document Controller

A professional document management system built with Next.js 14, Supabase, and Tailwind CSS.

![Document Controller](https://via.placeholder.com/800x400?text=Document+Controller+Dashboard)

## Features

- 🔐 Secure authentication with Supabase
- 📊 Modern admin dashboard interface
- 📁 Document management system
- 👥 User management
- 📈 Analytics and reporting
- 🎨 Professional Bootstrap-inspired design

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Authentication:** Supabase Auth
- **Database:** Supabase (PostgreSQL)
- **Icons:** Lucide React
- **Forms:** React Hook Form

## Prerequisites

Before you begin, ensure you have:
- A GitHub account
- A Vercel account (free tier available)
- A Supabase account (free tier available)

---

## 🚀 Complete Setup Guide (No IDE Required)

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in the details:
   - **Project name:** `document-controller`
   - **Database Password:** Create a strong password (save this!)
   - **Region:** Choose the closest to your users
4. Click **"Create new project"** and wait for setup (takes ~2 minutes)
5. Once ready, go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### Step 2: Enable Email Authentication in Supabase

1. In your Supabase dashboard, go to **Authentication → Providers**
2. Make sure **Email** is enabled
3. Go to **Authentication → Users**
4. Click **"Add user"** and create a test user with email and password

### Step 3: Upload Project to GitHub

#### Method A: Using GitHub Web Interface (Easiest - No Git Required)

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon (top right) → **"New repository"**
3. Fill in:
   - **Repository name:** `document-controller`
   - **Description:** `Professional document management system`
   - **Visibility:** Public (required for free Vercel deployment)
4. Click **"Create repository"**
5. On the next page, click **"uploading an existing file"** link
6. **Drag and drop** all the project files/folders:
   ```
   📁 app/
   📁 components/
   📁 utils/
   📄 middleware.ts
   📄 package.json
   📄 tailwind.config.ts
   📄 tsconfig.json
   📄 postcss.config.mjs
   📄 next.config.js
   📄 .gitignore
   📄 .env.local.example
   📄 README.md
   ```
7. Add commit message: `Initial commit - Document Controller`
8. Click **"Commit changes"**

#### Method B: Using GitHub Desktop (If you have it installed)

1. Download and install [GitHub Desktop](https://desktop.github.com/)
2. Sign in with your GitHub account
3. File → New Repository
4. Copy all project files into the repository folder
5. Write a commit message and click "Commit to main"
6. Click "Publish repository"

### Step 4: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **"Add New..."** → **"Project"**
3. Find and select your `document-controller` repository
4. Click **"Import"**
5. **Configure Environment Variables** (IMPORTANT!):
   - Click **"Environment Variables"**
   - Add these two variables:
   
   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

6. Click **"Deploy"**
7. Wait for deployment (takes 1-2 minutes)
8. Click your deployment URL to see your live app! 🎉

### Step 5: Configure Supabase Redirect URLs

After deployment, update Supabase to allow redirects from your Vercel domain:

1. Go to your Supabase dashboard → **Authentication → URL Configuration**
2. Add your Vercel URLs:
   - **Site URL:** `https://your-project.vercel.app`
   - **Redirect URLs:** Add `https://your-project.vercel.app/api/auth/callback`
3. Click **"Save"**

---

## 📁 Project Structure

```
document-controller/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts      # OAuth callback handler
│   ├── dashboard/
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   └── page.tsx              # Main dashboard page
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Root redirect
├── components/
│   └── layout/
│       ├── Header.tsx            # Top navigation bar
│       └── Sidebar.tsx           # Side navigation
├── utils/
│   └── supabase/
│       ├── client.ts             # Browser Supabase client
│       ├── middleware.ts         # Supabase middleware helper
│       └── server.ts             # Server Supabase client
├── middleware.ts                 # Next.js middleware (auth protection)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## 🔧 Local Development

If you want to run the project locally:

1. Clone the repository
2. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials
3. Install dependencies: `npm install`
4. Run development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

---

## 🎨 Customization

### Changing Colors

Edit `tailwind.config.ts` to modify the color scheme:

```typescript
colors: {
  primary: {
    500: '#4f46e5', // Change this to your brand color
    600: '#4338ca',
    // ...
  },
}
```

### Adding New Pages

1. Create a new folder in `app/dashboard/`
2. Add a `page.tsx` file
3. The page will automatically be protected by authentication

---

## 📝 Next Steps

After initial setup, you may want to:

1. **Add document upload functionality** - Use Supabase Storage
2. **Create database tables** - Documents, categories, users
3. **Implement user roles** - Admin, reviewer, viewer
4. **Add search functionality** - Full-text search with Supabase
5. **Set up email notifications** - Using Supabase Edge Functions

---

## 🆘 Troubleshooting

### "Invalid API key" error
- Make sure environment variables are correctly set in Vercel
- Redeploy after adding environment variables

### Login not working
- Check that Email provider is enabled in Supabase Authentication
- Verify the redirect URLs in Supabase match your Vercel domain

### Blank page after login
- Check browser console for errors
- Ensure middleware.ts is correctly protecting routes

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

Made with ❤️ using Next.js, Supabase, and Tailwind CSS
