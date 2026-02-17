'use client'

import { useState, useMemo } from 'react'
import { 
  Plus, 
  Search, 
  Building2, 
  Pencil, 
  Trash2, 
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Filter
} from 'lucide-react'
import DepartmentForm from '@/components/DepartmentForm'
import { 
  createDepartment, 
  updateDepartment, 
  deleteDepartment,
  toggleDepartmentStatus
} from './actions'
import type { Department, DepartmentFormData } from '@/types/database'

interface DepartmentsClientProps {
  initialDepartments: Department[]
}

export default function DepartmentsClient({ initialDepartments }: DepartmentsClientProps) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null)
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

  // Filter and search departments
  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      // Search filter
      const matchesSearch = 
        dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.description?.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Status filter
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && dept.is_active) ||
        (statusFilter === 'inactive' && !dept.is_active)
      
      return matchesSearch && matchesStatus
    })
  }, [departments, searchQuery, statusFilter])

  // Clear messages after delay
  const showMessage = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccess(message)
      setError(null)
      setTimeout(() => setSuccess(null), 5000)
    } else {
      setError(message)
      setSuccess(null)
      setTimeout(() => setError(null), 5000)
    }
  }

  // Handle form submit (create or update)
  const handleFormSubmit = async (data: DepartmentFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      if (editingDepartment) {
        // Update existing department
        const result = await updateDepartment(editingDepartment.id, data)
        if (result.success && result.data) {
          setDepartments((prev) =>
            prev.map((d) => (d.id === editingDepartment.id ? result.data! : d))
          )
          showMessage('success', result.message || 'Department updated successfully')
          setIsFormOpen(false)
          setEditingDepartment(null)
        } else {
          showMessage('error', result.error || 'Failed to update department')
        }
      } else {
        // Create new department
        const result = await createDepartment(data)
        if (result.success && result.data) {
          setDepartments((prev) => [...prev, result.data!].sort((a, b) => a.name.localeCompare(b.name)))
          showMessage('success', result.message || 'Department created successfully')
          setIsFormOpen(false)
        } else {
          showMessage('error', result.error || 'Failed to create department')
        }
      }
    } catch {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle delete
  const handleDelete = async (department: Department) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await deleteDepartment(department.id)
      if (result.success) {
        setDepartments((prev) => prev.filter((d) => d.id !== department.id))
        showMessage('success', result.message || 'Department deleted successfully')
      } else {
        showMessage('error', result.error || 'Failed to delete department')
      }
    } catch {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
      setDeleteConfirm(null)
    }
  }

  // Handle toggle status
  const handleToggleStatus = async (department: Department) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await toggleDepartmentStatus(department.id)
      if (result.success && result.data) {
        setDepartments((prev) =>
          prev.map((d) => (d.id === department.id ? result.data! : d))
        )
        showMessage('success', result.message || 'Status updated')
      } else {
        showMessage('error', result.error || 'Failed to update status')
      }
    } catch {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
      setActionMenuOpen(null)
    }
  }

  // Open edit form
  const openEditForm = (department: Department) => {
    setEditingDepartment(department)
    setIsFormOpen(true)
    setActionMenuOpen(null)
  }

  // Close form
  const closeForm = () => {
    setIsFormOpen(false)
    setEditingDepartment(null)
  }

  return (
    <>
      {/* Alert Messages */}
      {(error || success) && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-3 animate-fade-in ${
            error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {error ? (
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <p className="text-sm font-medium">{error || success}</p>
          <button
            onClick={() => {
              setError(null)
              setSuccess(null)
            }}
            className="ml-auto p-1 rounded hover:bg-black/10"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="card overflow-hidden">
        {/* Header with Search and Actions */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="pl-10 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 appearance-none bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>

              {/* Add Button */}
              <button
                onClick={() => {
                  setEditingDepartment(null)
                  setIsFormOpen(true)
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Department
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Building2 className="h-6 w-6 text-slate-400" />
                      </div>
                      <h3 className="text-sm font-medium text-slate-800 mb-1">
                        {searchQuery || statusFilter !== 'all'
                          ? 'No departments found'
                          : 'No departments yet'}
                      </h3>
                      <p className="text-sm text-slate-500 mb-4">
                        {searchQuery || statusFilter !== 'all'
                          ? 'Try adjusting your search or filter'
                          : 'Get started by adding your first department'}
                      </p>
                      {!searchQuery && statusFilter === 'all' && (
                        <button
                          onClick={() => setIsFormOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add Department
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((department) => (
                  <tr
                    key={department.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          department.is_active ? 'bg-primary-100' : 'bg-slate-100'
                        }`}>
                          <Building2 className={`h-5 w-5 ${
                            department.is_active ? 'text-primary-600' : 'text-slate-400'
                          }`} />
                        </div>
                        <span className={`font-medium ${
                          department.is_active ? 'text-slate-800' : 'text-slate-500'
                        }`}>
                          {department.name}
                        </span>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-6 py-4">
                      {department.code ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                          {department.code}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 line-clamp-1 max-w-xs">
                        {department.description || '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          department.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {department.is_active ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                            Inactive
                          </>
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setActionMenuOpen(
                              actionMenuOpen === department.id ? null : department.id
                            )
                          }
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {actionMenuOpen === department.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 animate-fade-in">
                              <button
                                onClick={() => openEditForm(department)}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleStatus(department)}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                {department.is_active ? (
                                  <>
                                    <XCircle className="h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </button>
                              <hr className="my-1 border-slate-200" />
                              <button
                                onClick={() => {
                                  setDeleteConfirm(department)
                                  setActionMenuOpen(null)
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with count */}
        {filteredDepartments.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
            <p className="text-sm text-slate-500">
              Showing {filteredDepartments.length} of {departments.length} departments
            </p>
          </div>
        )}
      </div>

      {/* Department Form Modal */}
      {isFormOpen && (
        <DepartmentForm
          department={editingDepartment}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          isLoading={isLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-fade-in">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Delete Department</h3>
                  <p className="text-sm text-slate-500">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-slate-600 mb-6">
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This will
                remove the department from the system.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
