import Link from 'next/link'
import { FileQuestion, Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 Illustration */}
        <div className="relative mb-8">
          <div className="text-[150px] font-bold text-slate-200 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
              <FileQuestion className="w-12 h-12 text-primary-600" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-slate-800 mb-3">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist or has been moved. 
          Please check the URL or navigate back to the dashboard.
        </p>

        {/* Search suggestion */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <p className="text-sm text-slate-600 mb-4">
            Looking for a document? Try searching:
          </p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <button
            onClick={() => typeof window !== 'undefined' && window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Quick links */}
        <div className="mt-10 pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-400 mb-4">Quick Links</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/dashboard/documents" className="text-primary-500 hover:underline">
              All Documents
            </Link>
            <Link href="/dashboard/documents/new" className="text-primary-500 hover:underline">
              Create Document
            </Link>
            <Link href="/dashboard/notifications" className="text-primary-500 hover:underline">
              Notifications
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
