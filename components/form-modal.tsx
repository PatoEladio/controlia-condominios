'use client'

import { useId } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// Ancho del diálogo: md (formularios cortos) · lg · xl (formularios con varias secciones)
const MODAL_SIZES = { md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-2xl' } as const

export function Modal({
  title,
  children,
  onClose,
  size = 'md',
  footer,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  size?: keyof typeof MODAL_SIZES
  // Barra inferior fija (botones de acción). Se mantiene visible aunque el contenido haga scroll.
  footer?: React.ReactNode
}) {
  const titleId = useId()
  // Los modales solo se montan tras una acción del usuario, siempre en el navegador
  if (typeof document === 'undefined') return null
  // Se dibuja directamente en <body> (portal): así ningún contenedor con transform, filter o animación
  // puede cambiar la referencia de "position: fixed" y recortar el diálogo.
  return createPortal(
    <div className="fa-backdrop fixed inset-0 z-40 flex items-center justify-center bg-[#0f172a]/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fa-modal flex max-h-[calc(100vh-2rem)] w-full ${MODAL_SIZES[size]} flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xl`}
      >
        {/* Encabezado fijo: el título y el botón de cerrar no se pierden al hacer scroll */}
        <div className="flex shrink-0 items-center justify-between px-6 pb-4 pt-6">
          <h2 id={titleId} className="text-lg font-bold tracking-[-0.02em] text-[#0f172a]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#94a3b8] transition duration-200 hover:rotate-90 hover:bg-[#f1f5f9] hover:text-[#0f172a]"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto px-6 ${footer ? 'pb-5' : 'pb-6'}`}>{children}</div>
        {footer && (
          // La sombra superior sugiere que el contenido sigue por debajo cuando hay scroll
          <div className="shrink-0 border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-4 shadow-[0_-10px_14px_-10px_rgba(15,23,42,0.12)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export function Field({
  label,
  name,
  placeholder,
  type = 'text',
  defaultValue,
}: {
  label: string
  name: string
  placeholder?: string
  type?: string
  defaultValue?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[#334155]">
        {label}
      </span>
      <input
        required
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete="off"
        className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#004b93] focus:ring-2 focus:ring-[#004b93]/10"
      />
    </label>
  )
}

// Igual que Field pero no obligatorio: se muestra "(opcional)" junto a la etiqueta
export function OptionalField({
  label,
  name,
  placeholder,
  type = 'text',
  defaultValue,
  min,
}: {
  label: string
  name: string
  placeholder?: string
  type?: string
  defaultValue?: string
  min?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[#334155]">
        {label} <span className="font-normal text-[#94a3b8]">(opcional)</span>
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        min={min}
        autoComplete="off"
        className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#004b93] focus:ring-2 focus:ring-[#004b93]/10"
      />
    </label>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Eliminar',
  loadingLabel = 'Eliminando...',
  loading = false,
  error,
  onConfirm,
  onCancel,
}: {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  loadingLabel?: string
  loading?: boolean
  error?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-[#475569]">{message}</p>
      {error && (
        <div className="mt-4 rounded-lg bg-[#fef2f2] p-3 text-xs font-semibold text-[#b91c1c]">
          {error}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[#cbd5e1] px-4 py-2.5 text-xs font-bold text-[#334155] hover:bg-[#f8fafc]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="rounded-lg bg-[#b91c1c] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? loadingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
