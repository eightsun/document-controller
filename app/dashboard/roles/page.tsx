'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Shield, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Save,
  AlertCircle,
  CheckCircle,
  Users
} from 'lucide-react'

interface Role {
  id: string
  name: string
  description: string | null
  created_at: string
  _count?: number
}

export default function RolesPage() {
  const supabase = createClient()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    fetchRoles()
  }, [])

  async function fetchRoles() {
    try {
      // Get roles with user count
      const { data: rolesData, error } = await supabase
        .from('roles')
        .select('*')
        .order('name')

      if (error) throw error

      // Get user counts for each role
      const rolesWithCounts = await Promise.all(
        (rolesData || []).map(async (role) => {
          const { count } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .eq('role_id', role.id)

          return { ...role, _count: count || 0 }
        })
      )

      setRoles(rolesWithCounts)
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingRole(null)
    setFormData({ name: '', description: '' })
    setIsModalOpen(true)
    setMessage(null)
  }

  function openEditModal(role: Role) {
    setEditingRole(role)
    setFormData({
      name: role.name,
      description: role.description || '',
    })
    setIsModalOpen(true)
    setMessage(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Role name is required' })
      setSaving(false)
      return
    }

    try {
      if (editingRole) {
        const { error } = await supabase
          .from('roles')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRole.id)

        if (error) throw error
        setMessage({ type: 'success', text: 'Role updated successfully!' })
      } else {
        const { error } = await supabase
          .from('roles')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
          })

        if (error) throw error
        setMessage({ type: 'success', text: 'Role created successfully!' })
      }

      fetchRoles()
      setTimeout(() => setIsModalOpen(false), 1000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save role' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(role: Role) {
    if (role._count && role._count > 0) {
      alert(`Cannot delete "${role.name}" - it has ${role._count} user(s) assigned.`)
      return
    }

    if (!confirm(`Are you sure you want to delete "${role.name}"?`)) return

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', role.id)

      if (error) throw error
      fetchRoles()
    } catch (error: any) {
      alert(error.message || 'Failed to delete role')
    }
  }

  const getRoleBadgeColor = (name: string) => {
    const colors: Record<string, string> = {
      'Admin': 'bg-red-100 text-red-700',
      'Document Controller': 'bg-purple-100 text-purple-700',
      'Reviewer': 'bg-blue-100 text-blue-700',
      'Approver': 'bg-emerald-100 text-emerald-700',
      'User': 'bg-slate-100 text-slate-700',
    }
    return colors[name] || 'bg-slate-100 text-slate-700'
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
          <div className="p-2 bg-red-100 rounded-lg">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Roles</h1>
            <p className="text-slate-500">Manage user roles and permissions</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.length === 0 ? (
          <div className="col-span-full card p-12 text-center">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No roles found. Click "Add Role" to create one.</p>
          </div>
        ) : (
          roles.map((role) => (
            <div key={role.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Shield className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(role)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(role)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mb-2 ${getRoleBadgeColor(role.name)}`}>
                {role.name}
              </span>

              <p className="text-sm text-slate-500 mb-4">
                {role.description || 'No description'}
              </p>

              <div className="flex items-center gap-2 text-sm text-slate-400 pt-3 border-t border-slate-100">
                <Users className="w-4 h-4" />
                <span>{role._count || 0} user{role._count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingRole ? 'Edit Role' : 'Add Role'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {message && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {message.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="e.g., Admin, Reviewer, Approver"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="Optional description of the role"
                  rows={3}
                />
              </div>

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
