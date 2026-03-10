'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus,
  Search,
  Building2,
  Layers,
  Pencil,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Filter,
  Loader2,
} from 'lucide-react'
import DepartmentForm from '@/components/DepartmentForm'
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  toggleDepartmentStatus,
  createSubDepartment,
  updateSubDepartment,
  deleteSubDepartment,
  toggleSubDepartmentStatus,
} from './actions'
import type { Department, DepartmentFormData, SubDepartment } from '@/types/database'

interface SubDeptWithDeptName extends SubDepartment {
  department_name: string | null
}

interface SubDeptFormData {
  name: string
  code: string
  department_id: string
  is_active: boolean
}

interface DepartmentsClientProps {
  initialDepartments: Department[]
  initialLegalEntities: Array<{ id: string; name: string; code: string }>
  initialSubDepartments: SubDeptWithDeptName[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirmation Modal
// ─────────────────────────────────────────────────────────────────────────────
function DeleteConfirmModal({
  name,
  isLoading,
  onConfirm,
  onCancel,
}: {
  name: string
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onCancel} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '400px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle style={{ width: '24px', height: '24px', color: '#dc2626' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>Delete</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>This action cannot be undone</p>
          </div>
        </div>
        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
          Are you sure you want to delete <strong>{name}</strong>?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={onCancel} disabled={isLoading} style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 500, color: '#374151', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isLoading} style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 500, color: 'white', backgroundColor: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: isLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isLoading ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />Deleting...</> : <><Trash2 style={{ width: '16px', height: '16px' }} />Delete</>}
          </button>
        </div>
      </div>
    </div>
  )
  if (!mounted) return null
  return createPortal(content, document.body)
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Department Form Modal
// ─────────────────────────────────────────────────────────────────────────────
function SubDeptFormModal({
  editing,
  departments,
  isLoading,
  onSubmit,
  onCancel,
}: {
  editing: SubDeptWithDeptName | null
  departments: Department[]
  isLoading: boolean
  onSubmit: (data: SubDeptFormData) => void
  onCancel: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState<SubDeptFormData>({
    name: editing?.name || '',
    code: editing?.code || '',
    department_id: editing?.department_id || '',
    is_active: editing?.is_active ?? true,
  })

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onCancel} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '480px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
          {editing ? 'Edit Sub-Department' : 'Add Sub-Department'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Chartering"
              style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Code</label>
            <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. CHT"
              style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              Department <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', backgroundColor: 'white', boxSizing: 'border-box' }}>
              <option value="">— Select Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
            <div onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              style={{ width: '40px', height: '22px', backgroundColor: form.is_active ? '#3b82f6' : '#d1d5db', borderRadius: '999px', position: 'relative', transition: 'background-color .2s', flexShrink: 0, cursor: 'pointer' }}>
              <div style={{ position: 'absolute', top: '3px', left: form.is_active ? '21px' : '3px', width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%', transition: 'left .2s' }} />
            </div>
            <span style={{ fontSize: '14px', color: '#374151' }}>Active</span>
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button onClick={onCancel} disabled={isLoading} style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 500, color: '#374151', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
            Cancel
          </button>
          <button onClick={() => onSubmit(form)} disabled={isLoading} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 500, color: 'white', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: isLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isLoading ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />Saving...</> : editing ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
  if (!mounted) return null
  return createPortal(content, document.body)
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function DepartmentsClient({ initialDepartments, initialLegalEntities, initialSubDepartments }: DepartmentsClientProps) {
  const [activeTab, setActiveTab] = useState<'departments' | 'sub-departments'>('departments')

  // ── Departments state ──────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>(initialDepartments)
  const [deptSearch, setDeptSearch] = useState('')
  const [deptStatusFilter, setDeptStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [deptLEFilter, setDeptLEFilter] = useState('')
  const [isDeptFormOpen, setIsDeptFormOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [deleteDeptConfirm, setDeleteDeptConfirm] = useState<Department | null>(null)
  const [deptActionMenu, setDeptActionMenu] = useState<string | null>(null)

  // ── Sub-departments state ──────────────────────────────────────────────────
  const [subDepts, setSubDepts] = useState<SubDeptWithDeptName[]>(initialSubDepartments)
  const [subSearch, setSubSearch] = useState('')
  const [subStatusFilter, setSubStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [subDeptFilter, setSubDeptFilter] = useState('')
  const [isSubFormOpen, setIsSubFormOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<SubDeptWithDeptName | null>(null)
  const [deleteSubConfirm, setDeleteSubConfirm] = useState<SubDeptWithDeptName | null>(null)
  const [subActionMenu, setSubActionMenu] = useState<string | null>(null)

  // ── Shared state ───────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const legalEntityMap = useMemo(() => {
    const m: Record<string, string> = {}
    initialLegalEntities.forEach(le => { m[le.id] = le.name })
    return m
  }, [initialLegalEntities])

  const showMsg = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') { setSuccess(msg); setError(null); setTimeout(() => setSuccess(null), 5000) }
    else { setError(msg); setSuccess(null); setTimeout(() => setError(null), 5000) }
  }

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const filteredDepts = useMemo(() =>
    departments.filter(d => {
      const q = deptSearch.toLowerCase()
      const matchSearch = d.name.toLowerCase().includes(q) || (d.code || '').toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q)
      const matchStatus = deptStatusFilter === 'all' || (deptStatusFilter === 'active' && d.is_active) || (deptStatusFilter === 'inactive' && !d.is_active)
      const matchLE = !deptLEFilter || d.legal_entity_id === deptLEFilter
      return matchSearch && matchStatus && matchLE
    }),
    [departments, deptSearch, deptStatusFilter, deptLEFilter]
  )

  const filteredSubs = useMemo(() =>
    subDepts.filter(s => {
      const q = subSearch.toLowerCase()
      const matchSearch = s.name.toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q) || (s.department_name || '').toLowerCase().includes(q)
      const matchStatus = subStatusFilter === 'all' || (subStatusFilter === 'active' && s.is_active) || (subStatusFilter === 'inactive' && !s.is_active)
      const matchDept = !subDeptFilter || s.department_id === subDeptFilter
      return matchSearch && matchStatus && matchDept
    }),
    [subDepts, subSearch, subStatusFilter, subDeptFilter]
  )

  // ── Department handlers ────────────────────────────────────────────────────
  const handleDeptSubmit = async (data: DepartmentFormData) => {
    setIsLoading(true)
    try {
      if (editingDept) {
        const res = await updateDepartment(editingDept.id, data)
        if (res.success && res.data) {
          setDepartments(prev => prev.map(d => d.id === editingDept.id ? res.data! : d))
          showMsg('success', res.message || 'Department updated')
          setIsDeptFormOpen(false); setEditingDept(null)
        } else { showMsg('error', res.error || 'Failed to update') }
      } else {
        const res = await createDepartment(data)
        if (res.success && res.data) {
          setDepartments(prev => [...prev, res.data!].sort((a, b) => a.name.localeCompare(b.name)))
          showMsg('success', res.message || 'Department created')
          setIsDeptFormOpen(false)
        } else { showMsg('error', res.error || 'Failed to create') }
      }
    } catch { showMsg('error', 'An unexpected error occurred') }
    finally { setIsLoading(false) }
  }

  const handleDeleteDept = async (dept: Department) => {
    setIsLoading(true)
    try {
      const res = await deleteDepartment(dept.id)
      if (res.success) { setDepartments(prev => prev.filter(d => d.id !== dept.id)); showMsg('success', res.message || 'Deleted') }
      else { showMsg('error', res.error || 'Failed to delete') }
    } catch { showMsg('error', 'An unexpected error occurred') }
    finally { setIsLoading(false); setDeleteDeptConfirm(null) }
  }

  const handleToggleDept = async (dept: Department) => {
    setIsLoading(true)
    try {
      const res = await toggleDepartmentStatus(dept.id)
      if (res.success && res.data) { setDepartments(prev => prev.map(d => d.id === dept.id ? res.data! : d)); showMsg('success', res.message || 'Status updated') }
      else { showMsg('error', res.error || 'Failed to update status') }
    } catch { showMsg('error', 'An unexpected error occurred') }
    finally { setIsLoading(false); setDeptActionMenu(null) }
  }

  // ── Sub-department handlers ────────────────────────────────────────────────
  const handleSubSubmit = async (data: SubDeptFormData) => {
    setIsLoading(true)
    try {
      if (editingSub) {
        const res = await updateSubDepartment(editingSub.id, data)
        if (res.success && res.data) {
          const dept = departments.find(d => d.id === res.data!.department_id)
          setSubDepts(prev => prev.map(s => s.id === editingSub.id ? { ...res.data!, department_name: dept?.name ?? null } : s))
          showMsg('success', res.message || 'Sub-department updated')
          setIsSubFormOpen(false); setEditingSub(null)
        } else { showMsg('error', res.error || 'Failed to update') }
      } else {
        const res = await createSubDepartment(data)
        if (res.success && res.data) {
          const dept = departments.find(d => d.id === res.data!.department_id)
          setSubDepts(prev => [...prev, { ...res.data!, department_name: dept?.name ?? null }].sort((a, b) => a.name.localeCompare(b.name)))
          showMsg('success', res.message || 'Sub-department created')
          setIsSubFormOpen(false)
        } else { showMsg('error', res.error || 'Failed to create') }
      }
    } catch { showMsg('error', 'An unexpected error occurred') }
    finally { setIsLoading(false) }
  }

  const handleDeleteSub = async (sub: SubDeptWithDeptName) => {
    setIsLoading(true)
    try {
      const res = await deleteSubDepartment(sub.id)
      if (res.success) { setSubDepts(prev => prev.filter(s => s.id !== sub.id)); showMsg('success', res.message || 'Deleted') }
      else { showMsg('error', res.error || 'Failed to delete') }
    } catch { showMsg('error', 'An unexpected error occurred') }
    finally { setIsLoading(false); setDeleteSubConfirm(null) }
  }

  const handleToggleSub = async (sub: SubDeptWithDeptName) => {
    setIsLoading(true)
    try {
      const res = await toggleSubDepartmentStatus(sub.id)
      if (res.success && res.data) {
        setSubDepts(prev => prev.map(s => s.id === sub.id ? { ...res.data!, department_name: sub.department_name } : s))
        showMsg('success', res.message || 'Status updated')
      } else { showMsg('error', res.error || 'Failed to update status') }
    } catch { showMsg('error', 'An unexpected error occurred') }
    finally { setIsLoading(false); setSubActionMenu(null) }
  }

  return (
    <>
      {/* Alert */}
      {(error || success) && (
        <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-3 animate-fade-in ${error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {error ? <AlertTriangle className="h-5 w-5 flex-shrink-0" /> : <CheckCircle className="h-5 w-5 flex-shrink-0" />}
          <p className="text-sm font-medium">{error || success}</p>
          <button onClick={() => { setError(null); setSuccess(null) }} className="ml-auto p-1 rounded hover:bg-black/10">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'departments' ? 'bg-primary-600 text-white shadow' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'}`}
        >
          <Building2 className="h-4 w-4" />
          Departments
          <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${activeTab === 'departments' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{departments.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('sub-departments')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'sub-departments' ? 'bg-primary-600 text-white shadow' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'}`}
        >
          <Layers className="h-4 w-4" />
          Sub-Departments
          <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${activeTab === 'sub-departments' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{subDepts.length}</span>
        </button>
      </div>

      {/* ── DEPARTMENTS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'departments' && (
        <div className="card overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search departments..." value={deptSearch} onChange={e => setDeptSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={deptStatusFilter} onChange={e => setDeptStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {initialLegalEntities.length > 0 && (
                  <select value={deptLEFilter} onChange={e => setDeptLEFilter(e.target.value)}
                    className="py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white">
                    <option value="">All Legal Entities</option>
                    {initialLegalEntities.map(le => (
                      <option key={le.id} value={le.id}>{le.name}</option>
                    ))}
                  </select>
                )}
                <button onClick={() => { setEditingDept(null); setIsDeptFormOpen(true) }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors">
                  <Plus className="h-4 w-4" /> Add Department
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Legal Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDepts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-600">{deptSearch || deptStatusFilter !== 'all' || deptLEFilter ? 'No departments match your filters' : 'No departments yet'}</p>
                      {!deptSearch && deptStatusFilter === 'all' && !deptLEFilter && (
                        <button onClick={() => setIsDeptFormOpen(true)} className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors mx-auto">
                          <Plus className="h-4 w-4" /> Add Department
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredDepts.map(dept => (
                    <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${dept.is_active ? 'bg-primary-100' : 'bg-slate-100'}`}>
                            <Building2 className={`h-5 w-5 ${dept.is_active ? 'text-primary-600' : 'text-slate-400'}`} />
                          </div>
                          <div>
                            <span className={`font-medium ${dept.is_active ? 'text-slate-800' : 'text-slate-500'}`}>{dept.name}</span>
                            {dept.description && <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{dept.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {dept.code ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">{dept.code}</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {dept.legal_entity_id && legalEntityMap[dept.legal_entity_id] ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">{legalEntityMap[dept.legal_entity_id]}</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${dept.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${dept.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block">
                          <button onClick={() => setDeptActionMenu(deptActionMenu === dept.id ? null : dept.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {deptActionMenu === dept.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setDeptActionMenu(null)} />
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 animate-fade-in">
                                <button onClick={() => { setEditingDept(dept); setIsDeptFormOpen(true); setDeptActionMenu(null) }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                  <Pencil className="h-4 w-4" /> Edit
                                </button>
                                <button onClick={() => handleToggleDept(dept)} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                  {dept.is_active ? <><XCircle className="h-4 w-4" />Deactivate</> : <><RotateCcw className="h-4 w-4" />Activate</>}
                                </button>
                                <hr className="my-1 border-slate-200" />
                                <button onClick={() => { setDeleteDeptConfirm(dept); setDeptActionMenu(null) }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                  <Trash2 className="h-4 w-4" /> Delete
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

          {filteredDepts.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 text-sm text-slate-500">
              Showing {filteredDepts.length} of {departments.length} departments
            </div>
          )}
        </div>
      )}

      {/* ── SUB-DEPARTMENTS TAB ──────────────────────────────────────────────── */}
      {activeTab === 'sub-departments' && (
        <div className="card overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search sub-departments..." value={subSearch} onChange={e => setSubSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={subStatusFilter} onChange={e => setSubStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none bg-white">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select value={subDeptFilter} onChange={e => setSubDeptFilter(e.target.value)}
                  className="py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none bg-white">
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button onClick={() => { setEditingSub(null); setIsSubFormOpen(true) }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors">
                  <Plus className="h-4 w-4" /> Add Sub-Department
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sub-Department</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-600">{subSearch || subStatusFilter !== 'all' || subDeptFilter ? 'No sub-departments match your filters' : 'No sub-departments yet'}</p>
                      {!subSearch && subStatusFilter === 'all' && !subDeptFilter && (
                        <button onClick={() => setIsSubFormOpen(true)} className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors mx-auto">
                          <Plus className="h-4 w-4" /> Add Sub-Department
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredSubs.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${sub.is_active ? 'bg-indigo-50' : 'bg-slate-100'}`}>
                            <Layers className={`h-4 w-4 ${sub.is_active ? 'text-indigo-500' : 'text-slate-400'}`} />
                          </div>
                          <span className={`font-medium ${sub.is_active ? 'text-slate-800' : 'text-slate-500'}`}>{sub.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {sub.code ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">{sub.code}</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{sub.department_name || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sub.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sub.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {sub.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block">
                          <button onClick={() => setSubActionMenu(subActionMenu === sub.id ? null : sub.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {subActionMenu === sub.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setSubActionMenu(null)} />
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 animate-fade-in">
                                <button onClick={() => { setEditingSub(sub); setIsSubFormOpen(true); setSubActionMenu(null) }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                  <Pencil className="h-4 w-4" /> Edit
                                </button>
                                <button onClick={() => handleToggleSub(sub)} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                  {sub.is_active ? <><XCircle className="h-4 w-4" />Deactivate</> : <><RotateCcw className="h-4 w-4" />Activate</>}
                                </button>
                                <hr className="my-1 border-slate-200" />
                                <button onClick={() => { setDeleteSubConfirm(sub); setSubActionMenu(null) }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                  <Trash2 className="h-4 w-4" /> Delete
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

          {filteredSubs.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 text-sm text-slate-500">
              Showing {filteredSubs.length} of {subDepts.length} sub-departments
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {isDeptFormOpen && (
        <DepartmentForm
          department={editingDept}
          legalEntities={initialLegalEntities}
          onSubmit={handleDeptSubmit}
          onCancel={() => { setIsDeptFormOpen(false); setEditingDept(null) }}
          isLoading={isLoading}
        />
      )}

      {deleteDeptConfirm && (
        <DeleteConfirmModal name={deleteDeptConfirm.name} isLoading={isLoading} onConfirm={() => handleDeleteDept(deleteDeptConfirm)} onCancel={() => setDeleteDeptConfirm(null)} />
      )}

      {isSubFormOpen && (
        <SubDeptFormModal editing={editingSub} departments={departments.filter(d => d.is_active)} isLoading={isLoading} onSubmit={handleSubSubmit} onCancel={() => { setIsSubFormOpen(false); setEditingSub(null) }} />
      )}

      {deleteSubConfirm && (
        <DeleteConfirmModal name={deleteSubConfirm.name} isLoading={isLoading} onConfirm={() => handleDeleteSub(deleteSubConfirm)} onCancel={() => setDeleteSubConfirm(null)} />
      )}
    </>
  )
}
