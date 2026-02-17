'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [mounted, setMounted] = useState(false)

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

  useEffect(() => {
    setMounted(true)
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

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleFormSubmit = async (data: DepartmentFormData) => {
    await onSubmit(data)
  }

  const watchName = watch('name')

  // Modal content
  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          maxHeight: 'calc(100vh - 32px)',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: 'white',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#eef2ff',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 style={{ width: '20px', height: '20px', color: '#4f46e5' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
                {isEditing ? 'Edit Department' : 'Add New Department'}
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                {isEditing ? 'Update department information' : 'Create a new department'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: '#94a3b8',
            }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Department Name */}
            <div>
              <label
                htmlFor="name"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '6px',
                }}
              >
                Department Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g., Information Technology"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: `1px solid ${errors.name ? '#fca5a5' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                {...register('name', {
                  required: 'Department name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                  maxLength: { value: 255, message: 'Name must be less than 255 characters' },
                })}
              />
              {errors.name && (
                <p style={{ marginTop: '6px', fontSize: '14px', color: '#ef4444' }}>
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Department Code */}
            <div>
              <label
                htmlFor="code"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '6px',
                }}
              >
                Department Code
              </label>
              <input
                id="code"
                type="text"
                placeholder="e.g., IT"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  textTransform: 'uppercase',
                  boxSizing: 'border-box',
                }}
                {...register('code', {
                  maxLength: { value: 50, message: 'Code must be less than 50 characters' },
                })}
              />
              <p style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
                Short code for document numbering (e.g., IT, FIN, HR)
              </p>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '6px',
                }}
              >
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                placeholder="Brief description of the department..."
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                {...register('description')}
              />
            </div>

            {/* Active Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <label
                  htmlFor="is_active"
                  style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}
                >
                  Active Status
                </label>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Inactive departments won&apos;t appear in dropdowns
                </p>
              </div>
              <label style={{ position: 'relative', display: 'inline-flex', cursor: 'pointer' }}>
                <input
                  id="is_active"
                  type="checkbox"
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  {...register('is_active')}
                />
                <div
                  style={{
                    width: '44px',
                    height: '24px',
                    backgroundColor: watch('is_active') ? '#4f46e5' : '#cbd5e1',
                    borderRadius: '12px',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: watch('is_active') ? '22px' : '2px',
                      width: '20px',
                      height: '20px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              </label>
            </div>

            {/* Preview */}
            {watchName && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <p
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Preview
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#eef2ff',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building2 style={{ width: '20px', height: '20px', color: '#4f46e5' }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500, color: '#1e293b' }}>{watchName}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      {watch('code')?.toUpperCase() || 'No code'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'white',
                backgroundColor: '#4f46e5',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                opacity: isLoading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
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
  )

  // Use portal to render modal at document body level
  if (!mounted) return null

  return createPortal(modalContent, document.body)
}
