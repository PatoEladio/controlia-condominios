'use client'

import { useEffect, useRef, useState } from 'react'
import { LucideIcon } from 'lucide-react'
import { stagger } from './motion'

interface StatProps {
  label: string
  value: string
  change?: string
  icon: LucideIcon
  tone: 'blue' | 'sky' | 'navy' | 'amber' | 'red' | string
  // Posición dentro de la grilla: escalona la animación de entrada
  index?: number
}

const tones: Record<string, string> = {
  blue: 'bg-[#e8f1fa] text-[#004b93]',
  sky: 'bg-[#e0f2fe] text-[#0284c7]',
  navy: 'bg-[#eff6ff] text-[#1d4ed8]',
  green: 'bg-[#e8f1fa] text-[#004b93]',
  orange: 'bg-[#fff7ed] text-[#c2410c]',
  purple: 'bg-[#e0f2fe] text-[#0369a1]',
  red: 'bg-[#fef2f2] text-[#b91c1c]',
}

// Número que "sube" desde el valor anterior hasta el nuevo (si el valor no es numérico, se muestra tal cual)
function CountUp({ value }: { value: string }) {
  const target = /^\d+$/.test(value) ? Number(value) : null
  const [shown, setShown] = useState(target ?? 0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (target === null) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const from = fromRef.current
    if (reduced || from === target) {
      setShown(target)
      fromRef.current = target
      return
    }
    const duration = 800
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setShown(Math.round(from + (target - from) * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return <>{target === null ? value : shown}</>
}

export default function Stat({ label, value, change, icon: Icon, tone, index = 0 }: StatProps) {
  return (
    <div
      style={stagger(index)}
      className="fa-fade-up fa-lift group rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 ${tones[tone] || tones.blue}`}
        >
          <Icon size={16} />
        </div>
        {change && <span className="text-[10px] font-bold text-[#64748b]">{change}</span>}
      </div>
      <p className="mt-4 text-[11px] font-semibold text-[#64748b]">{label}</p>
      <p className="mt-0.5 text-[25px] font-bold tracking-[-0.04em] text-[#0f172a] tabular-nums">
        <CountUp value={value} />
      </p>
    </div>
  )
}
