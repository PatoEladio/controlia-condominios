'use client'

import { CheckCircle2, Clock, MoonStar, XCircle } from 'lucide-react'

// Estado del acceso. En condominios nacen APROBADOS y a las 00:00 pasan a CERRADA si la persona no llegó
export type VisitStatus = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CERRADA'

export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  CERRADA: 'Cerrada (no llegó)',
}

const STYLES: Record<VisitStatus, { className: string; Icon: typeof Clock }> = {
  PENDIENTE: { className: 'bg-[#fef3c7] text-[#b45309]', Icon: Clock },
  APROBADA: { className: 'bg-[#dcfce7] text-[#15803d]', Icon: CheckCircle2 },
  RECHAZADA: { className: 'bg-[#fee2e2] text-[#b91c1c]', Icon: XCircle },
  CERRADA: { className: 'bg-[#f1f5f9] text-[#64748b]', Icon: MoonStar },
}

// Badge con ícono + texto (el estado nunca se comunica solo con color)
export function VisitStatusBadge({ status, title }: { status?: string | null; title?: string }) {
  const key = (status?.toUpperCase() as VisitStatus) || 'PENDIENTE'
  const style = STYLES[key] ?? STYLES.PENDIENTE
  const { Icon } = style
  return (
    <span
      title={title ?? (key === 'CERRADA' ? 'Se cerró a las 00:00 porque la persona no llegó' : undefined)}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${style.className}`}
    >
      <Icon size={11} className={key === 'PENDIENTE' ? 'fa-soft-pulse' : undefined} />
      {VISIT_STATUS_LABEL[key] ?? key}
    </span>
  )
}
