'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, MapPin, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { createDepartment, deleteDepartment, getDepartments, updateDepartment } from '../services/departments'
import { ConfirmDialog, Field, Modal, OptionalField } from './form-modal'
import { stagger } from './motion'

export interface Department {
  id: string
  name: string
  location?: string
  companyId?: string
}

interface DepartmentsViewProps {
  onChange?: () => void
  onToast?: (message: string) => void
}

const getErrorMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message
  if (Array.isArray(message)) return message.join(', ')
  return message || fallback
}

export default function DepartmentsView({ onChange, onToast }: DepartmentsViewProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  // Formulario crear/editar
  const [showForm, setShowForm] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Confirmación de eliminación
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const fetchDepartments = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getDepartments()
      const list: Department[] = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : []
      setDepartments(list)
    } catch (err) {
      console.error('Error fetching departments:', err)
      setError('No se pudieron cargar los departamentos. Verifica la conexión.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDepartments()
  }, [])

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return departments
    return departments.filter((z) => (z.name || '').toLowerCase().includes(query))
  }, [departments, search])

  const openCreate = () => {
    setEditingDepartment(null)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (department: Department) => {
    setEditingDepartment(department)
    setFormError('')
    setShowForm(true)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') || '').trim()
    const location = String(data.get('location') || '').trim()
    if (!name) return

    setSaving(true)
    setFormError('')
    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, { name, location })
        onToast?.('Departamento actualizado correctamente')
      } else {
        await createDepartment({ name, location })
        onToast?.('Departamento creado correctamente')
      }
      setShowForm(false)
      setEditingDepartment(null)
      await fetchDepartments()
      onChange?.()
    } catch (err) {
      console.error('Error saving department:', err)
      setFormError(getErrorMessage(err, 'No se pudo guardar el departamento.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!departmentToDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteDepartment(departmentToDelete.id)
      setDepartmentToDelete(null)
      onToast?.('Departamento eliminado')
      await fetchDepartments()
      onChange?.()
    } catch (err) {
      console.error('Error deleting department:', err)
      setDeleteError(
        getErrorMessage(
          err,
          'No se pudo eliminar el departamento. Puede tener accesos asociados.'
        )
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-[#64748b]">
            Crea los departamentos del condominio y asígnalos a sus propietarios
          </p>
          <h2 className="mt-1 text-[27px] font-bold tracking-[-0.04em] text-[#0f172a]">
            Departamentos
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchDepartments}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-xs font-bold text-[#334155] shadow-sm transition hover:bg-[#f8fafc] disabled:opacity-50"
            title="Refrescar lista"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#004b93]' : ''} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#004b93] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#003870]"
          >
            <Plus size={16} /> Nuevo departamento
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-bold text-[#0f172a]">Departamentos registrados</h3>
            <p className="mt-1 text-xs text-[#64748b]">
              {departments.length} {departments.length === 1 ? 'departamento' : 'departamentos'} en total
            </p>
          </div>
          <div className="flex min-w-[220px] items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 focus-within:border-[#004b93] focus-within:ring-2 focus-within:ring-[#004b93]/10">
            <Search size={15} className="text-[#94a3b8]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar departamento..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-[#94a3b8]"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[#fef2f2] p-3 text-xs font-semibold text-[#b91c1c]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-[#64748b]">
            <RefreshCw size={15} className="animate-spin text-[#004b93]" />
            Cargando departamentos...
          </div>
        ) : filteredDepartments.length === 0 ? (
          <p className="py-10 text-center text-xs text-[#64748b]">
            {departments.length === 0
              ? 'Aún no hay departamentos registrados. Crea el primero con "Nuevo departamento".'
              : 'No se encontraron departamentos para la búsqueda.'}
          </p>
        ) : (
          <ul className="divide-y divide-[#f1f5f9]">
            {filteredDepartments.map((department, rowIndex) => (
              <li
                key={department.id}
                style={stagger(rowIndex)}
                className="fa-row flex items-center gap-3 py-3 transition-colors hover:bg-[#f8fafc]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f1fa] text-[#004b93]">
                  <MapPin size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#0f172a]">{department.name}</p>
                  {department.location && (
                    <p className="mt-0.5 truncate text-xs text-[#64748b]">{department.location}</p>
                  )}
                </div>
                <button
                  onClick={() => openEdit(department)}
                  className="rounded-lg p-2 text-[#64748b] transition hover:bg-[#e8f1fa] hover:text-[#004b93]"
                  title="Editar departamento"
                  aria-label={`Editar departamento ${department.name}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => {
                    setDeleteError('')
                    setDepartmentToDelete(department)
                  }}
                  className="rounded-lg p-2 text-[#64748b] transition hover:bg-[#fef2f2] hover:text-[#b91c1c]"
                  title="Eliminar departamento"
                  aria-label={`Eliminar departamento ${department.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showForm && (
        <Modal
          title={editingDepartment ? 'Editar departamento' : 'Nuevo departamento'}
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            <Field
              label="Nombre del departamento"
              name="name"
              placeholder="Ej. Depto 101"
              defaultValue={editingDepartment?.name}
            />
            <OptionalField
              label="Torre / ubicación"
              name="location"
              placeholder="Ej. Torre A, piso 1"
              defaultValue={editingDepartment?.location}
            />
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
              <Check size={17} />
              {saving ? 'Guardando...' : editingDepartment ? 'Guardar cambios' : 'Crear departamento'}
            </button>
          </form>
        </Modal>
      )}

      {departmentToDelete && (
        <ConfirmDialog
          title="Eliminar departamento"
          message={
            <>
              ¿Seguro que quieres eliminar el departamento <strong>{departmentToDelete.name}</strong>?
              Esta acción no se puede deshacer.
            </>
          }
          loading={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setDepartmentToDelete(null)}
        />
      )}
    </div>
  )
}
