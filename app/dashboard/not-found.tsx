import Link from 'next/link'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-10 h-10 text-slate-400" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-800 mb-3">
          Page Not Found
        </h2>

        {/* Description */}
        <p className="text-slate-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link
            href="/dashboard/documents"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            View Documents
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-10 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-400 mb-3">Quick Links</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/dashboard/documents/new" className="text-primary-500 hover:underline">
              Create Document
            </Link>
            <Link href="/dashboard/notifications" className="text-primary-500 hover:underline">
              Notifications
            </Link>
            <Link href="/dashboard/departments" className="text-primary-500 hover:underline">
              Departments
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
