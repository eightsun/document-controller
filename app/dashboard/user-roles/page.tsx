'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  UserCog, 
  Plus, 
  Trash2, 
  X, 
  Save,
  AlertCircle,
  CheckCircle,
  Shield,
  User,
  Search
} from 'lucide-react'

interface Profile {
  id: string
  full_name: string | null
  email: string
}

interface Role {
  id: string
  name: string
}

interface UserRole {
  id: string
  user_id: string
  role_id: string
  profiles: Profile
  roles: Role
}

export default function UserRolesPage() {
  const supabase = createClient()
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Form state
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Fetch user roles with profiles and roles
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select('*, profiles(*), roles(*)')
        .order('created_at', { ascending: false })

      // Fetch all users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name')

      // Fetch all roles
      const { data: rolesData } = await supabase
        .from('roles')
        .select('id, name')
        .order('name')

      setUserRoles(userRolesData || [])
      setUsers(usersData || [])
      setRoles(rolesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setSelectedUser('')
    setSelectedRole('')
    setIsModalOpen(true)
    setMessage(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (!selectedUser || !selectedRole) {
      setMessage({ type: 'error', text: 'Please select both user and role' })
      setSaving(false)
      return
    }

    // Check if assignment already exists
    const existing = userRoles.find(
      ur => ur.user_id === selectedUser && ur.role_id === selectedRole
    )
    if (existing) {
      setMessage({ type: 'error', text: 'This user already has this role' })
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser,
          role_id: selectedRole,
        })

      if (error) throw error

      setMessage({ type: 'success', text: 'Role assigned successfully!' })
      fetchData()
      setTimeout(() => setIsModalOpen(false), 1000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to assign role' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(userRole: UserRole) {
    if (!confirm(`Remove "${userRole.roles.name}" role from "${userRole.profiles.full_name || userRole.profiles.email}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userRole.id)

      if (error) throw error
      fetchData()
    } catch (error: any) {
      alert(error.message || 'Failed to remove role')
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

  // Filter user roles by search term
  const filteredUserRoles = userRoles.filter(ur => {
    const searchLower = searchTerm.toLowerCase()
    return (
      (ur.profiles.full_name?.toLowerCase().includes(searchLower)) ||
      ur.profiles.email.toLowerCase().includes(searchLower) ||
      ur.roles.name.toLowerCase().includes(searchLower)
    )
  })

  // Group by user
  const groupedByUser = filteredUserRoles.reduce((acc, ur) => {
    const key = ur.user_id
    if (!acc[key]) {
      acc[key] = {
        user: ur.profiles,
        roles: []
      }
    }
    acc[key].roles.push(ur)
    return acc
  }, {} as Record<string, { user: Profile; roles: UserRole[] }>)

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
          <div className="p-2 bg-indigo-100 rounded-lg">
            <UserCog className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">User Roles</h1>
            <p className="text-slate-500">Assign roles to users</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Assign Role
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users or roles..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Users with Roles */}
      <div className="space-y-4">
        {Object.keys(groupedByUser).length === 0 ? (
          <div className="card p-12 text-center">
            <UserCog className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No user roles found. Click "Assign Role" to add one.</p>
          </div>
        ) : (
          Object.values(groupedByUser).map(({ user, roles: userRolesList }) => (
            <div key={user.id} className="card p-4">
              <div className="flex items-center gap-4">
                {/* User Avatar */}
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-primary-600">
                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {user.full_name || 'No name'}
                  </p>
                  <p className="text-sm text-slate-500 truncate">{user.email}</p>
                </div>

                {/* Roles */}
                <div className="flex flex-wrap gap-2 justify-end">
                  {userRolesList.map((ur) => (
                    <div
                      key={ur.id}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(ur.roles.name)}`}
                    >
                      <Shield className="w-3 h-3" />
                      {ur.roles.name}
                      <button
                        onClick={() => handleDelete(ur)}
                        className="ml-1 p-0.5 hover:bg-black/10 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
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
              <h2 className="text-lg font-semibold text-slate-800">Assign Role to User</h2>
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
                  User <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email} {user.full_name && `(${user.email})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
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
                  {saving ? 'Saving...' : 'Assign Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
