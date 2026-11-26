'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Ban,
  Camera,
  Check,
  CreditCard,
  Keyboard,
  MapPin,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'

import jsQR from 'jsqr'
import { checkVisitor, validateVisitor } from '../services/visitors'
import { stagger } from './motion'
import { isPeriodVisit } from './visit-period'

interface Visitor {
  id: string
  name: string
  lastnames: string
  run: string
  date: string
  endDate?: string | null // último día de la visita (mayor que date en visitas por período)
  startHour: string // hora de llegada
  arrivalHour?: string | null
  exitHour?: string | null
  cardNumber?: number | null
  usesCard?: boolean // false: el acceso ingresa sin tarjeta
  isArrivalValidated: boolean
  isExitValidated: boolean
  isInside: boolean
  department?: { id: string; name: string } | null
}

type Action = 'ENTRY' | 'EXIT'

// Respuesta de GET /visitors/check
interface CheckResult {
  action: Action
  visitor: Visitor
  usesCard: boolean // false: no se asigna tarjeta
  availableCards: number[]
  totalCards: number
}

// Respuesta de PUT /visitors/validate
interface ConfirmResult {
  action: Action
  visitor: Visitor
}

const getErrorMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message
  if (Array.isArray(message)) return message.join(', ')
  return message || fallback
}

const formatHour = (hour?: string | null) => (hour ? hour.slice(0, 5) : '—')

// Extraer RUN del QR (URL del Registro Civil, JSON o RUT directo)
const extractRunFromQR = (rawText: string): string | null => {
  const text = rawText.trim()

  // 1. URL del Registro Civil: ...docstatus?RUN=21264235-5&type=CEDULA&...
  try {
    const url = new URL(text)
    const runParam = url.searchParams.get('RUN') || url.searchParams.get('run')
    if (runParam) return runParam.trim()
  } catch {
    // No era una URL completa
  }

  // 2. RUN=... dentro del texto
  const matchParam = text.match(/[?&]RUN=([0-9kK.-]+)/i)
  if (matchParam?.[1]) return matchParam[1].trim()

  // 3. JSON {"run": "..."}
  try {
    const obj = JSON.parse(text)
    if (obj && (obj.run || obj.RUN)) return String(obj.run || obj.RUN).trim()
  } catch {
    // No era JSON
  }

  // 4. RUT directo: 12345678-9 o 12.345.678-K
  const matchRut = text.match(/\b(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]|\d{7,8}-[\dkK])\b/)
  if (matchRut?.[1]) return matchRut[1].trim()

  return null
}

// RUN sin puntos ni espacios y con K mayúscula (igual que el backend)
const normalizeRun = (run: string) => run.replace(/[.\s]/g, '').toUpperCase()

// cardsEnabled: false en empresas que no entregan tarjetas (condominios): se omite todo lo de tarjeta
export default function ValidateAccessView({ cardsEnabled = true }: { cardsEnabled?: boolean }) {
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const [run, setRun] = useState<string | null>(null)
  const [manualRun, setManualRun] = useState('')
  const [showManual, setShowManual] = useState(false)

  // Paso 1: consulta
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  // Paso 2: tarjeta + confirmación
  const [selectedCard, setSelectedCard] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null)

  const [error, setError] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    canvasRef.current = document.createElement('canvas')
    return () => {
      stopScanner()
    }
  }, [])

  const resetFlow = () => {
    setRun(null)
    setCheckResult(null)
    setSelectedCard('')
    setConfirmResult(null)
    setError('')
  }

  const stopScanner = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  const openScanner = async () => {
    resetFlow()
    setCameraError('')
    setScanning(true)

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Este dispositivo no permite acceder a la cámara desde el navegador.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
        animationFrameRef.current = requestAnimationFrame(scanTick)
      }
    } catch (err) {
      console.error('Error opening camera:', err)
      setCameraError(
        'No pudimos acceder a la cámara. Revisa los permisos del navegador para continuar.'
      )
    }
  }

  const scanTick = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })
        if (code?.data) {
          handleDetectedCode(code.data)
          return
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(scanTick)
  }

  const handleDetectedCode = (data: string) => {
    stopScanner()
    const extracted = extractRunFromQR(data)
    if (!extracted) {
      setError('No se pudo encontrar un RUN válido en el código QR escaneado.')
      return
    }
    runCheck(extracted)
  }

  // Paso 1: ¿tiene visita hoy?
  const runCheck = async (rawRun: string) => {
    const value = normalizeRun(rawRun)
    resetFlow()
    setRun(value)
    setChecking(true)
    try {
      const result: CheckResult = await checkVisitor(value)
      setCheckResult(result)
      // Preselecciona la primera tarjeta libre para agilizar la entrada
      if (result.action === 'ENTRY' && result.usesCard && result.availableCards.length > 0) {
        setSelectedCard(String(result.availableCards[0]))
      }
    } catch (err) {
      console.error('Error checking visitor:', err)
      setError(getErrorMessage(err, 'Ocurrió un error al consultar la visita.'))
    } finally {
      setChecking(false)
    }
  }

  const handleManualSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!manualRun.trim()) return
    setShowManual(false)
    runCheck(manualRun)
    setManualRun('')
  }

  // Paso 2: confirmar entrada (con tarjeta) o salida
  const handleConfirm = async () => {
    if (!checkResult || !run) return
    const isEntry = checkResult.action === 'ENTRY'
    // Solo hay que asignar tarjeta en la entrada de una visita que la usa
    const needsCard = isEntry && checkResult.usesCard !== false
    if (needsCard && !selectedCard) {
      setError('Debes asignar una tarjeta antes de confirmar el ingreso.')
      return
    }
    setConfirming(true)
    setError('')
    try {
      const result: ConfirmResult = await validateVisitor(
        run,
        needsCard ? Number(selectedCard) : undefined
      )
      setConfirmResult(result)
      setCheckResult(null)
    } catch (err) {
      console.error('Error validating visitor:', err)
      setError(getErrorMessage(err, 'No se pudo registrar el acceso.'))
    } finally {
      setConfirming(false)
    }
  }

  const visitor = checkResult?.visitor
  const isEntry = checkResult?.action === 'ENTRY'
  // ¿La visita actual ingresa sin tarjeta? (se conoce al validar el RUN, o al ver el resultado)
  const noCard = checkResult
    ? checkResult.usesCard === false
    : confirmResult
      ? confirmResult.visitor.usesCard === false
      : false
  const needsCard = isEntry && !noCard

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-[#64748b]">Punto de control de portería / guardia</p>
          <h2 className="mt-1 text-[27px] font-bold tracking-[-0.04em] text-[#0f172a]">
            Validar accesos
          </h2>
        </div>
      </div>

      {/* Pasos */}
      <ol className={`grid gap-2 text-xs ${cardsEnabled ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {[
          { n: 1, label: 'Escanear QR del carnet', done: Boolean(run) },
          { n: 2, label: 'Validar visita de hoy', done: Boolean(checkResult || confirmResult) },
          ...(cardsEnabled
            ? [
                noCard
                  ? { n: 3, label: 'Sin tarjeta (no aplica)', done: Boolean(checkResult || confirmResult) }
                  : { n: 3, label: 'Asignar tarjeta', done: Boolean(selectedCard || confirmResult) },
              ]
            : []),
          { n: cardsEnabled ? 4 : 3, label: 'Confirmar ingreso', done: Boolean(confirmResult) },
        ].map((step) => (
          <li
            key={step.n}
            style={stagger(step.n - 1)}
            className={`fa-fade-up flex items-center gap-2 rounded-lg border px-3 py-2 font-semibold transition-all duration-500 ${
              step.done
                ? 'border-[#86efac] bg-[#f0fdf4] text-[#15803d]'
                : 'border-[#e2e8f0] bg-white text-[#64748b]'
            }`}
          >
            <span
              key={String(step.done)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-500 ${
                step.done ? 'fa-pop bg-[#16a34a] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
              }`}
            >
              {step.done ? <Check size={12} /> : step.n}
            </span>
            {step.label}
          </li>
        ))}
      </ol>

      {/* Tarjeta de Acción */}
      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f1fa] text-[#004b93]">
          <ScanLine size={26} />
        </div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.15em] text-[#004b93]">
          Lector de Cédulas de Identidad
        </p>
        <h3 className="mt-2 text-[26px] font-bold tracking-[-0.04em] text-[#0f172a] sm:text-[32px]">
          Escanear QR del carnet
        </h3>
        <p className="mt-2 max-w-[540px] text-sm leading-6 text-[#64748b]">
          Apunta al código QR de la Cédula de Identidad. El sistema obtiene el <strong>RUN</strong>,
          verifica si tiene una visita programada para hoy{cardsEnabled ? ' y te pide asignar una tarjeta.' : '.'}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={openScanner}
            disabled={checking || confirming}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#004b93] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#003870] disabled:opacity-60"
          >
            <Camera size={18} /> Iniciar escáner QR
          </button>
          <button
            onClick={() => setShowManual((v) => !v)}
            disabled={checking || confirming}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-6 py-3.5 text-sm font-bold text-[#334155] transition hover:bg-[#f8fafc] disabled:opacity-60"
          >
            <Keyboard size={18} /> Ingresar RUN manualmente
          </button>
        </div>

        {showManual && (
          <form onSubmit={handleManualSubmit} autoComplete="off" className="fa-fade-up mt-4 flex max-w-md gap-2">
            <input
              value={manualRun}
              onChange={(e) => setManualRun(e.target.value)}
              placeholder="12345678-9"
              autoFocus
              className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#004b93] focus:ring-2 focus:ring-[#004b93]/10"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-[#004b93] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#003870]"
            >
              Validar
            </button>
          </form>
        )}
      </section>

      {/* Consultando */}
      {checking && (
        <div className="fa-fade-up flex items-center gap-3 rounded-2xl border border-[#bae6fd] bg-[#f0f9ff] p-5">
          <RefreshCw size={20} className="animate-spin text-[#0284c7]" />
          <div>
            <p className="text-sm font-bold text-[#0369a1]">Validando visita para el RUN {run}...</p>
            <p className="text-xs text-[#0284c7]">Consultando las visitas programadas para hoy</p>
          </div>
        </div>
      )}

      {/* PASO 2-3: visita encontrada → asignar tarjeta y confirmar */}
      {checkResult && visitor && (
        <section
          className={`fa-fade-up rounded-2xl border p-6 shadow-sm ${
            isEntry ? 'border-[#bae6fd] bg-[#f0f9ff]' : 'border-[#fde68a] bg-[#fffbeb]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${
                  isEntry ? 'bg-[#0284c7]' : 'bg-[#d97706]'
                }`}
              >
                {isEntry ? <ArrowDownToLine size={26} /> : <ArrowUpFromLine size={26} />}
              </div>
              <div>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isEntry ? 'bg-[#e0f2fe] text-[#0369a1]' : 'bg-[#fef3c7] text-[#b45309]'
                  }`}
                >
                  {isEntry ? 'Visita programada para hoy' : 'Registrar salida'}
                </span>
                <h4 className="mt-1 text-xl font-bold text-[#0f172a]">
                  {visitor.name} {visitor.lastnames}
                </h4>
                <p className="text-xs font-semibold text-[#475569]">RUN: {visitor.run}</p>
              </div>
            </div>
            <button
              onClick={resetFlow}
              className="rounded-lg p-1.5 text-[#64748b] transition hover:bg-white"
              title="Cancelar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-3.5">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#64748b]">
                <MapPin size={11} /> Departamento
              </span>
              <p className="mt-1 text-sm font-bold text-[#0f172a]">{visitor.department?.name || '—'}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-3.5">
              <span className="text-[10px] font-bold uppercase text-[#64748b]">
                {isPeriodVisit(visitor) ? 'Período del acceso' : isEntry ? 'Hora de llegada' : 'Ingresó a las'}
              </span>
              <p className="mt-1 text-sm font-bold text-[#0f172a]">
                {isPeriodVisit(visitor)
                  ? `${visitor.date} → ${visitor.endDate}`
                  : isEntry
                    ? formatHour(visitor.startHour)
                    : formatHour(visitor.arrivalHour)}
              </p>
            </div>
          </div>

          {cardsEnabled && (
            <>
          {isEntry && noCard ? (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4">
              <span className="fa-pop flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#64748b]">
                <Ban size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-[#0f172a]">Esta visita no usa tarjeta</p>
                <p className="text-[11px] text-[#64748b]">
                  No hay nada que asignar: confirma el ingreso directamente.
                </p>
              </div>
            </div>
          ) : isEntry ? (
            <div className="mt-5 rounded-xl border border-[#e2e8f0] bg-white p-4">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#334155]">
                  <CreditCard size={14} className="text-[#004b93]" /> Asignar tarjeta
                </span>
                <select
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                  disabled={checkResult.availableCards.length === 0}
                  className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm text-[#0f172a] outline-none transition focus:border-[#004b93] focus:ring-2 focus:ring-[#004b93]/10 disabled:bg-[#f8fafc] sm:max-w-xs"
                >
                  <option value="" disabled>
                    Selecciona una tarjeta
                  </option>
                  {checkResult.availableCards.map((card) => (
                    <option key={card} value={card}>
                      Tarjeta {card}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-1.5 text-[11px] text-[#64748b]">
                {checkResult.availableCards.length === 0
                  ? `No hay tarjetas disponibles: las ${checkResult.totalCards} están en uso.`
                  : `${checkResult.availableCards.length} de ${checkResult.totalCards} tarjetas disponibles.`}
              </p>
            </div>
          ) : visitor.cardNumber ? (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#fde68a] bg-white p-4">
              <CreditCard size={22} className="fa-float text-[#d97706]" />
              <p className="text-sm text-[#334155]">
                Recibe la <strong>tarjeta {visitor.cardNumber}</strong> antes de confirmar la salida.
              </p>
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#fde68a] bg-white p-4">
              <Ban size={20} className="text-[#d97706]" />
              <p className="text-sm text-[#334155]">Esta visita ingresó sin tarjeta: no hay nada que recibir.</p>
            </div>
          )}
            </>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-[#fef2f2] p-3 text-xs font-semibold text-[#b91c1c]">
              {error}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleConfirm}
              disabled={confirming || (needsCard && !selectedCard)}
              className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isEntry ? 'bg-[#16a34a] hover:bg-[#15803d]' : 'bg-[#d97706] hover:bg-[#b45309]'
              }`}
            >
              <Check size={17} />
              {confirming
                ? 'Registrando...'
                : isEntry
                  ? needsCard
                    ? `Confirmar ingreso${selectedCard ? ` con tarjeta ${selectedCard}` : ''}`
                    : cardsEnabled
                      ? 'Confirmar ingreso sin tarjeta'
                      : 'Confirmar ingreso'
                  : 'Confirmar salida'}
            </button>
            <button
              onClick={resetFlow}
              disabled={confirming}
              className="rounded-xl border border-[#cbd5e1] bg-white px-6 py-3 text-sm font-bold text-[#334155] transition hover:bg-[#f8fafc]"
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      {/* PASO 4: confirmado */}
      {confirmResult && (
        <section className="fa-fade-up rounded-2xl border border-[#86efac] bg-[#f0fdf4] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                <span
                  className="fa-ring-out absolute inset-0 rounded-2xl bg-[#16a34a]"
                  style={{ animationIterationCount: 3 }}
                />
                <div className="fa-pop relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16a34a] text-white shadow-md">
                  <ShieldCheck size={28} />
                </div>
              </div>
              <div>
                <span className="inline-block rounded-full bg-[#dcfce7] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#15803d]">
                  {confirmResult.action === 'ENTRY' ? 'Ingreso registrado' : 'Salida registrada'}
                </span>
                <h4 className="mt-1 text-xl font-bold text-[#14532d]">
                  {confirmResult.visitor.name} {confirmResult.visitor.lastnames}
                </h4>
                <p className="text-xs font-semibold text-[#166534]">
                  RUN: {confirmResult.visitor.run}
                </p>
              </div>
            </div>
            <button
              onClick={resetFlow}
              className="rounded-lg p-1.5 text-[#166534] transition hover:bg-[#dcfce7]"
              title="Cerrar resultado"
            >
              <X size={18} />
            </button>
          </div>

          <div className={`mt-5 grid gap-3 ${cardsEnabled ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {cardsEnabled && (
            <div style={stagger(1)} className="fa-fade-up rounded-xl border border-[#bbf7d0] bg-white p-3.5">
              <span className="text-[10px] font-bold uppercase text-[#64748b]">Tarjeta</span>
              <p className="mt-1 text-sm font-bold text-[#0f172a]">
                {confirmResult.visitor.cardNumber ??
                  (confirmResult.visitor.usesCard === false ? 'Sin tarjeta' : '—')}
                {confirmResult.action === 'EXIT' && (
                  <span className="ml-1 text-xs font-semibold text-[#15803d]">(liberada)</span>
                )}
              </p>
            </div>
            )}
            <div style={stagger(2)} className="fa-fade-up rounded-xl border border-[#bbf7d0] bg-white p-3.5">
              <span className="text-[10px] font-bold uppercase text-[#64748b]">Hora de llegada</span>
              <p className="mt-1 text-sm font-bold text-[#0f172a]">
                {formatHour(confirmResult.visitor.arrivalHour)}
              </p>
            </div>
            <div style={stagger(3)} className="fa-fade-up rounded-xl border border-[#bbf7d0] bg-white p-3.5">
              <span className="text-[10px] font-bold uppercase text-[#64748b]">Hora de salida</span>
              <p className="mt-1 text-sm font-bold text-[#0f172a]">
                {formatHour(confirmResult.visitor.exitHour)}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <button
              onClick={openScanner}
              className="flex items-center gap-2 rounded-xl bg-[#004b93] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#003870]"
            >
              <Camera size={16} /> Escanear siguiente cédula
            </button>
          </div>
        </section>
      )}

      {/* Error de la consulta (sin visita hoy, horario, etc.) */}
      {error && !checkResult && (
        <section className="fa-fade-up rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#dc2626] text-white shadow-md">
                <ShieldAlert size={28} />
              </div>
              <div>
                <span className="inline-block rounded-full bg-[#fee2e2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#b91c1c]">
                  Acceso denegado
                </span>
                <h4 className="mt-1 text-lg font-bold text-[#991b1b]">{error}</h4>
                {run && (
                  <p className="text-xs font-semibold text-[#b91c1c]">RUN consultado: {run}</p>
                )}
              </div>
            </div>
            <button
              onClick={resetFlow}
              className="rounded-lg p-1.5 text-[#b91c1c] transition hover:bg-[#fee2e2]"
              title="Cerrar alerta"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-5">
            <button
              onClick={openScanner}
              className="flex items-center gap-2 rounded-xl bg-[#004b93] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#003870]"
            >
              <RefreshCw size={15} /> Reintentar escaneo
            </button>
          </div>
        </section>
      )}

      {/* Modal Cámara QR en vivo */}
      {scanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8f1fa] text-[#004b93]">
                  <QrCode size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0f172a]">Escaneando QR del carnet...</h3>
                  <p className="text-[11px] text-[#64748b]">
                    Centra el código de la cédula dentro del recuadro
                  </p>
                </div>
              </div>
              <button
                onClick={stopScanner}
                aria-label="Cerrar escáner"
                className="rounded-full p-2 text-[#64748b] transition hover:bg-[#f1f5f9]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-video overflow-hidden bg-[#0f172a]">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-48 w-48 rounded-2xl border-2 border-[#38bdf8] shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
                  <div className="absolute inset-x-0 h-0.5 animate-pulse bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent" />
                </div>
              </div>
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a]/95 p-6 text-center">
                  <AlertCircle size={36} className="text-[#ef4444]" />
                  <p className="mt-3 text-sm font-semibold text-white">{cameraError}</p>
                  <button
                    onClick={openScanner}
                    className="mt-4 rounded-lg bg-[#004b93] px-4 py-2 text-xs font-bold text-white hover:bg-[#003870]"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between bg-[#f8fafc] px-5 py-3">
              <span className="flex items-center gap-2 text-xs text-[#64748b]">
                <span className="h-2 w-2 animate-ping rounded-full bg-[#22c55e]" />
                Lector activo
              </span>
              <button
                type="button"
                onClick={stopScanner}
                className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#334155] hover:bg-[#f1f5f9]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
