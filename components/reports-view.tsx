'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Download, FileBarChart, RefreshCw } from 'lucide-react'
import { getVisitorsReport } from '../services/visitors'
import { getCurrentUser } from '../services/auth'
import { VisitStatus } from './visit-status'
import { stagger } from './motion'
import { isPeriodVisit } from './visit-period'

interface ReportVisitor {
  id: string
  name: string
  lastnames: string
  run: string
  date: string
  endDate?: string | null
  startHour: string // hora de llegada
  arrivalHour?: string | null
  exitHour?: string | null
  cardNumber?: number | null
  usesCard?: boolean // false: ingresó sin tarjeta
  isInside: boolean
  isArrivalValidated: boolean
  isExitValidated: boolean
  status: VisitStatus
  createdAt: string
  department?: { id: string; name: string } | null
  creator?: { id: string; username: string } | null
}

interface Report {
  range: { startDate: string; endDate: string }
  summary: {
    total: number
    arrived: number
    exited: number
    inside: number
    noShow: number
    closed?: number
  }
  byDay: { date: string; total: number; arrived: number }[]
  byDepartment: { department: string; total: number; arrived: number }[]
  data: ReportVisitor[]
  truncated: boolean
}

const TIMEZONE = 'America/Santiago'
const getTodayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
const getMonthStartISO = () => `${getTodayISO().slice(0, 8)}01`

const getErrorMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message
  if (Array.isArray(message)) return message.join(', ')
  return message || fallback
}

const hour = (value?: string | null) => (value ? value.slice(0, 5) : '')
const dateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('es-CL', { timeZone: TIMEZONE }) : ''
const shortDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

// Atajos de rango
const PRESETS: { label: string; range: () => [string, string] }[] = [
  { label: 'Hoy', range: () => [getTodayISO(), getTodayISO()] },
  {
    label: 'Últimos 7 días',
    range: () => {
      const end = new Date(`${getTodayISO()}T12:00:00`)
      const start = new Date(end)
      start.setDate(end.getDate() - 6)
      return [start.toISOString().slice(0, 10), getTodayISO()]
    },
  },
  { label: 'Este mes', range: () => [getMonthStartISO(), getTodayISO()] },
]

// ---------------------------------------------------------------------------
// Exportación a PDF (jsPDF + jspdf-autotable). Se cargan solo al exportar para no
// agregar peso a la página. A4 horizontal: encabezado, resumen, por departamento y detalle.
// ---------------------------------------------------------------------------
const BRAND: [number, number, number] = [0, 75, 147] // #004b93
const INK: [number, number, number] = [15, 23, 42] // #0f172a
const MUTED: [number, number, number] = [100, 116, 139] // #64748b

const downloadPdf = async (report: Report, showCards: boolean) => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 12
  const companyName = getCurrentUser()?.company?.name
  const generatedAt = new Date().toLocaleString('es-CL', { timeZone: TIMEZONE })
  // Posición vertical donde terminó la última tabla
  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0

  // Encabezado
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, pageWidth, 4, 'F')
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Reporte de accesos', margin, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(
    `${companyName ? `${companyName} · ` : ''}Del ${report.range.startDate} al ${report.range.endDate}`,
    margin,
    22
  )
  doc.text(`Generado: ${generatedAt}`, pageWidth - margin, 16, { align: 'right' })
  doc.text('FEMAccess', pageWidth - margin, 22, { align: 'right' })

  // Resumen
  const s = report.summary
  autoTable(doc, {
    startY: 28,
    margin: { left: margin, right: margin },
    head: [['Accesos', 'Ingresaron', 'Salieron', 'Dentro', 'No se presentaron']],
    body: [[s.total, s.arrived, s.exited, s.inside, s.noShow].map(String)],
    theme: 'grid',
    styles: { fontSize: 9, halign: 'center', cellPadding: 2.2, textColor: INK },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    bodyStyles: { fontStyle: 'bold', fontSize: 11 },
  })

  // Por departamento
  if (report.byDepartment.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...INK)
    doc.text('Por departamento', margin, lastY() + 9)
    autoTable(doc, {
      startY: lastY() + 12,
      margin: { left: margin, right: margin },
      tableWidth: 120,
      head: [['Departamento', 'Accesos', 'Ingresos']],
      body: report.byDepartment.map((d) => [d.department, String(d.total), String(d.arrived)]),
      theme: 'striped',
      styles: { fontSize: 8.5, cellPadding: 1.8, textColor: INK },
      headStyles: { fillColor: BRAND, textColor: 255 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    })
  }

  // Detalle
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text(`Detalle de accesos (${report.data.length})`, margin, lastY() + 9)
  autoTable(doc, {
    startY: lastY() + 12,
    margin: { left: margin, right: margin, bottom: 14 },
    head: [[
      'Fecha', 'Visitante', 'RUN', 'Departamento', 'Registrado por', 'Hora de llegada',
      'Llegada', 'Salida', ...(showCards ? ['Tarjeta'] : []),
    ]],
    body: report.data.map((v) => [
      isPeriodVisit(v) ? `${v.date}\n→ ${v.endDate}` : v.date,
      `${v.name} ${v.lastnames}`,
      v.run,
      v.department?.name ?? '—',
      v.creator?.username ?? '—',
      hour(v.startHour) || '—',
      hour(v.arrivalHour) || '—',
      hour(v.exitHour) || '—',
      ...(showCards
        ? [v.cardNumber ? String(v.cardNumber) : v.usesCard === false ? 'Sin tarjeta' : '—']
        : []),
    ]),
    theme: 'striped',
    styles: { fontSize: 7.5, cellPadding: 1.6, textColor: INK, overflow: 'linebreak' },
    headStyles: { fillColor: BRAND, textColor: 255, fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 38 },
      2: { cellWidth: 20 },
      5: { cellWidth: 22 },
      6: { cellWidth: 16 },
      7: { cellWidth: 16 },
      ...(showCards ? { 8: { cellWidth: 16, halign: 'center' as const } } : {}),
    },
  })

  // Pie con número de página
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'right' }
    )
  }

  doc.save(`reporte-accesos_${report.range.startDate}_${report.range.endDate}.pdf`)
}

// ---------------------------------------------------------------------------
// Gráfico de una sola serie: visitas por día (barras delgadas, tooltip al pasar el mouse)
// ---------------------------------------------------------------------------
function VisitsByDayChart({ data }: { data: Report['byDay'] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.total))
  const active = hovered !== null ? data[hovered] : null

  return (
    <div>
      <div className="relative flex h-44 items-end gap-[2px] border-b border-[#e2e8f0]">
        {/* Línea de referencia del máximo (recesiva) */}
        <span className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-[#eef2f6]" />
        <span className="pointer-events-none absolute -top-2 right-0 bg-white pl-1 text-[10px] text-[#94a3b8]">
          {max}
        </span>
        {data.map((d, i) => (
          <div
            key={d.date}
            className="flex h-full min-w-0 flex-1 cursor-default items-end justify-center"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            tabIndex={0}
            aria-label={`${d.date}: ${d.total} accesos, ${d.arrived} ingresos`}
          >
            <div
              className={`fa-grow w-full max-w-[28px] rounded-t-[4px] transition-colors ${
                hovered === i ? 'bg-[#003870]' : 'bg-[#004b93]'
              }`}
              style={{ ...stagger(i, 30), height: `${Math.max(2, (d.total / max) * 100)}%` }}
            />
          </div>
        ))}

        {active && hovered !== null && (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-[11px] shadow-lg"
            style={{ left: `${((hovered + 0.5) / data.length) * 100}%` }}
          >
            <p className="font-bold text-[#0f172a]">{active.date}</p>
            <p className="text-[#475569]">
              {active.total} {active.total === 1 ? 'acceso' : 'accesos'} · {active.arrived} ingresos
            </p>
          </div>
        )}
      </div>
      {/* Eje X: primera, del medio y última fecha para no saturar */}
      <div className="mt-1.5 flex justify-between text-[10px] text-[#94a3b8]">
        <span>{data[0] ? shortDay(data[0].date) : ''}</span>
        {data.length > 2 && <span>{shortDay(data[Math.floor(data.length / 2)].date)}</span>}
        <span>{data.length > 1 ? shortDay(data[data.length - 1].date) : ''}</span>
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  hint,
  index = 0,
}: {
  label: string
  value: number
  hint?: string
  index?: number
}) {
  return (
    <div
      style={stagger(index)}
      className="fa-fade-up fa-lift rounded-xl border border-[#e2e8f0] bg-white p-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#0f172a]">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-[#64748b]">{hint}</p>}
    </div>
  )
}

export default function ReportsView({ showCards = true }: { showCards?: boolean }) {
  const [startDate, setStartDate] = useState(getMonthStartISO())
  const [endDate, setEndDate] = useState(getTodayISO())
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [showDayTable, setShowDayTable] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 15

  const generate = async (start = startDate, end = endDate) => {
    if (!start || !end) {
      setError('Selecciona la fecha de inicio y de término.')
      return
    }
    if (end < start) {
      setError('La fecha de término no puede ser anterior a la de inicio.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result: Report = await getVisitorsReport(start, end)
      setReport(result)
      setPage(1)
    } catch (err) {
      console.error('Error generating report:', err)
      setError(getErrorMessage(err, 'No se pudo generar el reporte.'))
    } finally {
      setLoading(false)
    }
  }

  // Genera el reporte del mes al entrar
  useEffect(() => {
    generate()
  }, [])

  const applyPreset = (range: [string, string]) => {
    setStartDate(range[0])
    setEndDate(range[1])
    generate(range[0], range[1])
  }

  const handleExportPdf = async () => {
    if (!report) return
    setExporting(true)
    setError('')
    try {
      await downloadPdf(report, showCards)
    } catch (err) {
      console.error('Error exporting PDF:', err)
      setError('No se pudo generar el PDF. Intenta nuevamente.')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil((report?.data.length ?? 0) / pageSize))
  const pagedRows = useMemo(
    () => report?.data.slice((page - 1) * pageSize, page * pageSize) ?? [],
    [report, page]
  )
  const arrivalRate =
    report && report.summary.total > 0
      ? Math.round((report.summary.arrived / report.summary.total) * 100)
      : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-[#64748b]">Accesos e ingresos por rango de fechas</p>
          <h2 className="mt-1 text-[27px] font-bold tracking-[-0.04em] text-[#0f172a]">Reportes</h2>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={!report || report.data.length === 0 || exporting}
          className="flex items-center justify-center gap-2 self-start rounded-lg bg-[#b91c1c] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? 'Generando PDF...' : 'Exportar PDF'}
        </button>
      </div>

      {/* Filtros: una sola fila sobre los resultados */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#475569]">
            <CalendarDays size={15} className="text-[#004b93]" />
            <span className="text-[11px] text-[#64748b]">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-semibold outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#475569]">
            <CalendarDays size={15} className="text-[#004b93]" />
            <span className="text-[11px] text-[#64748b]">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-semibold outline-none"
            />
          </label>
          <button
            onClick={() => generate()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-[#004b93] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#003870] disabled:opacity-60"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <FileBarChart size={14} />}
            Generar reporte
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset.range())}
              disabled={loading}
              className="rounded-lg border border-[#cbd5e1] px-2.5 py-1.5 text-[11px] font-semibold text-[#475569] transition hover:bg-[#f8fafc] disabled:opacity-60"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-[#fef2f2] p-3 text-xs font-semibold text-[#b91c1c]">{error}</div>
      )}

      {report && (
        <>
          {report.truncated && (
            <div className="rounded-lg bg-[#fffbeb] p-3 text-xs font-semibold text-[#b45309]">
              El rango tiene demasiados accesos: se muestran las primeras {report.data.length}. Acota
              las fechas para ver el detalle completo.
            </div>
          )}

          {/* Resumen */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Accesos registrados" value={report.summary.total} index={0} />
            <StatTile
              index={1}
              label="Ingresaron"
              value={report.summary.arrived}
              hint={report.summary.total > 0 ? `${arrivalRate}% de los accesos` : undefined}
            />
            <StatTile
              index={2}
              label="No se presentaron"
              value={report.summary.noShow}
              hint={`${report.summary.inside} dentro ahora`}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            {/* Accesos por día */}
            <section className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0f172a]">Accesos por día</h3>
                  <p className="mt-1 text-xs text-[#64748b]">
                    {report.range.startDate} a {report.range.endDate}
                  </p>
                </div>
                {report.byDay.length > 0 && (
                  <button
                    onClick={() => setShowDayTable((v) => !v)}
                    className="text-xs font-bold text-[#004b93] hover:underline"
                  >
                    {showDayTable ? 'Ver gráfico' : 'Ver tabla'}
                  </button>
                )}
              </div>
              {report.byDay.length === 0 ? (
                <p className="py-10 text-center text-xs text-[#64748b]">Sin accesos en el rango.</p>
              ) : showDayTable ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                      <th className="pb-2">Fecha</th>
                      <th className="pb-2 text-right">Accesos</th>
                      <th className="pb-2 text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byDay.map((d) => (
                      <tr key={d.date} className="border-b border-[#f1f5f9] last:border-0">
                        <td className="py-2 text-[#0f172a]">{d.date}</td>
                        <td className="py-2 text-right text-[#475569]">{d.total}</td>
                        <td className="py-2 text-right text-[#475569]">{d.arrived}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <VisitsByDayChart data={report.byDay} />
              )}
            </section>

            {/* Por departamento */}
            <section className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <h3 className="text-sm font-bold text-[#0f172a]">Por departamento</h3>
              <p className="mt-1 text-xs text-[#64748b]">Accesos registrados e ingresos</p>
              {report.byDepartment.length === 0 ? (
                <p className="py-10 text-center text-xs text-[#64748b]">Sin datos.</p>
              ) : (
                <table className="mt-4 w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                      <th className="pb-2">Departamento</th>
                      <th className="pb-2 text-right">Accesos</th>
                      <th className="pb-2 text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byDepartment.map((d) => (
                      <tr key={d.department} className="border-b border-[#f1f5f9] last:border-0">
                        <td className="py-2 font-semibold text-[#0f172a]">{d.department}</td>
                        <td className="py-2 text-right text-[#475569]">{d.total}</td>
                        <td className="py-2 text-right text-[#475569]">{d.arrived}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          {/* Detalle */}
          <section className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#0f172a]">Detalle de accesos</h3>
                <p className="mt-1 text-xs text-[#64748b]">
                  {report.data.length} {report.data.length === 1 ? 'registro' : 'registros'} · exporta el
                  PDF para ver todas las columnas
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                    <th className="pb-3 pl-1">Fecha</th>
                    <th className="pb-3">Visitante</th>
                    <th className="pb-3">Departamento</th>
                    <th className="pb-3">Hora de llegada</th>
                    <th className="pb-3">Llegada</th>
                    <th className="pb-3">Salida</th>
                    {showCards && <th className="pb-3">Tarjeta</th>}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={showCards ? 7 : 6} className="py-10 text-center text-xs text-[#64748b]">
                        No hay accesos en el rango seleccionado.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((v, rowIndex) => (
                      <tr
                        key={v.id}
                        style={stagger(rowIndex)}
                        className="fa-row border-b border-[#f1f5f9] text-xs transition-colors last:border-0 hover:bg-[#f8fafc]"
                      >
                        <td className="py-3 pl-1 text-[#475569]">
                          {v.date}
                          {isPeriodVisit(v) && <span className="block text-[10px] text-[#15803d]">→ {v.endDate}</span>}
                        </td>
                        <td className="py-3">
                          <p className="font-bold text-[#0f172a]">
                            {v.name} {v.lastnames}
                          </p>
                          <p className="text-[10px] text-[#94a3b8]">{v.run}</p>
                        </td>
                        <td className="py-3 text-[#475569]">{v.department?.name || '—'}</td>
                        <td className="py-3 text-[#475569]">{hour(v.startHour) || '—'}</td>
                        <td className="py-3 text-[#475569]">{hour(v.arrivalHour) || '—'}</td>
                        <td className="py-3 text-[#475569]">{hour(v.exitHour) || '—'}</td>
                        {showCards && (
                          <td className="py-3 text-[#475569]">
                            {v.cardNumber ?? (v.usesCard === false ? 'Sin tarjeta' : '—')}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {report.data.length > pageSize && (
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#edf1ee] pt-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-md border border-[#dce5e0] px-2.5 py-1.5 text-xs font-semibold text-[#50615a] disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="rounded-md border border-[#dce5e0] px-2.5 py-1.5 text-xs font-semibold text-[#50615a] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
