'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  Check,
  FileText,
  ImagePlus,
  Plus,
  QrCode,
  ScanLine,
  UserRound,
  X,
} from 'lucide-react'

type EmployeeViewProps = {
  onSwitch: () => void
}

type Note = {
  id: number
  title: string
  detail: string
  time: string
  photo?: string
}

type NewNote = {
  title: string
  detail: string
  photo: string
}

export function EmployeeView({ onSwitch }: EmployeeViewProps) {
  const [scanning, setScanning] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [notes, setNotes] = useState<Note[]>([
    {
      id: 1,
      title: 'Ronda de cierre',
      detail: 'Se revisó el acceso principal y quedó cerrado correctamente.',
      time: '09:42',
    },
    {
      id: 2,
      title: 'Entrega recibida',
      detail:
        'Paquete entregado en recepción para el departamento de administración.',
      time: '08:15',
    },
  ])
  const [newNote, setNewNote] = useState<NewNote>({
    title: '',
    detail: '',
    photo: '',
  })
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const openScanner = async () => {
    setCameraError('')
    setScanning(true)
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Este dispositivo no permite acceder a la cámara desde el navegador.'
      )
      return
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current
      }
    } catch {
      setCameraError(
        'No pudimos acceder a la cámara. Revisa los permisos del navegador para continuar.'
      )
    }
  }

  const closeScanner = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setScanning(false)
    setCameraError('')
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () =>
      setNewNote((current) => ({ ...current, photo: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  const saveNote = (event: React.FormEvent) => {
    event.preventDefault()
    if (!newNote.title.trim() || !newNote.detail.trim()) return
    setNotes((current) => [
      {
        id: Date.now(),
        title: newNote.title,
        detail: newNote.detail,
        photo: newNote.photo || undefined,
        time: 'Ahora',
      },
      ...current,
    ])
    setNewNote({ title: '', detail: '', photo: '' })
    setShowNoteForm(false)
    setShowNotes(true)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      {/* Header */}
      <header className="flex min-h-[72px] items-center justify-between gap-3 border-b border-[#e2e8f0] bg-white px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#004b93] text-white">
            <QrCode size={21} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-[#0f172a]">FEMAccess</p>
            <p className="text-[10px] font-medium text-[#64748b]">
              Portal de empleados
            </p>
          </div>
        </div>
        <button
          onClick={onSwitch}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-[11px] font-bold text-[#334155] transition hover:bg-[#f8fafc]"
        >
          <UserRound size={14} />
          <span className="hidden sm:inline">Vista administrador</span>
          <span className="sm:hidden">Admin</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-2xl px-4 pb-10 pt-8 sm:px-8 sm:pt-14">
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f1fa] text-[#004b93]">
            <ScanLine size={25} />
          </div>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.15em] text-[#004b93]">
            Control de ingreso
          </p>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-0.045em] text-[#0f172a] sm:text-[36px]">
            Escanea el código QR
          </h1>
          <p className="mt-3 max-w-[480px] text-sm leading-6 text-[#64748b]">
            Usa la cámara de tu celular o computador para registrar y validar un
            acceso de forma rápida.
          </p>
          <button
            onClick={openScanner}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#004b93] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#003870] sm:w-auto"
          >
            <Camera size={18} /> Abrir cámara
          </button>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => {
                setShowNotes(true)
                setShowNoteForm(false)
              }}
              className="flex items-center gap-3 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-4 text-left transition hover:border-[#004b93]"
            >
              <FileText className="shrink-0 text-[#004b93]" size={21} />
              <span>
                <strong className="block text-sm text-[#0f172a]">Libro de novedades</strong>
                <span className="mt-1 block text-xs text-[#64748b]">
                  Ver registros del día
                </span>
              </span>
            </button>
            <button
              onClick={() => {
                setShowNoteForm(true)
                setShowNotes(false)
              }}
              className="flex items-center gap-3 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-4 text-left transition hover:border-[#004b93]"
            >
              <Plus className="shrink-0 text-[#004b93]" size={21} />
              <span>
                <strong className="block text-sm text-[#0f172a]">Crear novedad</strong>
                <span className="mt-1 block text-xs text-[#64748b]">
                  Agregar un registro
                </span>
              </span>
            </button>
          </div>
        </section>

        {/* Modal: Ver Novedades */}
        {showNotes && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0f172a]/50 p-4 backdrop-blur-sm">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="notes-dialog-title"
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-2xl sm:p-6"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 id="notes-dialog-title" className="text-base font-bold text-[#0f172a]">
                    Libro de novedades
                  </h2>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Registros de hoy
                  </p>
                </div>
                <button
                  onClick={() => setShowNotes(false)}
                  aria-label="Cerrar libro"
                  className="rounded-full p-2 text-[#64748b] hover:bg-[#f1f5f9]"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="space-y-3">
                {notes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-bold text-[#0f172a]">{note.title}</h3>
                      <span className="shrink-0 text-[10px] font-semibold text-[#94a3b8]">
                        {note.time}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#64748b]">
                      {note.detail}
                    </p>
                    {note.photo && (
                      <img
                        src={note.photo}
                        alt={`Foto adjunta a ${note.title}`}
                        className="mt-3 max-h-48 w-full rounded-lg object-cover"
                      />
                    )}
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Modal: Formulario Nueva Novedad */}
        {showNoteForm && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0f172a]/50 p-4 backdrop-blur-sm">
            <form
              onSubmit={saveNote}
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-note-dialog-title"
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-2xl sm:p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2
                    id="new-note-dialog-title"
                    className="text-base font-bold text-[#0f172a]"
                  >
                    Nueva novedad
                  </h2>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Registra lo ocurrido durante tu turno.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNoteForm(false)}
                  aria-label="Cerrar formulario"
                  className="rounded-full p-2 text-[#64748b] hover:bg-[#f1f5f9]"
                >
                  <X size={17} />
                </button>
              </div>
              <label className="block text-xs font-bold text-[#334155]">
                Título
                <input
                  value={newNote.title}
                  onChange={(event) =>
                    setNewNote({ ...newNote, title: event.target.value })
                  }
                  placeholder="Ej. Ronda de cierre"
                  className="mt-2 w-full rounded-lg border border-[#cbd5e1] px-3 py-3 text-sm outline-none focus:border-[#004b93] focus:ring-2 focus:ring-[#004b93]/10"
                />
              </label>
              <label className="mt-4 block text-xs font-bold text-[#334155]">
                Detalle
                <textarea
                  value={newNote.detail}
                  onChange={(event) =>
                    setNewNote({ ...newNote, detail: event.target.value })
                  }
                  placeholder="Escribe lo que ocurrió..."
                  rows={4}
                  className="mt-2 w-full resize-none rounded-lg border border-[#cbd5e1] px-3 py-3 text-sm outline-none focus:border-[#004b93] focus:ring-2 focus:ring-[#004b93]/10"
                />
              </label>
              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-3 py-3 text-xs font-bold text-[#334155] hover:border-[#004b93]">
                <ImagePlus size={18} className="text-[#004b93]" />
                <span>
                  {newNote.photo ? 'Cambiar fotografía' : 'Adjuntar fotografía'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
              </label>
              {newNote.photo && (
                <div className="relative mt-3">
                  <img
                    src={newNote.photo}
                    alt="Vista previa de la fotografía adjunta"
                    className="max-h-40 w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setNewNote((current) => ({ ...current, photo: '' }))
                    }
                    aria-label="Quitar fotografía"
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-[#475569] shadow"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#004b93] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#003870]"
              >
                <Check size={17} /> Guardar novedad
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Escáner de cámara QR */}
      {scanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0f172a]">Escanear código QR</h2>
                <p className="mt-1 text-xs text-[#64748b]">
                  Apunta la cámara al código de acceso
                </p>
              </div>
              <button
                onClick={closeScanner}
                aria-label="Cerrar escáner"
                className="rounded-full p-2 text-[#64748b] hover:bg-[#f1f5f9]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-xl bg-[#0f172a]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-[#38bdf8]" />
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm font-semibold text-white">
                  {cameraError}
                </div>
              )}
            </div>
            <p className="mt-4 text-center text-xs text-[#64748b]">
              El lector se activará al detectar un código válido.
            </p>
          </div>
        </div>
      )}
    </div>
  )

}

