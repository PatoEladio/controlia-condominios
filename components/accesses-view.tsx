'use client'

import { useEffect, useRef, useState } from 'react'
import { Ban, CalendarDays, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { deleteVisitor, findAllByDate } from '../services/visitors'
import { ConfirmDialog } from './form-modal'
import { stagger } from './motion'
import { isPeriodVisit } from './visit-period'
import { VisitStatusBadge } from './visit-status'

export interface ApiVisitor {
  id: string
  arrivalHour: string | null
  createdAt: string
  date: string
  startHour: string // hora de llegada
  exitHour: string | null
  cardNumber?: number | null // tarjeta entregada en portería
  status?: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CERRADA' // CERRADA: la persona no llegó (se cierra a las 00:00)
  rejectionReason?: string | null
  usesCard?: boolean // false: ingresa sin tarjeta
  endDate?: string | null // último día de la visita (mayor que date en visitas por período)
  isArrivalValidated: boolean
  isExitValidated: boolean
  isInside: boolean
  lastnames: string
  name: string
  run: string
  creator?: {
    id: string
    username: string
  }
  departmentId?: string
  companyId?: string
  department?: {
    id: string
    name: string
  }
  company?: {
    id: string
    name: string
  }
}

interface AccessesViewProps {
  onAdd?: () => void
  onEdit?: (visitor: ApiVisitor) => void
  onToast?: (message: string) => void
  canCreate?: boolean // mostrar "Agregar acceso" (ADMIN y PROPIETARIO)
  canManage?: boolean // mostrar editar / eliminar (solo ADMIN)
  showCards?: boolean // mostrar la columna Tarjeta (false si el condominio no entrega tarjetas)
}


function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf1ee] pt-4">
      <span className="text-xs text-[#7e8984]">
        {total} {total === 1 ? 'registro' : 'registros'}
      </span>
      <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
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
        onClick={() => onPageChange(page + 1)}
        className="rounded-md border border-[#dce5e0] px-2.5 py-1.5 text-xs font-semibold text-[#50615a] transition hover:bg-[#f6f8f7] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Siguiente
      </button>
      </div>
    </div>
  )
}

// Fecha de hoy en formato YYYY-MM-DD (zona horaria de Chile)
const getTodayISO = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

export default function AccessesView({
  onAdd,
  onEdit,
  onToast,
  canCreate = true,
  canManage = false,
  showCards = true,
}: AccessesViewProps) {
  const todayStr = getTodayISO()
  const [visitors, setVisitors] = useState<ApiVisitor[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [startDate, setStartDate] = useState<string>(todayStr)
  const [endDate, setEndDate] = useState<string>(todayStr)
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [total, setTotal] = useState<number>(0)
  const pageSize = 10
  const lastRequest = useRef(0)
  const [visitorToDelete, setVisitorToDelete] = useState<ApiVisitor | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const columns = (canManage ? 9 : 8) - (showCards ? 0 : 1)

  const handleDelete = async () => {
    if (!visitorToDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteVisitor(visitorToDelete.id)
      setVisitorToDelete(null)
      // Si era el último registro de la página, volver a la anterior
      if (visitors.length === 1 && page > 1) setPage(page - 1)
      else fetchVisitors()
      onToast?.('Acceso eliminado')
    } catch (err) {
      console.error('Error deleting visitor:', err)
      setDeleteError('No se pudo eliminar el acceso. Intenta nuevamente.')
    } finally {
      setDeleting(false)
    }
  }


  const fetchVisitors = async () => {
    const requestId = ++lastRequest.current
    setLoading(true)
    setError('')
    try {
      const response = await findAllByDate(
        startDate || undefined,
        endDate || undefined,
        page,
        pageSize,
        debouncedSearch || undefined
      )
      // Ignora respuestas de peticiones anteriores (ej. cambio rápido de página o filtro)
      if (requestId !== lastRequest.current) return
      const list: ApiVisitor[] = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : []
      setVisitors(list)
      setTotal(response?.meta?.total ?? list.length)
      setTotalPages(Math.max(1, response?.meta?.totalPages ?? 1))
    } catch (err) {
      if (requestId !== lastRequest.current) return
      console.error('Error fetching visitors:', err)
      setError('No se pudieron cargar los accesos. Verifica la conexión.')
    } finally {
      if (requestId === lastRequest.current) setLoading(false)
    }
  }

  // Espera a que el usuario deje de escribir antes de buscar en la API
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400)
    return () => window.clearTimeout(timer)
  }, [search])

  // Al cambiar filtros o búsqueda se vuelve a la primera página
  useEffect(() => {
    setPage(1)
  }, [startDate, endDate, debouncedSearch])

  useEffect(() => {
    fetchVisitors()
  }, [startDate, endDate, debouncedSearch, page])

  const pagedVisitors = visitors

  const getStatusBadge = (visitor: ApiVisitor) => {
    // Si el acceso se cerró (la persona no llegó) ese es el estado relevante
    if (visitor.status && visitor.status !== 'APROBADA' && !visitor.isArrivalValidated) {
      return (
        <VisitStatusBadge
          status={visitor.status}
          title={visitor.rejectionReason ? `Motivo: ${visitor.rejectionReason}` : undefined}
        />
      )
    }
    if (visitor.isInside) {
      return (
        <span className="rounded-full bg-[#e0f2fe] px-2.5 py-1 text-[10px] font-bold text-[#0284c7]">
          Dentro
        </span>
      )
    }
    if (!visitor.arrivalHour && !visitor.isArrivalValidated) {
      return (
        <span className="rounded-full bg-[#fef3c7] px-2.5 py-1 text-[10px] font-bold text-[#b45309]">
          Por llegar
        </span>
      )
    }
    return (
      <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[10px] font-bold text-[#64748b]">
        Salió
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-[#64748b]">
            Consulta y administra los accesos e ingresos registrados
          </p>
          <h2 className="mt-1 text-[27px] font-bold tracking-[-0.04em] text-[#0f172a]">
            Accesos
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchVisitors}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-xs font-bold text-[#334155] shadow-sm transition hover:bg-[#f8fafc] disabled:opacity-50"
            title="Refrescar lista"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#004b93]' : ''} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
          {canCreate && onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#004b93] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#003870]"
            >
              <Plus size={16} /> Agregar acceso
            </button>
          )}
        </div>

      </div>

      {/* Contenedor de la tabla */}
      <div className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {/* Barra de Filtros */}
        <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h3 className="text-sm font-bold text-[#0f172a]">Historial de accesos</h3>
            <p className="mt-1 text-xs text-[#64748b]">
              Registros obtenidos en tiempo real{' '}
              <span className="sm:hidden">· Desliza para ver más</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Fecha Desde */}
            <label className="flex items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#475569] focus-within:border-[#004b93]">
              <CalendarDays size={15} className="text-[#004b93]" />
              <span className="text-[11px] text-[#64748b]">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-semibold outline-none"
              />
            </label>

            {/* Filtro Fecha Hasta */}
            <label className="flex items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#475569] focus-within:border-[#004b93]">
              <CalendarDays size={15} className="text-[#004b93]" />
              <span className="text-[11px] text-[#64748b]">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-semibold outline-none"
              />
            </label>

            {/* Botón Ver Hoy si no está seleccionado */}
            {(startDate !== todayStr || endDate !== todayStr) && (
              <button
                onClick={() => {
                  setStartDate(todayStr)
                  setEndDate(todayStr)
                }}
                className="rounded-lg border border-[#004b93] bg-[#e8f1fa] px-2.5 py-2 text-xs font-semibold text-[#004b93] hover:bg-[#dbeafe]"
              >
                Ver hoy
              </button>
            )}

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="rounded-lg border border-[#cbd5e1] px-2.5 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#f8fafc]"
              >
                Todas las fechas
              </button>
            )}


            {/* Buscador */}
            <div className="flex min-w-[220px] items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 focus-within:border-[#004b93] focus-within:ring-2 focus-within:ring-[#004b93]/10">
              <Search size={15} className="text-[#94a3b8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nombre o RUT..."
                className="w-full bg-transparent text-xs outline-none placeholder:text-[#94a3b8]"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[#fef2f2] p-3 text-xs font-semibold text-[#b91c1c]">
            {error}
          </div>
        )}

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-[#e2e8f0] text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                <th className="pb-3 pl-1">Visitante</th>
                <th className="pb-3">Departamento</th>
                <th className="pb-3">Fecha</th>
                <th className="pb-3">Hora de llegada</th>
                <th className="pb-3">Llegada</th>
                <th className="pb-3">Salida</th>
                {showCards && <th className="pb-3">Tarjeta</th>}
                <th className="pb-3">Estado</th>
                {canManage && <th className="pb-3 pr-1 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns}
                    className="py-10 text-center text-xs text-[#64748b]"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={15} className="animate-spin text-[#004b93]" />
                      Cargando accesos...
                    </div>
                  </td>
                </tr>
              ) : pagedVisitors.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns}
                    className="py-10 text-center text-xs text-[#64748b]"
                  >
                    No se encontraron accesos registrados para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                pagedVisitors.map((visit, rowIndex) => {
                  const initial1 = visit.name?.[0] || 'V'
                  const initial2 = visit.lastnames?.[0] || ''
                  return (
                    <tr
                      key={visit.id}
                      style={stagger(rowIndex)}
                      className="fa-row border-b border-[#f1f5f9] transition-colors hover:bg-[#f8fafc] last:border-0"
                    >
                      <td className="py-3.5 pl-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f1fa] text-[10px] font-bold text-[#004b93]">
                            {initial1}
                            {initial2}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#0f172a]">
                              {visit.name} {visit.lastnames}
                            </p>
                            <p className="mt-0.5 text-[10px] text-[#94a3b8]">
                              {visit.run}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs text-[#475569]">
                        <p className="font-semibold text-[#0f172a]">
                          {visit.department?.name || '—'}
                        </p>
                      </td>
                      <td className="text-xs text-[#475569]">
                        {isPeriodVisit(visit) ? (
                          <>
                            <p className="font-semibold text-[#0f172a]">{visit.date}</p>
                            <p className="text-[10px] text-[#15803d]" title="Acceso por período">
                              → {visit.endDate}
                            </p>
                          </>
                        ) : (
                          visit.date
                        )}
                      </td>
                      <td className="text-xs text-[#475569]">
                        {isPeriodVisit(visit)
                          ? 'Todo el período'
                          : visit.startHour
                            ? visit.startHour.slice(0, 5)
                            : '—'}
                      </td>
                      <td className="text-xs text-[#475569]">
                        {visit.arrivalHour || '—'}
                      </td>
                      <td className="text-xs text-[#475569]">
                        {visit.exitHour || '—'}
                      </td>
                      {showCards && (
                        <td className="text-xs text-[#475569]">
                          {visit.cardNumber ? (
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                visit.isInside
                                  ? 'bg-[#e0f2fe] text-[#0284c7]'
                                  : 'bg-[#f1f5f9] text-[#64748b]'
                              }`}
                              title={visit.isInside ? 'Tarjeta en uso' : 'Tarjeta devuelta'}
                            >
                              N° {visit.cardNumber}
                            </span>
                          ) : visit.usesCard === false ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#64748b]"
                              title="Este acceso ingresa sin tarjeta"
                            >
                              <Ban size={10} /> Sin tarjeta
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                      <td>{getStatusBadge(visit)}</td>
                      {canManage && (
                        <td className="pr-1">
                          <div className="flex justify-end gap-1">
                            {onEdit && (
                              <button
                                onClick={() => onEdit(visit)}
                                className="rounded-lg p-2 text-[#64748b] transition hover:bg-[#e8f1fa] hover:text-[#004b93]"
                                title="Editar acceso"
                                aria-label={`Editar acceso de ${visit.name}`}
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setDeleteError('')
                                setVisitorToDelete(visit)
                              }}
                              className="rounded-lg p-2 text-[#64748b] transition hover:bg-[#fef2f2] hover:text-[#b91c1c]"
                              title="Eliminar acceso"
                              aria-label={`Eliminar acceso de ${visit.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>


        {/* Paginación */}
        {!loading && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        )}
      </div>

      {visitorToDelete && (
        <ConfirmDialog
          title="Eliminar acceso"
          message={
            <>
              ¿Seguro que quieres eliminar el acceso de{' '}
              <strong>
                {visitorToDelete.name} {visitorToDelete.lastnames}
              </strong>{' '}
              del {visitorToDelete.date}? Esta acción no se puede deshacer.
            </>
          }
          loading={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setVisitorToDelete(null)}
        />
      )}
    </div>
  )
}

