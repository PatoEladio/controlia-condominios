'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, LogIn, ShieldCheck, User } from 'lucide-react'
import { login } from '@/services/auth'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Por favor, ingresa tu usuario y contraseña.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await login(username, password)
      if (data?.access_token) {
        // Redirigir al dashboard
        router.push('/')
      } else {
        setError('No se recibió el token de autenticación.')
      }
    } catch (err: any) {
      console.error('Error during login:', err)
      const message =
        err?.response?.data?.message ||
        'Credenciales inválidas. Verifica tu usuario o contraseña.'
      setError(Array.isArray(message) ? message.join(', ') : message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f2f5f3] px-4 py-12">
      <div className="fa-modal w-full max-w-md rounded-2xl border border-[#e3e9e5] bg-white p-8 shadow-[0_8px_30px_rgba(23,53,44,0.06)]">
        {/* Logo / Encabezado */}
        <div className="mb-8 text-center">
          <div className="fa-pop fa-float mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#004b93] text-white shadow-md">
            <ShieldCheck size={32} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#0f172a]">
            FEMAccess
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748b]">
            Gestión y Control de Accesos
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-[#f5c6cb] bg-[#fdf2f2] p-3.5 text-xs font-semibold text-[#a53b3b]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#334155]">
              Nombre de usuario
            </label>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3.5 py-3 transition focus-within:border-[#004b93] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#004b93]/15">
              <User size={18} className="text-[#94a3b8]" />
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej: bcarrion"
                className="w-full bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#334155]">
              Contraseña
            </label>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3.5 py-3 transition focus-within:border-[#004b93] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#004b93]/15">
              <Lock size={18} className="text-[#94a3b8]" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#004b93] py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#003870] disabled:opacity-60"
          >
            {loading ? (
              <span>Iniciando sesión...</span>
            ) : (
              <>
                <LogIn size={18} /> Iniciar sesión
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-[#94a3b8]">
          Sistema protegido y monitoreado. Todos los accesos son auditados.
        </p>
      </div>
    </div>
  )
}

