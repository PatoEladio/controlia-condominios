'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Eye, EyeOff, Pencil, RefreshCw, Trash2, UserPlus } from 'lucide-react'
import { deleteUser, listUsers, registerUser, updateUser } from '../services/users'
import { getProfiles } from '../services/profiles'
import { getDepartments } from '../services/departments'
import { getCurrentUser } from '../services/auth'
import { ConfirmDialog, Field, Modal } from './form-modal'
import { stagger } from './motion'

interface Profile {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
  location?: string
}

interface ApiUser {
  id: string
  username: string
  createdAt: string
  profile?: Profile | null
  company?: { id: string; name: string } | null
  departments?: Department[]
}

interface UsersViewProps {
  // Perfil de quien usa la vista: ADMIN asigna ADMIN, PROPIETARIO y CONSERJE; SUPERADMIN, todos
  userRole: string
  onToast?: (message: string) => void
}

const getErrorMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message
  if (Array.isArray(message)) return message.join(', ')
  return message || fallback
}

const toList = <T,>(response: unknown): T[] => {
  const r = response as { data?: T[] } | T[] | undefined
  if (Array.isArray(r)) return r
  return Array.isArray(r?.data) ? r.data : []
}

const formatDate = (value: string) =>
  value
    ? new Date(value).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Santiago',
      })
    : '—'

const PROFILE_HIERARCHY = ['SUPERADMIN', 'ADMIN', 'PROPIETARIO', 'CONSERJE']
const OWNER_PROFILE = 'PROPIETARIO'
const hierarchyIndex = (name?: string) => {
  const index = PROFILE_HIERARCHY.indexOf((name || '').toUpperCase())
  return index === -1 ? PROFILE_HIERARCHY.length : index
}

const profileBadge = (name?: string) => {
  const role = (name || '').toUpperCase()
  if (role === 'SUPERADMIN') return 'bg-[#fef3c7] text-[#b45309]'
  if (role === 'PROPIETARIO') return 'bg-[#dcfce7] text-[#15803d]'
  if (role === 'ADMIN') return 'bg-[#e8f1fa] text-[#004b93]'
  if (role === 'CONSERJE') return 'bg-[#e0f2fe] text-[#0284c7]'
  return 'bg-[#f1f5f9] text-[#64748b]'
}

export default function UsersView({ userRole, onToast }: UsersViewProps) {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [allProfiles, setProfiles] = useState<Profile[]>([])
  // Perfiles que este usuario puede asignar (igual que la regla del backend):
  // SUPERADMIN: todos · ADMIN: todos menos SUPERADMIN
  const role = userRole.toUpperCase()
  const assignableNames = role === 'SUPERADMIN' ? null : ['ADMIN', 'PROPIETARIO', 'CONSERJE']
  const isAssignable = (profileName?: string) =>
    assignableNames === null || assignableNames.includes((profileName || '').toUpperCase())
  // Ordenados según la jerarquía: SUPERADMIN, ADMIN, PROPIETARIO, CONSERJE
  const profiles = allProfiles
    .filter((p) => isAssignable(p.name))
    .sort((a, b) => hierarchyIndex(a.name) - hierarchyIndex(b.name))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10
  const lastRequest = useRef(0)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null)
  // Departamentos del condominio y los que se asignan al usuario del formulario (uno o más)
  const [departments, setDepartments] = useState<Department[]>([])
  const [formProfileId, setFormProfileId] = useState('')
  const [formDepartmentIds, setFormDepartmentIds] = useState<string[]>([])

  const [userToDelete, setUserToDelete] = useState<ApiUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const currentUserId = getCurrentUser()?.id

  // Solo el perfil PROPIETARIO lleva departamentos (y necesita al menos uno)
  const formProfileName = profiles.find((p) => p.id === formProfileId)?.name
  const formIsOwner = (formProfileName || '').toUpperCase() === OWNER_PROFILE

  // Solo se puede editar / eliminar a usuarios con un perfil que uno puede asignar
  const canManage = (user: ApiUser) => isAssignable(user.profile?.name)

  const fetchUsers = async () => {
    const requestId = ++lastRequest.current
    setLoading(true)
    setError('')
    try {
      const response = await listUsers(page, pageSize)
      if (requestId !== lastRequest.current) return
      setUsers(toList<ApiUser>(response))
      setTotal(response?.meta?.total ?? 0)
      setTotalPages(Math.max(1, response?.meta?.totalPages ?? 1))
    } catch (err) {
      if (requestId !== lastRequest.current) return
      console.error('Error fetching users:', err)
      setError('No se pudieron cargar los usuarios. Verifica la conexión.')
    } finally {
      if (requestId === lastRequest.current) setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page])

  useEffect(() => {
    getProfiles()
      .then((response) => setProfiles(toList<Profile>(response)))
      .catch((err) => console.error('Error fetching profiles:', err))
    getDepartments()
      .then((response) => setDepartments(toList<Department>(response)))
      .catch((err) => console.error('Error fetching departments:', err))
  }, [])

  const openForm = (user: ApiUser | null = null) => {
    setEditingUser(user)
    setFormProfileId(user?.profile?.id || (profiles.length === 1 ? profiles[0].id : ''))
    setFormDepartmentIds((user?.departments || []).map((d) => d.id))
    setFormError('')
    setShowPassword(false)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingUser(null)
  }

  const handleDelete = async () => {
    if (!userToDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteUser(userToDelete.id)
      setUserToDelete(null)
      onToast?.('Usuario eliminado')
      // Si era el último registro de la página, volver a la anterior
      if (users.length === 1 && page > 1) setPage(page - 1)
      else fetchUsers()
    } catch (err) {
      console.error('Error deleting user:', err)
      setDeleteError(getErrorMessage(err, 'No se pudo eliminar el usuario.'))
    } finally {
      setDeleting(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const username = String(data.get('username') || '').trim()
    const password = String(data.get('password') || '')
    const confirm = String(data.get('confirm') || '')
    const profileId = formProfileId

    if (formIsOwner && formDepartmentIds.length === 0) {
      setFormError('Un usuario PROPIETARIO debe tener al menos un departamento asignado.')
      return
    }
    // Solo el PROPIETARIO lleva departamentos: al cambiar a otro perfil se quitan
    const departmentIds = formIsOwner ? formDepartmentIds : []

    // Al editar, la contraseña es opcional: vacía = no se cambia
    const changingPassword = !editingUser || password.length > 0
    if (changingPassword && password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (changingPassword && password !== confirm) {
      setFormError('Las contraseñas no coinciden.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          username,
          profileId,
          departmentIds,
          ...(changingPassword && { password }),
        })
        closeForm()
        onToast?.('Usuario actualizado correctamente')
        fetchUsers()
      } else {
        await registerUser({ username, password, profileId, departmentIds })
        closeForm()
        onToast?.('Usuario creado correctamente')
        if (page === 1) fetchUsers()
        else setPage(1)
      }
    } catch (err) {
      console.error('Error saving user:', err)
      setFormError(getErrorMessage(err, 'No se pudo guardar el usuario.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-[#64748b]">Gestión de personal y accesos</p>
          <h2 className="mt-1 text-[27px] font-bold tracking-[-0.04em] text-[#0f172a]">
            Usuarios
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-xs font-bold text-[#334155] shadow-sm transition hover:bg-[#f8fafc] disabled:opacity-50"
            title="Refrescar lista"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#004b93]' : ''} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
          <button
            onClick={() => openForm()}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#004b93] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#003870]"
          >
            <UserPlus size={16} /> Nuevo usuario
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="mb-5">
          <h3 className="text-sm font-bold text-[#0f172a]">Usuarios registrados</h3>
          <p className="mt-1 text-xs text-[#64748b]">
            Personas con acceso al sistema y su perfil asignado
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[#fef2f2] p-3 text-xs font-semibold text-[#b91c1c]">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-[#e2e8f0] text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                <th className="pb-3 pl-1">Usuario</th>
                <th className="pb-3">Perfil</th>
                <th className="pb-3">Departamentos</th>
                <th className="pb-3">Creado</th>
                <th className="pb-3 pr-1 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-[#64748b]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={15} className="animate-spin text-[#004b93]" />
                      Cargando usuarios...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-[#64748b]">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                users.map((user, rowIndex) => (
                  <tr
                    key={user.id}
                    style={stagger(rowIndex)}
                    className="fa-row border-b border-[#f1f5f9] transition-colors last:border-0 hover:bg-[#f8fafc]"
                  >
                    <td className="py-3.5 pl-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f1fa] text-[10px] font-bold text-[#004b93]">
                          {user.username.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-xs font-bold text-[#0f172a]">{user.username}</p>
                      </div>
                    </td>
                    <td>
                      {user.profile ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${profileBadge(user.profile.name)}`}
                        >
                          {user.profile.name}
                        </span>
                      ) : (
                        <span className="text-xs text-[#94a3b8]">Sin perfil</span>
                      )}
                    </td>
                    <td className="text-xs text-[#475569]">
                      {user.departments && user.departments.length > 0 ? (
                        <div className="flex max-w-[260px] flex-wrap gap-1">
                          {user.departments.map((d) => (
                            <span
                              key={d.id}
                              className="rounded-md bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] font-semibold text-[#475569]"
                              title={d.location || undefined}
                            >
                              {d.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-xs text-[#475569]">{formatDate(user.createdAt)}</td>
                    <td className="pr-1">
                      {canManage(user) ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openForm(user)}
                            className="rounded-lg p-2 text-[#64748b] transition hover:bg-[#e8f1fa] hover:text-[#004b93]"
                            title="Editar usuario"
                            aria-label={`Editar usuario ${user.username}`}
                          >
                            <Pencil size={14} />
                          </button>
                          {user.id !== currentUserId && (
                            <button
                              onClick={() => {
                                setDeleteError('')
                                setUserToDelete(user)
                              }}
                              className="rounded-lg p-2 text-[#64748b] transition hover:bg-[#fef2f2] hover:text-[#b91c1c]"
                              title="Eliminar usuario"
                              aria-label={`Eliminar usuario ${user.username}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="block text-right text-[10px] text-[#94a3b8]">
                          Solo SUPERADMIN
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf1ee] pt-4">
            <span className="text-xs text-[#7e8984]">
              {total} {total === 1 ? 'usuario' : 'usuarios'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-md border border-[#dce5e0] px-2.5 py-1.5 text-xs font-semibold text-[#50615a] transition hover:bg-[#f6f8f7] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs text-[#7e8984]">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-md border border-[#dce5e0] px-2.5 py-1.5 text-xs font-semibold text-[#50615a] transition hover:bg-[#f6f8f7] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editingUser ? 'Editar usuario' : 'Nuevo usuario'} onClose={closeForm}>
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            <Field
              label="Nombre de usuario"
              name="username"
              placeholder="Ej. jgonzalez"
              defaultValue={editingUser?.username}
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-[#334155]">Perfil</span>
              <select
                required
                name="profileId"
                value={formProfileId}
                onChange={(e) => setFormProfileId(e.target.value)}
                className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm text-[#0f172a] outline-none transition focus:border-[#004b93] focus:ring-2 focus:ring-[#004b93]/10"
              >
                <option value="" disabled>
                  Selecciona un perfil
                </option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
            {/* Departamentos: solo para el perfil PROPIETARIO (uno o más) */}
            {formIsOwner && (
              <fieldset>
                <legend className="mb-1.5 text-xs font-bold text-[#334155]">
                  Departamentos <span className="font-normal text-[#94a3b8]">(uno o más)</span>
                </legend>
                {departments.length === 0 ? (
                  <p className="rounded-lg bg-[#fffbeb] p-3 text-[11px] font-semibold text-[#b45309]">
                    Aún no hay departamentos. Créalos primero en el módulo Departamentos.
                  </p>
                ) : (
                  <div className="grid max-h-44 gap-1.5 overflow-y-auto rounded-lg border border-[#cbd5e1] bg-white p-2 sm:grid-cols-2">
                    {departments.map((d) => {
                      const checked = formDepartmentIds.includes(d.id)
                      return (
                        <label
                          key={d.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition ${
                            checked ? 'bg-[#e8f1fa] text-[#004b93]' : 'text-[#334155] hover:bg-[#f8fafc]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setFormDepartmentIds((current) =>
                                checked ? current.filter((id) => id !== d.id) : [...current, d.id]
                              )
                            }
                            className="h-3.5 w-3.5 accent-[#004b93]"
                          />
                          <span className="min-w-0 flex-1 truncate font-semibold">{d.name}</span>
                          {d.location && (
                            <span className="truncate text-[10px] text-[#94a3b8]">{d.location}</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
                <p className="mt-1.5 text-[11px] text-[#64748b]">
                  {formDepartmentIds.length} seleccionado{formDepartmentIds.length === 1 ? '' : 's'}. El propietario solo
                  podrá crear accesos en estos departamentos.
                </p>
              </fieldset>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[#334155]">
                  {editingUser ? 'Nueva contraseña' : 'Contraseña'}
                </span>
                <div className="flex items-center rounded-lg border border-[#cbd5e1] bg-white focus-within:border-[#004b93] focus-within:ring-2 focus-within:ring-[#004b93]/10">
                  <input
                    required={!editingUser}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={editingUser ? undefined : 6}
                    placeholder={editingUser ? 'Dejar vacía para no cambiarla' : ''}
                    className="w-full rounded-lg bg-transparent px-3 py-2.5 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="px-3 text-[#94a3b8] hover:text-[#334155]"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[#334155]">
                  Repetir contraseña
                </span>
                <input
                  required={!editingUser}
                  name="confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={editingUser ? undefined : 6}
                  className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#004b93] focus:ring-2 focus:ring-[#004b93]/10"
                />
              </label>
            </div>
            {formError && (
              <div className="rounded-lg bg-[#fef2f2] p-3 text-xs font-semibold text-[#b91c1c]">
                {formError}
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#004b93] py-3 text-sm font-bold text-white transition hover:bg-[#003870] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={17} />{' '}
              {saving ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </form>
        </Modal>
      )}

      {userToDelete && (
        <ConfirmDialog
          title="Eliminar usuario"
          message={
            <>
              ¿Seguro que quieres eliminar a <strong>{userToDelete.username}</strong>? El usuario
              quedará deshabilitado y no podrá volver a iniciar sesión.
            </>
          }
          loading={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  )
}
