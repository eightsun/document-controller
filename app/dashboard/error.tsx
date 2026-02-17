'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-800 mb-3">
          Oops! Something went wrong
        </h2>

        {/* Description */}
        <p className="text-slate-500 mb-6">
          We encountered an error while loading this page. Please try again.
        </p>

        {/* Error details (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-slate-100 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs font-mono text-slate-600 break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Home link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-primary-500 hover:underline mt-6"
        >
          <Home className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
