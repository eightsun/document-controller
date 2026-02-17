'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  FolderOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Save,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface DocumentType {
  id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  created_at: string
}

export default function DocumentTypesPage() {
  const supabase = createClient()
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<DocumentType | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    is_active: true,
  })

  useEffect(() => {
    fetchDocumentTypes()
  }, [])

  async function fetchDocumentTypes() {
    try {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .order('name')

      if (error) throw error
      setDocumentTypes(data || [])
    } catch (error) {
      console.error('Error fetching document types:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingType(null)
    setFormData({ name: '', code: '', description: '', is_active: true })
    setIsModalOpen(true)
    setMessage(null)
  }

  function openEditModal(docType: DocumentType) {
    setEditingType(docType)
    setFormData({
      name: docType.name,
      code: docType.code,
      description: docType.description || '',
      is_active: docType.is_active,
    })
    setIsModalOpen(true)
    setMessage(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    // Validation
    if (!formData.name.trim() || !formData.code.trim()) {
      setMessage({ type: 'error', text: 'Name and code are required' })
      setSaving(false)
      return
    }

    try {
      if (editingType) {
        // Update
        const { error } = await supabase
          .from('document_types')
          .update({
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            description: formData.description.trim() || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingType.id)

        if (error) throw error
        setMessage({ type: 'success', text: 'Document type updated successfully!' })
      } else {
        // Create
        const { error } = await supabase
          .from('document_types')
          .insert({
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            description: formData.description.trim() || null,
            is_active: formData.is_active,
          })

        if (error) throw error
        setMessage({ type: 'success', text: 'Document type created successfully!' })
      }

      fetchDocumentTypes()
      setTimeout(() => {
        setIsModalOpen(false)
      }, 1000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save document type' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(docType: DocumentType) {
    if (!confirm(`Are you sure you want to delete "${docType.name}"?`)) return

    try {
      const { error } = await supabase
        .from('document_types')
        .delete()
        .eq('id', docType.id)

      if (error) throw error
      fetchDocumentTypes()
    } catch (error: any) {
      alert(error.message || 'Failed to delete document type')
    }
  }

  async function toggleActive(docType: DocumentType) {
    try {
      const { error } = await supabase
        .from('document_types')
        .update({ is_active: !docType.is_active })
        .eq('id', docType.id)

      if (error) throw error
      fetchDocumentTypes()
    } catch (error: any) {
      alert(error.message || 'Failed to update status')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FolderOpen className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Document Types</h1>
            <p className="text-slate-500">Manage document type categories</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Type
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Code</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Description</th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documentTypes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No document types found. Click "Add Type" to create one.
                </td>
              </tr>
            ) : (
              documentTypes.map((docType) => (
                <tr key={docType.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FileText className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="font-medium text-slate-800">{docType.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">
                      {docType.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {docType.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleActive(docType)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        docType.is_active
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {docType.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(docType)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(docType)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingType ? 'Edit Document Type' : 'Add Document Type'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {message && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {message.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="e.g., Manual, Procedure, Form"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono"
                  placeholder="e.g., MAN, PRC, FRM"
                  maxLength={5}
                />
                <p className="text-xs text-slate-400 mt-1">3-5 characters, will be used in document numbers</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700">
                  Active (available for new documents)
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
