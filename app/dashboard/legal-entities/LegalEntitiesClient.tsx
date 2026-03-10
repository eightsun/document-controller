'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus,
  Search,
  Landmark,
  Pencil,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Loader2,
} from 'lucide-react'
import {
  createLegalEntity,
  updateLegalEntity,
  deleteLegalEntity,
  toggleLegalEntityStatus,
} from './actions'
import type { LegalEntity } from '@/types/database'

interface Props {
  initialLegalEntities: LegalEntity[]
}

interface FormData {
  name: string
  code: string
  description: string
  is_active: boolean
}

const emptyForm: FormData = { name: '', code: '', description: '', is_active: true }

// ─────────────────────────────────────────────────────────────────────────────
// Delete confirmation modal (portal)
// ─────────────────────────────────────────────────────────────────────────────
function DeleteModal({
  entity,
  isLoading,
  onConfirm,
  onCancel,
}: {
  entity: LegalEntity
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
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>Delete Legal Entity</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>This action cannot be undone</p>
          </div>
        </div>
        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
          Are you sure you want to delete <strong>{entity.name}</strong>? This will remove the legal entity from the system.
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
// Add / Edit modal (portal)
// ─────────────────────────────────────────────────────────────────────────────
function FormModal({
  editing,
  isLoading,
  onSubmit,
  onCancel,
}: {
  editing: LegalEntity | null
  isLoading: boolean
  onSubmit: (data: FormData) => void
  onCancel: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState<FormData>(
    editing
      ? { name: editing.name, code: editing.code, description: editing.description || '', is_active: editing.is_active }
      : emptyForm
  )

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
          {editing ? 'Edit Legal Entity' : 'Add Legal Entity'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. PT Meratus Line"
              style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Code */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              Code <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. MRT"
              maxLength={10}
              style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
            />
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Short uppercase code used in document numbering</p>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Optional description..."
              style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {/* Active toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
            <div
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              style={{ width: '40px', height: '22px', backgroundColor: form.is_active ? '#3b82f6' : '#d1d5db', borderRadius: '999px', position: 'relative', transition: 'background-color .2s', flexShrink: 0, cursor: 'pointer' }}
            >
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
export default function LegalEntitiesClient({ initialLegalEntities }: Props) {
  const [entities, setEntities] = useState<LegalEntity[]>(initialLegalEntities)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<LegalEntity | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<LegalEntity | null>(null)
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

  const filtered = useMemo(() =>
    entities.filter(e => {
      const q = searchQuery.toLowerCase()
      const matchSearch = e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' && e.is_active) || (statusFilter === 'inactive' && !e.is_active)
      return matchSearch && matchStatus
    }),
    [entities, searchQuery, statusFilter]
  )

  const showMsg = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') { setSuccess(msg); setError(null); setTimeout(() => setSuccess(null), 5000) }
    else { setError(msg); setSuccess(null); setTimeout(() => setError(null), 5000) }
  }

  const handleSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      if (editing) {
        const res = await updateLegalEntity(editing.id, data)
        if (res.success && res.data) {
          setEntities(prev => prev.map(e => e.id === editing.id ? res.data! : e))
          showMsg('success', res.message || 'Legal entity updated')
          setIsFormOpen(false); setEditing(null)
        } else { showMsg('error', res.error || 'Failed to update') }
      } else {
        const res = await createLegalEntity(data)
        if (res.success && res.data) {
          setEntities(prev => [...prev, res.data!].sort((a, b) => a.name.localeCompare(b.name)))
          showMsg('success', res.message || 'Legal entity created')
          setIsFormOpen(false)
        } else { showMsg('error', res.error || 'Failed to create') }
      }
    } catch { showMsg('error', 'An unexpected error occurred') }
    finally { setIsLoading(false) }
  }

  const handleDelete = async (entity: LegalEntity) => {
    setIsLoading(true)
    try {
      const res = await deleteLegalEntity(entity.id)
      if (res.success) { setEntities(prev => prev.filter(e => e.id !== entity.id)); showMsg('success', res.message || 'Deleted') }
      else { showMsg('error', res.error || 'Failed to delete') }
    } catch { showMsg('error', 'An unexpected error occurred') }
    finally { setIsLoading(false); setDeleteConfirm(null) }
  }

  const handleToggle = async (entity: LegalEntity) => {
    setIsLoading(true)
    try {
      const res = await toggleLegalEntityStatus(entity.id)
      if (res.success && res.data) { setEntities(prev => prev.map(e => e.id === entity.id ? res.data! : e)); showMsg('success', res.message || 'Status updated') }
      else { showMsg('error', res.error || 'Failed to update status') }
    } catch { showMsg('error', 'An unexpected error occurred') }
    finally { setIsLoading(false); setActionMenuOpen(null) }
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

      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search legal entities..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="pl-10 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 appearance-none bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
              <button
                onClick={() => { setEditing(null); setIsFormOpen(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Legal Entity
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Landmark className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No legal entities match your filters' : 'No legal entities yet'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filter' : 'Add your first legal entity to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button onClick={() => { setEditing(null); setIsFormOpen(true) }} className="btn-primary">
                <Plus className="h-4 w-4" /> Add Legal Entity
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(entity => (
                  <tr key={entity.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Landmark className="w-4 h-4 text-primary-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-900">{entity.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-700">
                        {entity.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{entity.description || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${entity.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${entity.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {entity.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(entity); setIsFormOpen(true) }}
                          className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === entity.id ? null : entity.id)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {actionMenuOpen === entity.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActionMenuOpen(null)} />
                              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                                <button
                                  onClick={() => handleToggle(entity)}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  {entity.is_active ? <XCircle className="h-4 w-4 text-slate-400" /> : <CheckCircle className="h-4 w-4 text-slate-400" />}
                                  {entity.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => { setDeleteConfirm(entity); setActionMenuOpen(null) }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-sm text-slate-500">
            Showing {filtered.length} of {entities.length} legal {entities.length === 1 ? 'entity' : 'entities'}
          </div>
        )}
      </div>

      {/* Modals */}
      {isFormOpen && (
        <FormModal
          editing={editing}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          onCancel={() => { setIsFormOpen(false); setEditing(null) }}
        />
      )}
      {deleteConfirm && (
        <DeleteModal
          entity={deleteConfirm}
          isLoading={isLoading}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </>
  )
}
