// utils/toast.ts
// Toast notification helper functions

import toast from 'react-hot-toast'

export const showToast = {
  success: (message: string) => {
    toast.success(message)
  },
  
  error: (message: string) => {
    toast.error(message)
  },
  
  loading: (message: string) => {
    return toast.loading(message)
  },
  
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId)
  },
  
  // Promise-based toast for async operations
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ) => {
    return toast.promise(promise, messages)
  },

  // Custom toast with icon
  custom: (message: string, icon?: string) => {
    toast(message, {
      icon: icon || '📢',
    })
  },
}

// Shorthand functions
export const toastSuccess = showToast.success
export const toastError = showToast.error
export const toastLoading = showToast.loading
export const toastDismiss = showToast.dismiss
export const toastPromise = showToast.promise

export default showToast
