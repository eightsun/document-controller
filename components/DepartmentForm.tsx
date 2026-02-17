'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { X, Loader2, Building2 } from 'lucide-react'
import type { Department, DepartmentFormData } from '@/types/database'

interface DepartmentFormProps {
  department?: Department | null
  onSubmit: (data: DepartmentFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function DepartmentForm({
  department,
  onSubmit,
  onCancel,
  isLoading = false,
}: DepartmentFormProps) {
  const isEditing = !!department

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<DepartmentFormData>({
    defaultValues: {
      name: department?.name || '',
      code: department?.code || '',
      description: department?.description || '',
      is_active: department?.is_active ?? true,
    },
  })

  // Reset form when department changes
  useEffect(() => {
    if (department) {
      reset({
        name: department.name,
        code: department.code || '',
        description: department.description || '',
        is_active: department.is_active,
      })
    } else {
      reset({
        name: '',
        code: '',
        description: '',
        is_active: true,
      })
    }
  }, [department, reset])

  const handleFormSubmit = async (data: DepartmentFormData) => {
    await onSubmit(data)
  }

  const watchName = watch('name')

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform rounded-2xl bg-white shadow-2xl transition-all animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                <Building2 className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {isEditing ? 'Edit Department' : 'Add New Department'}
                </h2>
                <p className="text-sm text-slate-500">
                  {isEditing
                    ? 'Update department information'
                    : 'Create a new department for your organization'}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
            <div className="space-y-5">
              {/* Department Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="e.g., Information Technology"
                  className={`w-full px-4 py-2.5 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${
                    errors.name
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-slate-300 focus:border-primary-500'
                  }`}
                  {...register('name', {
                    required: 'Department name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                    maxLength: {
                      value: 255,
                      message: 'Name must be less than 255 characters',
                    },
                  })}
                />
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Department Code */}
              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Department Code
                </label>
                <input
                  id="code"
                  type="text"
                  placeholder="e.g., IT"
                  className={`w-full px-4 py-2.5 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 uppercase ${
                    errors.code
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-slate-300 focus:border-primary-500'
                  }`}
                  {...register('code', {
                    maxLength: {
                      value: 50,
                      message: 'Code must be less than 50 characters',
                    },
                    pattern: {
                      value: /^[A-Za-z0-9_-]*$/,
                      message: 'Code can only contain letters, numbers, hyphens, and underscores',
                    },
                  })}
                />
                {errors.code ? (
                  <p className="mt-1.5 text-sm text-red-500">{errors.code.message}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Short code for document numbering (e.g., IT, FIN, HR)
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Brief description of the department..."
                  className={`w-full px-4 py-2.5 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none ${
                    errors.description
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-slate-300 focus:border-primary-500'
                  }`}
                  {...register('description', {
                    maxLength: {
                      value: 500,
                      message: 'Description must be less than 500 characters',
                    },
                  })}
                />
                {errors.description && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                    Active Status
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Inactive departments won&apos;t appear in selection dropdowns
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="is_active"
                    type="checkbox"
                    className="sr-only peer"
                    {...register('is_active')}
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>
            </div>

            {/* Preview */}
            {watchName && (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Preview
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                    <Building2 className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{watchName}</p>
                    <p className="text-xs text-slate-500">
                      {watch('code')?.toUpperCase() || 'No code'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>{isEditing ? 'Update Department' : 'Create Department'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
