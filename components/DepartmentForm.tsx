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
                  textTransf
