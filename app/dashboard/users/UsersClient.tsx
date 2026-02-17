'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  Plus, 
  Search, 
  Users,
  Pencil, 
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Shield,
  Mail,
  Building2,
  UserCog,
  UserX,
  UserCheck
} from 'lucide-react'
import { 
  updateUserProfile, 
  updateUserRoles, 
  toggleUserStatus,
  createUser,
  type UserWithRoles,
  type UpdateProfileData,
  type CreateUserData
} from './actions'
import type { Role, Department } from '@/types/database'

interface UsersClientProps {
  initialUsers: UserWithRoles[]
  roles: Role[]
  departments: Department[]
}

// ============================================================================
// Edit Profile Modal
// ============================================================================
function EditProfileModal({
  user,
  departments,
  isLoading,
  onSubmit,
  onCancel,
}: {
  user: UserWithRoles
  departments: Department[]
  isLoading: boolean
  onSubmit: (data: UpdateProfileData) => void
  onCancel: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState<UpdateProfileData>({
    full_name: user.full_name || '',
    employee_id: user.employee_id || '',
    phone: user.phone || '',
    job_title: user.job_title || '',
    department_id: user.department_id,
    is_active: user.is_active,
  })

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const modalContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', boxSizing: 'border-box',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      }} onClick={onCancel} />

      <div style={{
        position: 'relative', width: '100%', maxWidth: '500px', maxHeight: 'calc(100vh - 32px)',
        backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', backgroundColor: '#eef2ff', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Pencil style={{ width: '20px', height: '20px', color: '#4f46e5' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>Edit Profile</h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>{user.email}</p>
            </div>
          </div>
          <button onClick={onCancel} style={{
            padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94a3b8',
          }}>
            <XCircle style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                style={{
                  width: '100%', padding: '10px 16px', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Employee ID */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Employee ID
              </label>
              <input
                type="text"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                placeholder="e.g., EMP001"
                style={{
                  width: '100%', padding: '10px 16px', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +62 812 3456 7890"
                style={{
                  width: '100%', padding: '10px 16px', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Job Title */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Job Title
              </label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="e.g., Senior Developer"
                style={{
                  width: '100%', padding: '10px 16px', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Department */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Department
              </label>
              <select
                value={formData.department_id || ''}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value || null })}
                style={{
                  width: '100%', padding: '10px 16px', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  backgroundColor: 'white',
                }}
              >
                <option value="">Select department...</option>
                {departments.filter(d => d.is_active).map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Active Status */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0',
            }}>
              <div>
                <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Active Status</label>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Inactive users cannot log in</p>
              </div>
              <label style={{ position: 'relative', display: 'inline-flex', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
                <div style={{
                  width: '44px', height: '24px', backgroundColor: formData.is_active ? '#4f46e5' : '#cbd5e1',
                  borderRadius: '12px', position: 'relative', transition: 'background-color 0.2s',
                }}>
                  <div style={{
                    position: 'absolute', top: '2px', left: formData.is_active ? '22px' : '2px',
                    width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px',
            marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0',
          }}>
            <button type="button" onClick={onCancel} disabled={isLoading} style={{
              padding: '10px 16px', fontSize: '14px', fontWeight: 500, color: '#374151',
              backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px',
              cursor: 'pointer', opacity: isLoading ? 0.5 : 1,
            }}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} style={{
              padding: '10px 16px', fontSize: '14px', fontWeight: 500, color: 'white',
              backgroundColor: '#4f46e5', border: 'none', borderRadius: '8px',
              cursor: 'pointer', opacity: isLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              {isLoading ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modalContent, document.body)
}

// ============================================================================
// Manage Roles Modal
// ============================================================================
function ManageRolesModal({
  user,
  roles,
  isLoading,
  onSubmit,
  onCancel,
}: {
  user: UserWithRoles
  roles: Role[]
  isLoading: boolean
  onSubmit: (roleIds: string[]) => void
  onCancel: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.role_ids || [])

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(selectedRoles)
  }

  const modalContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', boxSizing: 'border-box',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      }} onClick={onCancel} />

      <div style={{
        position: 'relative', width: '100%', maxWidth: '450px',
        backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', backgroundColor: '#fef3c7', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield style={{ width: '20px', height: '20px', color: '#d97706' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>Manage Roles</h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>{user.full_name || user.email}</p>
            </div>
          </div>
          <button onClick={onCancel} style={{
            padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94a3b8',
          }}>
            <XCircle style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Roles List */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b' }}>
            Select the roles to assign to this user:
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {roles.map((role) => (
              <label
                key={role.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                  backgroundColor: selectedRoles.includes(role.id) ? '#eef2ff' : '#f8fafc',
                  borderRadius: '8px', border: `1px solid ${selectedRoles.includes(role.id) ? '#4f46e5' : '#e2e8f0'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{role.name}</p>
                  {role.description && (
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>{role.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px',
            marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0',
          }}>
            <button type="button" onClick={onCancel} disabled={isLoading} style={{
              padding: '10px 16px', fontSize: '14px', fontWeight: 500, color: '#374151',
              backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px',
              cursor: 'pointer', opacity: isLoading ? 0.5 : 1,
            }}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} style={{
              padding: '10px 16px', fontSize: '14px', fontWeight: 500, color: 'white',
              backgroundColor: '#4f46e5', border: 'none', borderRadius: '8px',
              cursor: 'pointer', opacity: isLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              {isLoading ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Save Roles'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modalContent, document.body)
}

// ============================================================================
// Create User Modal
// ============================================================================
function CreateUserModal({
  roles,
  departments,
  isLoading,
  onSubmit,
  onCancel,
}: {
  roles: Role[]
  departments: Department[]
  isLoading: boolean
  onSubmit: (data: CreateUserData) => void
  onCancel: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    full_name: '',
    department_id: null,
    role_ids: [],
  })

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const toggleRole = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      role_ids: prev.role_ids?.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...(prev.role_ids || []), roleId]
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const modalContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', boxSizing: 'border-box',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      }} onClick={onCancel} />

      <div style={{
        position: 'relative', width: '100%', maxWidth: '500px', maxHeight: 'calc(100vh - 32px)',
        backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', backgroundColor: '#dcfce7', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserCog style={{ width: '20px', height: '20px', color: '#16a34a' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>Create New User</h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Add a new user to the system</p>
            </div>
          </div>
          <button onClick={onCancel} style={{
            padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94a3b8',
          }}>
            <XCircle style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="user@example.com"
                style={{
                  width: '100%', padding: '10px 16px', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                style={{
                  width: '100%', padding: '10px 16px', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                placeholder="John Doe"
                style={{
                  width: '100%', padding: '10px 16px', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Department */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Department
              </label>
              <select
                value={formData.department_id || ''}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value || null })}
                style={{
                  width: '100%', padding: '10px 16px', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  backgroundColor: 'white',
                }}
              >
                <option value="">Select department...</option>
                {departments.filter(d => d.is_active).map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Roles */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Roles
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {roles.map((role) => (
                  <label
                    key={role.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                      backgroundColor: formData.role_ids?.includes(role.id) ? '#eef2ff' : '#f8fafc',
                      borderRadius: '6px', border: `1px solid ${formData.role_ids?.includes(role.id) ? '#4f46e5' : '#e2e8f0'}`,
                      cursor: 'pointer', fontSize: '13px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.role_ids?.includes(role.id) || false}
                      onChange={() => toggleRole(role.id)}
                      style={{ width: '14px', height: '14px', accentColor: '#4f46e5' }}
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px',
            marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0',
          }}>
            <button type="button" onClick={onCancel} disabled={isLoading} style={{
              padding: '10px 16px', fontSize: '14px', fontWeight: 500, color: '#374151',
              backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px',
              cursor: 'pointer', opacity: isLoading ? 0.5 : 1,
            }}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} style={{
              padding: '10px 16px', fontSize: '14px', fontWeight: 500, color: 'white',
              backgroundColor: '#16a34a', border: 'none', borderRadius: '8px',
              cursor: 'pointer', opacity: isLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              {isLoading ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> Creating...</> : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modalContent, document.body)
}

// ============================================================================
// Main Component
// ============================================================================
export default function UsersClient({ initialUsers, roles, departments }: UsersClientProps) {
  const [users, setUsers] = useState<UserWithRoles[]>(initialUsers)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null)
  const [managingRolesUser, setManagingRolesUser] = useState<UserWithRoles | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = 
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department_name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active)

      const matchesRole = 
        roleFilter === 'all' ||
        user.roles.includes(roleFilter)
      
      return matchesSearch && matchesStatus && matchesRole
    })
  }, [users, searchQuery, statusFilter, roleFilter])

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

  const handleUpdateProfile = async (data: UpdateProfileData) => {
    if (!editingUser) return
    setIsLoading(true)
    
    try {
      const result = await updateUserProfile(editingUser.id, data)
      if (result.success) {
        setUsers(prev => prev.map(u => 
          u.id === editingUser.id 
            ? { ...u, ...data, department_name: departments.find(d => d.id === data.department_id)?.name || null }
            : u
        ))
        showMessage('success', result.message || 'Profile updated successfully')
        setEditingUser(null)
      } else {
        showMessage('error', result.error || 'Failed to update profile')
      }
    } catch {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateRoles = async (roleIds: string[]) => {
    if (!managingRolesUser) return
    setIsLoading(true)
    
    try {
      const result = await updateUserRoles(managingRolesUser.id, roleIds)
      if (result.success) {
        const newRoleNames = roles.filter(r => roleIds.includes(r.id)).map(r => r.name)
        setUsers(prev => prev.map(u => 
          u.id === managingRolesUser.id 
            ? { ...u, roles: newRoleNames, role_ids: roleIds }
            : u
        ))
        showMessage('success', result.message || 'Roles updated successfully')
        setManagingRolesUser(null)
      } else {
        showMessage('error', result.error || 'Failed to update roles')
      }
    } catch {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async (data: CreateUserData) => {
    setIsLoading(true)
    
    try {
      const result = await createUser(data)
      if (result.success) {
        showMessage('success', result.message || 'User created successfully')
        setIsCreateModalOpen(false)
        window.location.reload()
      } else {
        showMessage('error', result.error || 'Failed to create user')
      }
    } catch {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = async (user: UserWithRoles) => {
    setIsLoading(true)
    setActionMenuOpen(null)
    
    try {
      const result = await toggleUserStatus(user.id)
      if (result.success) {
        setUsers(prev => prev.map(u => 
          u.id === user.id ? { ...u, is_active: !u.is_active } : u
        ))
        showMessage('success', result.message || 'Status updated')
      } else {
        showMessage('error', result.error || 'Failed to update status')
      }
    } catch {
      showMessage('error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      'Admin': 'bg-red-100 text-red-700',
      'BPM': 'bg-purple-100 text-purple-700',
      'MQS Reps': 'bg-blue-100 text-blue-700',
      'SME': 'bg-amber-100 text-amber-700',
      'Approver': 'bg-emerald-100 text-emerald-700',
    }
    return colors[role] || 'bg-slate-100 text-slate-700'
  }

  return (
    <>
      {/* Alert Messages */}
      {(error || success) && (
        <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-3 animate-fade-in ${
          error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          {error ? <AlertTriangle className="h-5 w-5 flex-shrink-0" /> : <CheckCircle className="h-5 w-5 flex-shrink-0" />}
          <p className="text-sm font-medium">{error || success}</p>
          <button onClick={() => { setError(null); setSuccess(null) }} className="ml-auto p-1 rounded hover:bg-black/10">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
              >
                <option value="all">All Roles</option>
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add User
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Roles</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Users className="h-6 w-6 text-slate-400" />
                      </div>
                      <h3 className="text-sm font-medium text-slate-800 mb-1">No users found</h3>
                      <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          user.is_active ? 'bg-primary-500' : 'bg-slate-400'
                        }`}>
                          {(user.full_name || user.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-medium ${user.is_active ? 'text-slate-800' : 'text-slate-500'}`}>
                            {user.full_name || 'No name'}
                          </p>
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.department_name ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {user.department_name}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <span key={role} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(role)}`}>
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-sm">No roles</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {actionMenuOpen === user.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionMenuOpen(null)} />
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 animate-fade-in">
                              <button
                                onClick={() => { setEditingUser(user); setActionMenuOpen(null) }}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit Profile
                              </button>
                              <button
                                onClick={() => { setManagingRolesUser(user); setActionMenuOpen(null) }}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Shield className="h-4 w-4" />
                                Manage Roles
                              </button>
                              <hr className="my-1 border-slate-200" />
                              <button
                                onClick={() => handleToggleStatus(user)}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                {user.is_active ? (
                                  <><UserX className="h-4 w-4" /> Deactivate</>
                                ) : (
                                  <><UserCheck className="h-4 w-4" /> Activate</>
                                )}
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

        {filteredUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
            <p className="text-sm text-slate-500">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {editingUser && (
        <EditProfileModal
          user={editingUser}
          departments={departments}
          isLoading={isLoading}
          onSubmit={handleUpdateProfile}
          onCancel={() => setEditingUser(null)}
        />
      )}

      {managingRolesUser && (
        <ManageRolesModal
          user={managingRolesUser}
          roles={roles}
          isLoading={isLoading}
          onSubmit={handleUpdateRoles}
          onCancel={() => setManagingRolesUser(null)}
        />
      )}

      {isCreateModalOpen && (
        <CreateUserModal
          roles={roles}
          departments={departments}
          isLoading={isLoading}
          onSubmit={handleCreateUser}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      )}
    </>
  )
}
