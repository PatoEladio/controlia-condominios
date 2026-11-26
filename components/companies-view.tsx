'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Building2,
  CalendarRange,
  Check,
  CreditCard,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { createCompany, deleteCompany, listCompanies, updateCompany } from '../services/companies'
import { ConfirmDialog, Field, Modal, OptionalField } from './form-modal'
import { stagger } from './motion'

interface Company {
  id: string
  name: string
  location: string
  pageUrl: string
  photoUrl: string
  createdAt?: string
  isActive: boolean
  usersCount?: number
  cardsEnabled?: boolean // ¿entrega tarjetas de acceso en portería? (false en condominios)
  requiresApproval?: boolean // ¿las visitas requieren aprobación de Seguridad? (false en condominios)
  allowsDateRange?: boolean // ¿las visitas pueden valer por un período con inicio y término? (true en condominios)
}

interface CompaniesViewProps {
  // Empresa del usuario conectado: no se puede desactivar a sí misma
  currentCompanyId?: string
  onToast?: (message: string) => void
}

const getErrorMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message
  if (Array.isArray(message)) return message.join(', ')
  return message || fallback
}

// Interruptor con ícono, título y descripción (una opción de configuración de la empresa)
function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: typeof CreditCard
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-200 ${
        checked
          ? 'border-[#004b93] bg-[#e8f1fa]'
          : 'border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:bg-[#f8fafc]'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
          checked ? 'bg-[#004b93] text-white' : 'bg-[#f1f5f9] text-[#94a3b8]'
        }`}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#0f172a]">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-[#64748b]">{description}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#004b93]' : 'bg-[#cbd5e1]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

// Configuraciones típicas: se pueden ajustar una por una después de elegir
const PRESETS = {
  empresa: { cardsEnabled: true, requiresApproval: true, allowsDateRange: false },
  condominio: { cardsEnabled: false, requiresApproval: false, allowsDateRange: true },
} as const

export default function CompaniesView({ currentCompanyId, onToast }: CompaniesViewProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10
  const lastRequest = useRef(0)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [cardsEnabled, setCardsEnabled] = useState<boolean>(PRESETS.empresa.cardsEnabled)
  const [requiresApproval, setRequiresApproval] = useState<boolean>(PRESETS.empresa.requiresApproval)
  const [allowsDateRange, setAllowsDateRange] = useState<boolean>(PRESETS.empresa.allowsDateRange)

  const [toDeactivate, setToDeactivate] = useState<Company | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState('')

  const fetchCompanies = async () => {
    const requestId = ++lastRequest.current
    setLoading(true)
    setError('')
    try {
      const response = await listCompanies(page, pageSize)
      if (requestId !== lastRequest.current) return
      setCompanies(Array.isArray(response?.data) ? response.data : [])
      setTotal(response?.meta?.total ?? 0)
      setTotalPages(Math.max(1, response?.meta?.totalPages ?? 1))
    } catch (err) {
      if (requestId !== lastRequest.current) return
      console.error('Error fetching companies:', err)
      setError(getErrorMessage(err, 'No se pudieron cargar las empresas. Verifica la conexión.'))
    } finally {
      if (requestId === lastRequest.current) setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [page])

  const openForm = (company: Company | null = null) => {
    setEditing(company)
    setCardsEnabled(company ? company.cardsEnabled !== false : PRESETS.empresa.cardsEnabled)
    setRequiresApproval(company ? company.requiresApproval !== false : PRESETS.empresa.requiresApproval)
    setAllowsDateRange(company ? company.allowsDateRange === true : PRESETS.empresa.allowsDateRange)
    setFormError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
  }

  const applyPreset = (preset: keyof typeof PRESETS) => {
    setCardsEnabled(PRESETS[preset].cardsEnabled)
    setRequiresApproval(PRESETS[preset].requiresApproval)
    setAllowsDateRange(PRESETS[preset].allowsDateRange)
  }
  // ¿La configuración actual coincide con alguno de los atajos?
  const currentPreset: keyof typeof PRESETS | null =
    (Object.keys(PRESETS) as (keyof typeof PRESETS)[]).find(
      (key) =>
        PRESETS[key].cardsEnabled === cardsEnabled &&
        PRESETS[key].requiresApproval === requiresApproval &&
        PRESETS[key].allowsDateRange === allowsDateRange
    ) ?? null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const company = {
      name: String(data.get('name') || '').trim(),
      location: String(data.get('location') || '').trim(),
      pageUrl: String(data.get('pageUrl') || '').trim(),
      photoUrl: String(data.get('photoUrl') || '').trim(),
      cardsEnabled,
      requiresApproval,
      allowsDateRange,
    }

    setSaving(true)
    setFormError('')
    try {
      if (editing) {
        await updateCompany(editing.id, company)
        onToast?.('Empresa actualizada correctamente')
        closeForm()
        fetchCompanies()
      } else {
        const password = String(data.get('adminPassword') || '')
        const confirm = String(data.get('adminConfirm') || '')
        if (password.length < 6) {
          setFormError('La contraseña del administrador debe tener al menos 6 caracteres.')
          return
        }
        if (password !== confirm) {
          setFormError('Las contraseñas no coinciden.')
          return
        }
        await createCompany({
          ...company,
          admin: { username: String(data.get('adminUsername') || '').trim(), password },
        })
        onToast?.('Empresa creada con su administrador')
        closeForm()
        if (page === 1) fetchCompanies()
        else setPage(1)
      }
    } catch (err) {
      console.error('Error saving company:', err)
      setFormError(getErrorMessage(err, 'No se pudo guardar la empresa.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!toDeactivate) return
    setDeactivating(true)
    setDeactivateError('')
    try {
      await deleteCompany(toDeactivate.id)
      setToDeactivate(null)
      onToast?.('Empresa desactivada')
      fetchCompanies()
    } catch (err) {
      console.error('Error deactivating company:', err)
      setDeactivateError(getErrorMessage(err, 'No se pudo desactivar la empresa.'))
    } finally {
      setDeactivating(false)
    }
  }

  const handleReactivate = async (company: Company) => {
    try {
      await updateCompany(company.id, { isActive: true })
      onToast?.('Empresa reactivada')
      fetchCompanies()
    } catch (err) {
      console.error('Error reactivating company:', err)
      setError(getErrorMessage(err, 'No se pudo reactivar la empresa.'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-[#64748b]">Empresas que usan la plataforma</p>
          <h2 className="mt-1 text-[27px] font-bold tracking-[-0.04em] text-[#0f172a]">
            Empresas
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCompanies}
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
            <Plus size={16} /> Nueva empresa
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="mb-5">
          <h3 className="text-sm font-bold text-[#0f172a]">Empresas registradas</h3>
          <p className="mt-1 text-xs text-[#64748b]">
            Cada empresa ve solo sus propios usuarios, departamentos, accesos y novedades
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[#fef2f2] p-3 text-xs font-semibold text-[#b91c1c]">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-[#e2e8f0] text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                <th className="pb-3 pl-1">Empresa</th>
                <th className="pb-3">Ubicación</th>
                <th className="pb-3">Usuarios</th>
                <th className="pb-3">Modalidad</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3 pr-1 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-[#64748b]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={15} className="animate-spin text-[#004b93]" />
                      Cargando empresas...
                    </div>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-[#64748b]">
                    No hay empresas registradas.
                  </td>
                </tr>
              ) : (
                companies.map((company, rowIndex) => {
                  const isOwn = company.id === currentCompanyId
                  return (
                    <tr
                      key={company.id}
                      style={stagger(rowIndex)}
                      className={`fa-row border-b border-[#f1f5f9] transition-colors last:border-0 hover:bg-[#f8fafc] ${company.isActive ? '' : 'opacity-60'}`}
                    >
                      <td className="py-3.5 pl-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f1fa] text-[#004b93]">
                            <Building2 size={15} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#0f172a]">
                              {company.name}
                              {isOwn && (
                                <span className="ml-1.5 text-[10px] font-semibold text-[#64748b]">
                                  (tu empresa)
                                </span>
                              )}
                            </p>
                            {company.pageUrl && (
                              <p className="mt-0.5 text-[10px] text-[#94a3b8]">{company.pageUrl}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-xs text-[#475569]">{company.location || '—'}</td>
                      <td className="text-xs text-[#475569]">{company.usersCount ?? '—'}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {company.cardsEnabled !== false && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-[#e8f1fa] px-2 py-0.5 text-[10px] font-bold text-[#004b93]"
                              title="Portería entrega tarjetas de acceso"
                            >
                              <CreditCard size={10} /> Tarjetas
                            </span>
                          )}
                          {company.requiresApproval !== false && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#c2410c]"
                              title="Las visitas requieren aprobación de Seguridad"
                            >
                              <ShieldCheck size={10} /> Seguridad
                            </span>
                          )}
                          {company.allowsDateRange === true && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#15803d]"
                              title="Las visitas pueden valer por un período (inicio y término)"
                            >
                              <CalendarRange size={10} /> Períodos
                            </span>
                          )}
                          {company.cardsEnabled === false &&
                            company.requiresApproval === false &&
                            company.allowsDateRange !== true && (
                              <span className="text-[10px] font-semibold text-[#94a3b8]">Básica</span>
                            )}
                        </div>
                      </td>
                      <td>
                        {company.isActive ? (
                          <span className="rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10px] font-bold text-[#15803d]">
                            Activa
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[10px] font-bold text-[#64748b]">
                            Desactivada
                          </span>
                        )}
                      </td>
                      <td className="pr-1">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openForm(company)}
                            className="rounded-lg p-2 text-[#64748b] transition hover:bg-[#e8f1fa] hover:text-[#004b93]"
                            title="Editar empresa"
                            aria-label={`Editar empresa ${company.name}`}
                          >
                            <Pencil size={14} />
                          </button>
                          {company.isActive ? (
                            !isOwn && (
                              <button
                                onClick={() => {
                                  setDeactivateError('')
                                  setToDeactivate(company)
                                }}
                                className="rounded-lg p-2 text-[#64748b] transition hover:bg-[#fef2f2] hover:text-[#b91c1c]"
                                title="Desactivar empresa"
                                aria-label={`Desactivar empresa ${company.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => handleReactivate(company)}
                              className="rounded-lg p-2 text-[#64748b] transition hover:bg-[#dcfce7] hover:text-[#15803d]"
                              title="Reactivar empresa"
                              aria-label={`Reactivar empresa ${company.name}`}
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf1ee] pt-4">
            <span className="text-xs text-[#7e8984]">
              {total} {total === 1 ? 'empresa' : 'empresas'}
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
        <Modal
          title={editing ? 'Editar empresa' : 'Nueva empresa'}
          size={editing ? 'lg' : 'xl'}
          onClose={closeForm}
          footer={
            <div className="space-y-3">
              {formError && (
                <div
                  role="alert"
                  className="fa-fade-in rounded-lg bg-[#fef2f2] px-3 py-2.5 text-xs font-semibold text-[#b91c1c]"
                >
                  {formError}
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-[#cbd5e1] bg-white px-5 py-2.5 text-sm font-bold text-[#334155] transition hover:bg-[#f1f5f9] disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="company-form"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#004b93] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#003870] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check size={17} />
                  {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear empresa'}
                </button>
              </div>
            </div>
          }
        >
          <form id="company-form" onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
            {/* --- Datos de la empresa --- */}
            <section className="space-y-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                Datos de la empresa
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nombre"
                  name="name"
                  placeholder="Ej. Constructora Andes"
                  defaultValue={editing?.name}
                />
                <Field
                  label="Ubicación"
                  name="location"
                  placeholder="Ej. Santiago"
                  defaultValue={editing?.location}
                />
                <OptionalField
                  label="Sitio web"
                  name="pageUrl"
                  placeholder="empresa.cl"
                  defaultValue={editing?.pageUrl}
                />
                <OptionalField
                  label="URL del logo"
                  name="photoUrl"
                  placeholder="https://..."
                  defaultValue={editing?.photoUrl}
                />
              </div>
            </section>

            {/* --- Modalidad: cómo funciona la portería de esta empresa --- */}
            <section className="space-y-3 border-t border-[#eef2f6] pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                  Modalidad
                </h3>
                {/* Atajos: dejan las tres opciones listas; después se pueden ajustar una por una */}
                <div className="flex gap-1 rounded-lg bg-[#f1f5f9] p-1" role="group" aria-label="Tipo de empresa">
                  {(
                    [
                      ['empresa', 'Empresa'],
                      ['condominio', 'Condominio'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={currentPreset === key}
                      onClick={() => applyPreset(key)}
                      className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                        currentPreset === key
                          ? 'bg-white text-[#004b93] shadow-sm'
                          : 'text-[#64748b] hover:text-[#0f172a]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <ToggleRow
                icon={ShieldCheck}
                title="Usa Seguridad"
                description={
                  requiresApproval
                    ? 'Cada visita queda pendiente hasta que Seguridad la apruebe o rechace.'
                    : 'Las visitas quedan aprobadas al crearlas: solo se agregan y se ve cuándo llegan.'
                }
                checked={requiresApproval}
                onChange={setRequiresApproval}
              />
              <ToggleRow
                icon={CreditCard}
                title="Entrega tarjetas de acceso"
                description={
                  cardsEnabled
                    ? 'En portería se asigna una tarjeta (1 al 10) a cada visita.'
                    : 'Portería confirma el ingreso sin pedir tarjeta.'
                }
                checked={cardsEnabled}
                onChange={setCardsEnabled}
              />
              <ToggleRow
                icon={CalendarRange}
                title="Visitas por período"
                description={
                  allowsDateRange
                    ? 'Se indica fecha de inicio y de término (ej. arriendos): puede entrar cualquier día del período.'
                    : 'Cada visita vale un solo día.'
                }
                checked={allowsDateRange}
                onChange={setAllowsDateRange}
              />
            </section>

            {/* --- Administrador inicial (solo al crear) --- */}
            {!editing && (
              <section className="space-y-4 border-t border-[#eef2f6] pt-5">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                    Administrador inicial
                  </h3>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Se crea un usuario ADMIN para que la empresa pueda empezar a operar.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Usuario" name="adminUsername" placeholder="Ej. admin.andes" />
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#334155]">Contraseña</span>
                    <input
                      required
                      name="adminPassword"
                      type="password"
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Mín. 6 caracteres"
                      className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#004b93] focus:ring-2 focus:ring-[#004b93]/10"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#334155]">
                      Repetir contraseña
                    </span>
                    <input
                      required
                      name="adminConfirm"
                      type="password"
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#004b93] focus:ring-2 focus:ring-[#004b93]/10"
                    />
                  </label>
                </div>
              </section>
            )}
          </form>
        </Modal>
      )}

      {toDeactivate && (
        <ConfirmDialog
          title="Desactivar empresa"
          message={
            <>
              ¿Seguro que quieres desactivar <strong>{toDeactivate.name}</strong>? Sus{' '}
              {toDeactivate.usersCount ?? ''} usuarios perderán el acceso de inmediato. Podrás
              reactivarla después.
            </>
          }
          confirmLabel="Desactivar"
          loadingLabel="Desactivando..."
          loading={deactivating}
          error={deactivateError}
          onConfirm={handleDeactivate}
          onCancel={() => setToDeactivate(null)}
        />
      )}
    </div>
  )
}
