import { useEffect, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Plus,
  ShieldX,
  UserRound,
  UsersRound,
} from 'lucide-react'
import Stat from './stat'
import { stagger } from './motion'
import { VisitStatusBadge } from './visit-status'
import { getInsideQty, getLastVisitors, getTodayQty, getTotalQty } from '../services/visitors'

type Module = 'inicio' | 'accesos' | 'novedades' | 'negra'

interface Visitor {
  id: string
  name: string
  lastnames: string
  run: string
  date: string
  departmentId: string
  isInside: boolean
  arrivalHour: string
  exitHour: string
  status?: string // APROBADA | CERRADA (la persona no llegó)
  rejectionReason?: string | null
  department: {
    id: string
    name: string
  }
}

interface NoteItem {
  id: string
  time: string
  text: string
  visitor: string
  guard: string
  date: string
}

interface HomeProps {
  notes: NoteItem[]
  onAddVisit: () => void
  onAddNote: () => void
  onNavigate: (module: Module) => void
}

export default function Home({ notes, onAddVisit, onAddNote, onNavigate }: HomeProps) {
  // Variables para manejar la info que se muestra en los stats del Home
  const [totalVisitsQty, setTotalVisitsQty] = useState(0)
  const [todayQty, setTodayQty] = useState(0)
  const [insideQty, setInsideQty] = useState(0)
  const [lastVisitors, setLastVisitors] = useState<Visitor[]>([])

  useEffect(() => {
    getTotalQty()
      .then((data) => setTotalVisitsQty(data?.totalVisitorsQty ?? 0))
      .catch((err) => console.error('Error fetching total quantity:', err))

    getTodayQty()
      .then((data) => setTodayQty(data?.todayQty ?? 0))
      .catch((err) => console.error('Error fetching today quantity:', err))

    getInsideQty()
      .then((data) => setInsideQty(data?.personsInsideQty ?? 0))
      .catch((err) => console.error('Error fetching inside quantity:', err))

    getLastVisitors()
      .then((data) => {
        if (Array.isArray(data)) {
          setLastVisitors(data)
        }
      })
      .catch((err) => console.error('Error fetching last visitors:', err))
  }, [])

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-[#64748b]">Resumen de la jornada</p>
          <h2 className="mt-1 text-[27px] font-bold tracking-[-0.04em] text-[#0f172a]">
            Panel de control
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAddNote}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-xs font-bold text-[#334155] shadow-sm transition hover:bg-[#f8fafc]"
          >
            <BookOpen size={15} /> Registrar novedad
          </button>
          <button
            onClick={onAddVisit}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#004b93] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#003870]"
          >
            <Plus size={16} /> Agregar acceso
          </button>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Accesos históricos"
          value={totalVisitsQty.toString()}
          icon={UsersRound}
          tone="blue"
          index={0}
        />
        <Stat
          label="Entradas de hoy"
          value={todayQty.toString()}
          icon={ArrowDownToLine}
          tone="sky"
          index={1}
        />
        <Stat
          label="Personas en el condominio"
          value={insideQty.toString()}
          change="Ahora"
          icon={UserRound}
          tone="navy"
          index={2}
        />
        <Stat
          label="Personas bloqueadas"
          value="3"
          change="Activas"
          icon={ShieldX}
          tone="red"
          index={3}
        />
      </div>

      {/* Secciones de actividad y novedades */}
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {/* Actividad reciente */}
        <section className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0f172a]">Actividad reciente</h3>
              <p className="mt-1 text-xs text-[#64748b]">
                Últimos ingresos registrados para el día de hoy
              </p>
            </div>
            <button
              onClick={() => onNavigate('accesos')}
              className="flex items-center gap-1 text-xs font-bold text-[#004b93] hover:underline"
            >
              Ver todos <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[570px] text-left">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                  <th className="pb-3 pl-1">Visitante</th>
                  <th className="pb-3">Departamento</th>
                  <th className="pb-3">Llegada</th>
                  <th className="pb-3">Salida</th>
                  <th className="pb-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {lastVisitors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-xs text-[#94a3b8]"
                    >
                      No hay registros recientes para mostrar.
                    </td>
                  </tr>
                ) : (
                  lastVisitors.map((visit, rowIndex) => {
                    const initial1 = visit.name?.[0] || 'V'
                    const initial2 = visit.lastnames?.[0] || ''
                    return (
                      <tr
                        key={visit.id}
                        style={stagger(rowIndex)}
                        className="fa-row border-b border-[#f1f5f9] transition-colors last:border-0 hover:bg-[#f8fafc]"
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
                          {visit.department?.name || '—'}
                        </td>
                        <td className="text-xs text-[#475569]">
                          {visit.arrivalHour || '—'}
                        </td>
                        <td className="text-xs text-[#475569]">
                          {visit.exitHour || '—'}
                        </td>
                        <td>
                          {/* Si el acceso se cerró (la persona no llegó) se muestra ese estado en vez de "No ha llegado" */}
                          {visit.status && visit.status !== 'APROBADA' && !visit.arrivalHour ? (
                            <VisitStatusBadge
                              status={visit.status}
                              title={visit.rejectionReason ? `Motivo: ${visit.rejectionReason}` : undefined}
                            />
                          ) : (
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-bold ${visit.isInside
                                  ? 'bg-[#e0f2fe] text-[#0284c7]'
                                  : 'bg-[#f1f5f9] text-[#64748b]'
                                }`}
                            >
                              {visit.isInside
                                ? 'Dentro'
                                : !visit.arrivalHour
                                  ? 'No ha llegado'
                                  : 'Salió'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Libro de novedades */}
        <section className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0f172a]">Libro de novedades</h3>
              <p className="mt-1 text-xs text-[#64748b]">Registro de hoy</p>
            </div>
            <button
              onClick={() => onNavigate('novedades')}
              className="text-xs font-bold text-[#004b93] hover:underline"
            >
              Ver libro
            </button>
          </div>
          <div className="space-y-4">
            {notes.length === 0 && (
              <p className="py-6 text-center text-xs text-[#94a3b8]">
                No hay novedades registradas hoy.
              </p>
            )}
            {notes.slice(0, 3).map((note, noteIndex) => (
              <div
                key={note.id}
                style={stagger(noteIndex + 2)}
                className="fa-row flex gap-3"
              >
                <div className="flex w-12 shrink-0 flex-col items-center">
                  <span className="text-[11px] font-bold text-[#64748b]">
                    {note.time}
                  </span>
                  <span className="mt-2 h-full w-px bg-[#cbd5e1]" />
                </div>
                <div className="pb-1">
                  <p className="text-xs font-bold text-[#0f172a]">{note.text}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#64748b]">
                    {note.visitor ? `Visita: ${note.visitor} · ` : ''}Registrado por {note.guard}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

