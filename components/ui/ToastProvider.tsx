'use client'

import { Toaster } from 'react-hot-toast'

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        // Default options for all toasts
        duration: 4000,
        style: {
          background: '#fff',
          color: '#334155',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          fontSize: '14px',
        },
        // Custom styles for different toast types
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
          style: {
            borderLeft: '4px solid #10b981',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          style: {
            borderLeft: '4px solid #ef4444',
          },
          duration: 5000,
        },
        loading: {
          iconTheme: {
            primary: '#6366f1',
            secondary: '#fff',
          },
        },
      }}
    />
  )
}
