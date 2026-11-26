'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDownToLine,
  BookOpen,
  CalendarDays,
  Ban,
  Check,
  CreditCard,
  ChevronDown,
  FileText,
  FileBarChart,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  Building2,
  Menu,
  Moon,
  Plus,
  QrCode,
  ShieldCheck,
  ShieldX,
  Sun,
  UserPlus,
  X,
} from 'lucide-react'
import Home from './home'
import AccessesView, { ApiVisitor } from './accesses-view'
import DepartmentsView, { Department } from './departments-view'
import CompaniesView from './companies-view'
import ReportsView from './reports-view'
import { Field, Modal, OptionalField } from './form-modal'
import UsersView from './users-view'
import ValidateAccessView from './validate-access-view'
import { AuthUser, fetchMe, getCurrentUser, logout } from '../services/auth'
import { createVisitor, updateVisitor } from '../services/visitors'
import { getDepartments } from '../services/departments'
import { createBooklog, getBooklog } from '../services/booklog'

const TIMEZONE = 'America/Santiago'

// Fecha de hoy en formato YYYY-MM-DD (zona horaria de Chile)
const getTodayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })

export interface NoteItem {
  id: string
  time: string
  text: string
  visitor: string
  guard: string
  date: string
}

interface ApiBooklog {
  id: string
  action: string
  createdAt: string
  creator?: { id: string; username: string } | null
  visitor?: { id: string; name: string; lastnames: string; run: string } | null
}

// Convierte un registro de /booklog al formato que muestra la vista
const toNoteItem = (log: ApiBooklog): NoteItem => {
  const created = new Date(log.createdAt)
  return {
    id: log.id,
    time: created.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: TIMEZONE,
    }),
    text: log.action,
    visitor: log.visitor
      ? `${log.visitor.name} ${log.visitor.lastnames} (${log.visitor.run})`
      : '',
    guard: log.creator?.username || '—',
    date: created.toLocaleDateString('en-CA', { timeZone: TIMEZONE }),
  }
}

const fetchNotes = async (date?: string): Promise<NoteItem[]> => {
  const response = await getBooklog(date)
  const list: ApiBooklog[] = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : []
  return list.map(toNoteItem)
}

const listPeople = {
  black: [
    {
      name: 'Rodrigo Pérez',
      detail: 'Acceso restringido · 02/06/2025',
      initials: 'RP',
      color: 'bg-[#fef2f2] text-[#b91c1c]',
    },
    {
      name: 'Vehículo patente LK-PJ-45',
      detail: 'Reportado por administración',
      initials: 'LK',
      color: 'bg-[#f1f5f9] text-[#475569]',
    },
  ],
}

type Module =
  | 'inicio'
  | 'accesos'
  | 'novedades'
  | 'negra'
  | 'usuarios'
  | 'validar'
  | 'departamentos'
  | 'empresas'
  | 'reportes'

interface NavItem {
  id: Module
  label: string
  icon: typeof LayoutDashboard
  count?: number
}

export function AccessDashboard() {
  const router = useRouter()
  const [activeModule, setActiveModule] = useState<Module>('inicio')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [todayNotes, setTodayNotes] = useState<NoteItem[]>([])
  const [notesVersion, setNotesVersion] = useState(0)
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError] = useState('')
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [noteDate, setNoteDate] = useState(getTodayISO)
  const [toast, setToast] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [blackPeople, setBlackPeople] = useState(listPeople.black)
  const [showBlackForm, setShowBlackForm] = useState(false)
  const [savingVisit, setSavingVisit] = useState(false)
  const [visitError, setVisitError] = useState('')
  const [visitsVersion, setVisitsVersion] = useState(0)
  const [editingVisitor, setEditingVisitor] = useState<ApiVisitor | null>(null)
  // ¿A la visita se le entregará tarjeta al ingresar? Define si portería asigna una
  const [visitUsesCard, setVisitUsesCard] = useState(true)
  // Departamentos para el formulario de accesos (el PROPIETARIO recibe solo los suyos)
  const [departments, setDepartments] = useState<Department[]>([])

  // Obtener perfil en mayúsculas (por defecto ADMIN si no viene especificado)
  const userRole = (currentUser?.profile?.name || 'ADMIN').toUpperCase()
  // SUPERADMIN tiene todos los permisos de ADMIN dentro de su empresa
  const isAdminRole = userRole === 'ADMIN' || userRole === 'SUPERADMIN'
  // PROPIETARIO: propietario de uno o más departamentos, crea los accesos de sus departamentos
  const isOwnerRole = userRole === 'PROPIETARIO'
  // ¿Este condominio entrega tarjetas en portería? Se define en Empresas.
  const cardsEnabled = currentUser?.company?.cardsEnabled !== false
  // ¿Los accesos pueden valer por un período con fecha de inicio y de término? (arriendos)
  const allowsDateRange = currentUser?.company?.allowsDateRange === true

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const user = getCurrentUser()
    if (!token) {
      router.push('/login')
      return
    }
    if (user) {
      setCurrentUser(user)
      const role = (user.profile?.name || 'ADMIN').toUpperCase()
      if (role === 'PROPIETARIO') {
        setActiveModule('accesos')
      } else if (role === 'CONSERJE') {
        setActiveModule('validar')
      } else {
        setActiveModule('inicio')
      }
    }
    setCheckingAuth(false)
  }, [router])

  // Refresca el usuario y su empresa (por si cambió su configuración desde el último inicio de sesión)
  useEffect(() => {
    if (checkingAuth) return
    fetchMe()
      .then((me) => setCurrentUser((prev) => (prev ? { ...prev, ...me } : me)))
      .catch((err) => console.error('Error refreshing user:', err))
  }, [checkingAuth])

  const loadDepartments = async () => {
    try {
      const response = await getDepartments()
      const list: Department[] = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : []
      setDepartments(list)
    } catch (err) {
      console.error('Error fetching departments:', err)
    }
  }

  useEffect(() => {
    if (!checkingAuth) {
      loadDepartments()
    }
  }, [checkingAuth])

  useEffect(() => {
    if (checkingAuth) return
    fetchNotes(getTodayISO())
      .then(setTodayNotes)
      .catch((err) => console.error('Error fetching booklog:', err))
  }, [checkingAuth, notesVersion])

  const showToast = (message: string, durationMs = 3000) => {
    setToast(message)
    window.setTimeout(() => setToast(''), durationMs)
  }

  const openCreateVisit = () => {
    setEditingVisitor(null)
    setVisitUsesCard(true)
    setVisitError('')
    setShowVisitForm(true)
  }

  const openEditVisit = (visitor: ApiVisitor) => {
    setEditingVisitor(visitor)
    setVisitUsesCard(visitor.usesCard !== false)
    setVisitError('')
    setShowVisitForm(true)
  }

  const closeVisitForm = () => {
    setShowVisitForm(false)
    setEditingVisitor(null)
  }

  const handleLogout = () => {
    setShowLogoutModal(false)
    logout()
    setCurrentUser(null)
    router.push('/login')
  }


  const addVisit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    // "HH:mm" del input → "HH:mm:00" que espera la API
    const toApiTime = (value: FormDataEntryValue | null) => {
      const text = String(value || '')
      return text.length === 5 ? `${text}:00` : text
    }
    const hour = toApiTime(data.get('access_hour'))

    const accessDate = String(data.get('access_date') || '')
    const endDate = allowsDateRange ? String(data.get('end_date') || '') : ''
    if (endDate && endDate < accessDate) {
      setVisitError('La fecha de término no puede ser anterior a la fecha de inicio.')
      return
    }

    const payload = {
      name: String(data.get('name') || '').trim(),
      run: String(data.get('run') || '').trim(),
      paternal_lastname: String(data.get('paternal_lastname') || '').trim(),
      maternal_lastname: String(data.get('maternal_lastname') || '').trim(),
      departmentId: String(data.get('departmentId') || ''),
      access_date: accessDate,
      // Solo en condominios con períodos. Vacío = el acceso vale un solo día
      ...(allowsDateRange ? { end_date: endDate } : {}),
      access_hour: hour,
      uses_card: cardsEnabled ? visitUsesCard : false,
    }

    setSavingVisit(true)
    setVisitError('')
    try {
      const wasEditing = Boolean(editingVisitor)
      if (editingVisitor) {
        await updateVisitor(editingVisitor.id, payload)
      } else {
        await createVisitor(payload)
      }
      closeVisitForm()
      setVisitsVersion((v) => v + 1)
      showToast(wasEditing ? 'Acceso actualizado correctamente' : 'Acceso registrado correctamente')
    } catch (err) {
      console.error('Error creating visitor:', err)
      const apiMessage = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      setVisitError(
        (Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage) ||
          'No se pudo guardar el acceso. Intenta nuevamente.'
      )
    } finally {
      setSavingVisit(false)
    }
  }

  const addBlackPerson = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name'))
    const detail = String(data.get('detail'))
    setBlackPeople((current) => [
      {
        name,
        detail: detail || 'Agregado por administración',
        initials: name
          .split(' ')
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
        color: 'bg-[#fef2f2] text-[#b91c1c]',
      },
      ...current,
    ])
    setShowBlackForm(false)
    setToast('Persona agregada a la lista negra')
    window.setTimeout(() => setToast(''), 3000)
  }

  const openNoteForm = () => {
    setNoteError('')
    setShowNoteForm(true)
  }

  const addNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const action = String(data.get('action') || '').trim()
    if (!action) return

    setSavingNote(true)
    setNoteError('')
    try {
      await createBooklog({ action })
      setShowNoteForm(false)
      setNoteDate(getTodayISO())
      setNotesVersion((v) => v + 1)
      showToast('Novedad guardada en el libro')
    } catch (err) {
      console.error('Error creating booklog:', err)
      setNoteError('No se pudo guardar la novedad. Intenta nuevamente.')
    } finally {
      setSavingNote(false)
    }
  }

  // Configuración de menús según el rol del usuario
  const navItems: NavItem[] = []

  if (isAdminRole) {
    navItems.push(
      { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
      { id: 'accesos', label: 'Accesos', icon: ArrowDownToLine },
      { id: 'reportes', label: 'Reportes', icon: FileBarChart },
      { id: 'novedades', label: 'Libro de novedades', icon: BookOpen },
      { id: 'departamentos', label: 'Departamentos', icon: DoorOpen },
      { id: 'usuarios', label: 'Usuarios', icon: UserPlus },
      { id: 'negra', label: 'Lista negra', icon: ShieldX, count: 3 }
    )
    // SUPERADMIN además administra las empresas de la plataforma
    if (userRole === 'SUPERADMIN') {
      navItems.push({ id: 'empresas', label: 'Empresas', icon: Building2 })
    }
  } else if (isOwnerRole) {
    // PROPIETARIO: ve y crea los accesos de sus departamentos (no edita ni elimina)
    navItems.push({ id: 'accesos', label: 'Accesos', icon: ArrowDownToLine })
  } else if (userRole === 'CONSERJE') {
    navItems.push(
      { id: 'validar', label: 'Validar accesos', icon: QrCode },
      { id: 'accesos', label: 'Accesos', icon: ArrowDownToLine },
      { id: 'novedades', label: 'Libro de novedades', icon: BookOpen }
    )
  } else {
    // Fallback general
    navItems.push(
      { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
      { id: 'accesos', label: 'Accesos', icon: ArrowDownToLine }
    )
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white px-5 py-4 shadow-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#004b93] border-t-transparent" />
          <span className="text-xs font-semibold text-[#64748b]">
            Verificando sesión...
          </span>
        </div>
      </div>
    )
  }

  // La API devuelve los apellidos juntos ("Pérez González"): se separan por el primer espacio
  const editingLastnames = (() => {
    const [paternal = '', ...rest] = (editingVisitor?.lastnames || '').trim().split(/\s+/)
    return { paternal, maternal: rest.join(' ') }
  })()

  // Ej. "Lunes, 16 de noviembre de 2026"
  const headerDate = (() => {
    const text = new Date().toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: TIMEZONE,
    })
    return text.charAt(0).toUpperCase() + text.slice(1)
  })()

  const userDisplayName = currentUser ? currentUser.username : 'Usuario'
  const userInitials = currentUser?.username
    ? currentUser.username.slice(0, 2).toUpperCase()
    : 'US'

  return (
    <div
      className={`min-h-screen w-full max-w-full overflow-x-hidden bg-[#f8fafc] text-[#0f172a] ${darkMode ? 'dark-mode' : ''
        }`}
    >
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-[#e2e8f0] bg-white transition-transform lg:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex h-[84px] items-center gap-3 border-b border-[#e2e8f0] px-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#004b93] text-white shadow-sm">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-[-0.02em] text-[#0f172a]">
              FEMAccess
            </p>
            <p className="text-[11px] font-medium text-[#64748b]">
              Gestión de accesos
            </p>
          </div>
        </div>

        <div className="px-4 pt-8">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
            Menú principal
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeModule === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveModule(item.id)
                    setMobileMenu(false)
                  }}
                  className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[13px] font-semibold transition-all duration-200 ${isActive
                    ? 'bg-[#e8f1fa] text-[#004b93]'
                    : 'text-[#64748b] hover:translate-x-1 hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                    }`}
                >
                  {/* Barra indicadora del módulo activo */}
                  <span
                    className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#004b93] transition-all duration-300 ${
                      isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
                    }`}
                  />
                  <Icon
                    size={17}
                    strokeWidth={isActive ? 2.3 : 1.8}
                    className="transition-transform duration-200 group-hover:scale-110"
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.count && (
                    <span
                      key={item.count}
                      className={`fa-pop rounded-md px-2 py-0.5 text-[11px] ${isActive
                        ? 'bg-white text-[#004b93]'
                        : 'bg-[#f1f5f9] text-[#64748b]'
                        }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-[#e2e8f0] p-4">
          <div className="flex items-center gap-3 rounded-xl border border-[#f1f5f9] bg-[#f8fafc] p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f1fa] text-xs font-bold text-[#004b93]">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-[#0f172a]">
                {userDisplayName}
              </p>
              <span className="inline-block rounded-md bg-[#e0f2fe] px-1.5 py-0.5 text-[9px] font-bold text-[#0284c7]">
                {userRole}
              </span>
              {currentUser?.company?.name && (
                <p className="mt-0.5 truncate text-[10px] text-[#64748b]">
                  {currentUser.company.name}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="text-[#94a3b8] transition hover:text-[#b91c1c]"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 overflow-x-hidden lg:pl-[260px]">
        {/* Top Header */}
        <header className="flex min-h-[84px] w-full max-w-full items-center justify-between gap-2 overflow-hidden border-b border-[#e2e8f0] bg-white px-3 py-3 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-2">
            <button
              className="rounded-lg p-2 text-[#64748b] hover:bg-[#f1f5f9] lg:hidden"
              onClick={() => setMobileMenu(true)}
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="hidden text-[11px] font-semibold uppercase tracking-[0.13em] text-[#94a3b8] sm:block">
                {headerDate}
              </p>
              <h1 className="mt-1 truncate text-[18px] font-bold tracking-[-0.03em] text-[#0f172a] sm:text-[21px]">
                {activeModule === 'inicio'
                  ? `Buenos días, ${currentUser?.username || 'Usuario'}`
                  : navItems.find((item) => item.id === activeModule)?.label}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-4">
            {/* <button
              onClick={() => setDarkMode((current) => !current)}
              className="rounded-full p-2 text-[#64748b] hover:bg-[#f1f5f9]"
              aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
              title={darkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button> */}
          </div>
        </header>

        {/* Dynamic View Content */}
        <main className="mx-auto min-w-0 max-w-[1440px] overflow-x-hidden p-3 sm:p-8 lg:p-10">
          {/* key: al cambiar de módulo se vuelve a montar y se reproduce la animación de entrada */}
          <div key={activeModule} className="fa-fade-up">
          {activeModule === 'inicio' && (
            <Home
              key={`home-${visitsVersion}`}
              notes={todayNotes}
              onAddVisit={openCreateVisit}
              onAddNote={openNoteForm}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'validar' && <ValidateAccessView cardsEnabled={cardsEnabled} />}

          {activeModule === 'accesos' && (
            <AccessesView
              key={`accesses-${visitsVersion}`}
              canCreate={isAdminRole || isOwnerRole}
              canManage={isAdminRole}
              showCards={cardsEnabled}
              onAdd={openCreateVisit}
              onEdit={openEditVisit}
              onToast={showToast}
            />
          )}

          {activeModule === 'usuarios' && <UsersView userRole={userRole} onToast={showToast} />}

          {activeModule === 'reportes' && isAdminRole && <ReportsView showCards={cardsEnabled} />}

          {activeModule === 'empresas' && userRole === 'SUPERADMIN' && (
            <CompaniesView currentCompanyId={currentUser?.company?.id} onToast={showToast} />
          )}

          {activeModule === 'departamentos' && isAdminRole && (
            <DepartmentsView
              onChange={loadDepartments}
              onToast={showToast}
            />
          )}

          {activeModule === 'novedades' && (
            <Notes
              key={`notes-${notesVersion}`}
              selectedDate={noteDate}
              onDateChange={setNoteDate}
              onAdd={openNoteForm}
            />
          )}

          {activeModule === 'negra' && (
            <ListView
              people={blackPeople}
              onAdd={() => setShowBlackForm(true)}
            />
          )}
          </div>
        </main>
      </div>

      {/* Modal: Confirmación de Cierre de Sesión */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fef2f2] text-[#b91c1c]">
                <LogOut size={24} />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#0f172a]">
                ¿Seguro que deseas cerrar tu sesión?
              </h3>
              <p className="mt-1.5 text-xs text-[#64748b]">
                Tendrás que volver a ingresar tus credenciales para acceder al sistema.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-xl border border-[#cbd5e1] bg-white py-2.5 text-xs font-bold text-[#334155] transition hover:bg-[#f8fafc]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-[#b91c1c] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#991b1b]"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Formulario Visita */}
      {showVisitForm && (
        <Modal
          title={editingVisitor ? 'Editar acceso' : 'Agregar nuevo acceso'}
          onClose={closeVisitForm}
        >
          <form onSubmit={addVisit} autoComplete="off" className="space-y-4">
            <Field
              label="Nombre"
              name="name"
              placeholder="Ej. María José"
              defaultValue={editingVisitor?.name}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Apellido paterno"
                name="paternal_lastname"
                placeholder="Ej. Pérez"
                defaultValue={editingLastnames.paternal}
              />
              <Field
                label="Apellido materno"
                name="maternal_lastname"
                placeholder="Ej. González"
                defaultValue={editingLastnames.maternal}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="RUT"
                name="run"
                placeholder="12345678-9"
                defaultValue={editingVisitor?.run}
              />
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[#334155]">
                  Departamento
                </span>
                <select
                  required
                  name="departmentId"
                  defaultValue={
                    editingVisitor?.departmentId ||
                    editingVisitor?.department?.id ||
                    // Un PROPIETARIO con un solo departamento lo tiene preseleccionado
                    (!editingVisitor && departments.length === 1 ? departments[0].id : '')
                  }
                  className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm text-[#0f172a] outline-none transition focus:border-[#004b93] focus:ring-2 focus:ring-[#004b93]/10"
                >
                  <option value="" disabled>
                    {departments.length === 0 ? 'No hay departamentos' : 'Selecciona un departamento'}
                  </option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {allowsDateRange ? (
              <div className="space-y-1.5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={allowsDateRange ? 'Fecha de inicio' : 'Fecha de ingreso'}
                    name="access_date"
                    type="date"
                    defaultValue={editingVisitor?.date}
                  />
                  <OptionalField
                    label="Fecha de término"
                    name="end_date"
                    type="date"
                    defaultValue={
                      editingVisitor?.endDate && editingVisitor.endDate > editingVisitor.date
                        ? editingVisitor.endDate
                        : ''
                    }
                  />
                </div>
                <p className="text-[11px] text-[#64748b]">
                  Para arriendos: la persona puede entrar y salir cualquier día entre ambas fechas. Sin fecha de
                  término, la visita vale solo el día de inicio.
                </p>
              </div>
            ) : (
              <Field
                label="Fecha de ingreso"
                name="access_date"
                type="date"
                defaultValue={editingVisitor?.date}
              />
            )}
            <Field
              label="Hora de llegada"
              name="access_hour"
              type="time"
              defaultValue={editingVisitor?.startHour?.slice(0, 5)}
            />

            {/* ¿Usará tarjeta? Solo si la empresa entrega tarjetas. Si no, portería no pedirá asignar una */}
            {cardsEnabled && (
            <fieldset disabled={Boolean(editingVisitor?.isArrivalValidated)}>
              <legend className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#334155]">
                <CreditCard size={14} className="text-[#004b93]" /> ¿Usará tarjeta?
              </legend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="¿Usará tarjeta?">
                {[
                  { value: true, label: 'Sí, usará tarjeta', hint: 'Se le asigna una en portería', Icon: CreditCard },
                  { value: false, label: 'No usará tarjeta', hint: 'Ingresa sin tarjeta', Icon: Ban },
                ].map(({ value, label, hint, Icon }) => {
                  const selected = visitUsesCard === value
                  return (
                    <button
                      key={String(value)}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setVisitUsesCard(value)}
                      className={`relative flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                        selected
                          ? 'border-[#004b93] bg-[#e8f1fa] shadow-[0_4px_14px_rgba(0,75,147,0.14)]'
                          : 'border-[#e2e8f0] bg-white hover:-translate-y-0.5 hover:border-[#cbd5e1] hover:bg-[#f8fafc]'
                      }`}
                    >
                      <Icon
                        size={18}
                        className={`transition-transform duration-300 ${
                          selected ? 'scale-110 text-[#004b93]' : 'text-[#94a3b8]'
                        }`}
                      />
                      <span className={`text-xs font-bold ${selected ? 'text-[#004b93]' : 'text-[#334155]'}`}>
                        {label}
                      </span>
                      <span className="text-[10px] text-[#64748b]">{hint}</span>
                      {selected && (
                        <span className="fa-pop absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#004b93] text-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {editingVisitor?.isArrivalValidated && (
                <p className="mt-1.5 text-[11px] text-[#64748b]">
                  La visita ya ingresó: no se puede cambiar.
                </p>
              )}
            </fieldset>
            )}
            {visitError && (
              <div className="rounded-lg bg-[#fef2f2] p-3 text-xs font-semibold text-[#b91c1c]">
                {visitError}
              </div>
            )}
            <button
              type="submit"
              disabled={savingVisit}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#004b93] py-3 text-sm font-bold text-white transition hover:bg-[#003870] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={17} />{' '}
              {savingVisit
                ? 'Guardando...'
                : editingVisitor
                  ? 'Guardar cambios'
                  : 'Registrar ingreso'}
            </button>
          </form>
        </Modal>
      )}

      {/* Modal: Formulario Lista Negra */}
      {showBlackForm && (
        <Modal
          title="Agregar a lista negra"
          onClose={() => setShowBlackForm(false)}
        >
          <form onSubmit={addBlackPerson} className="space-y-4">
            <Field
              label="Nombre o identificación"
              name="name"
              placeholder="Ej. Pedro González"
            />
            <Field
              label="Motivo o detalle"
              name="detail"
              placeholder="Ej. Acceso restringido por administración"
            />
            <button
              type="submit"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#b91c1c] py-3 text-sm font-bold text-white transition hover:bg-[#991b1b]"
            >
              <Check size={17} /> Agregar a lista negra
            </button>
          </form>
        </Modal>
      )}

      {/* Modal: Formulario Novedad */}
      {showNoteForm && (
        <Modal
          title="Registrar novedad"
          onClose={() => setShowNoteForm(false)}
        >
          <form onSubmit={addNote} autoComplete="off" className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-[#334155]">
                Novedad
              </span>
              <textarea
                required
                name="action"
                rows={4}
                autoFocus
                placeholder="Ej. Llegó producto afuera / Pasa policía preguntando por..."
                className="w-full resize-none rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#004b93] focus:ring-2 focus:ring-[#004b93]/10"
              />
            </label>
            {noteError && (
              <div className="rounded-lg bg-[#fef2f2] p-3 text-xs font-semibold text-[#b91c1c]">
                {noteError}
              </div>
            )}
            <button
              type="submit"
              disabled={savingNote}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#004b93] py-3 text-sm font-bold text-white transition hover:bg-[#003870] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={17} /> {savingNote ? 'Guardando...' : 'Guardar novedad'}
            </button>
          </form>
        </Modal>
      )}

      {/* Toast Notificación */}
      {toast && (
        <div
          role="status"
          className="fa-toast fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-center gap-2 rounded-lg bg-[#003870] px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <span className="fa-pop-delayed flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Check size={13} className="text-[#7dd3fc]" strokeWidth={3} />
          </span>
          {toast}
        </div>
      )}
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="order-last flex items-center justify-end gap-2 border-t border-[#edf1ee] px-4 py-3">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-md border border-[#dce5e0] px-2.5 py-1.5 text-xs font-semibold text-[#50615a] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="text-xs text-[#7e8984]">
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-md border border-[#dce5e0] px-2.5 py-1.5 text-xs font-semibold text-[#50615a] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  )
}

function Notes({
  selectedDate,
  onDateChange,
  onAdd,
}: {
  selectedDate: string
  onDateChange: (value: string) => void
  onAdd: () => void
}) {
  const [filteredNotes, setFilteredNotes] = useState<NoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchNotes(selectedDate || undefined)
      .then((list) => {
        if (cancelled) return
        setFilteredNotes(list)
        setPage(1)
      })
      .catch((err) => {
        console.error('Error fetching booklog:', err)
        if (!cancelled) setError('No se pudieron cargar las novedades. Verifica la conexión.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedDate])

  const pageSize = 5
  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / pageSize))
  const pagedNotes = filteredNotes.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="flex flex-col gap-6">
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-[#7e8984]">Registro diario del turno</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#004b93] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#003870]"
        >
          <Plus size={16} /> Registrar novedad
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-7">
        <div className="mb-7 flex flex-col gap-4 border-b border-[#edf0ee] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f1fa] text-[#004b93]">
              <CalendarDays size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Libro diario</p>
              <p className="mt-1 text-xs text-[#64748b]">
                Selecciona una fecha para consultar sus registros
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#334155]">
            <CalendarDays size={15} className="text-[#004b93]" />
            <span className="sr-only">Buscar novedades por fecha</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="bg-transparent text-xs font-semibold outline-none"
            />
          </label>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[#fef2f2] p-3 text-xs font-semibold text-[#b91c1c]">
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-10 text-center text-xs text-[#64748b]">Cargando novedades...</p>
        ) : filteredNotes.length === 0 && !error ? (
          <p className="py-10 text-center text-xs text-[#64748b]">
            No hay novedades registradas para esta fecha.
          </p>
        ) : null}

        <div className="space-y-0">
          {!loading && pagedNotes.map((note, index) => (
            <div key={note.id} className="flex gap-5">
              <div className="flex w-14 shrink-0 flex-col items-end">
                <span className="text-xs font-bold text-[#52605a]">
                  {note.time}
                </span>
                {index !== pagedNotes.length - 1 && (
                  <span className="mr-1.5 mt-2 h-full min-h-12 w-px bg-[#cbd5e1]" />
                )}
              </div>
              <div className="relative mb-6 flex-1 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <span className="absolute -left-[25px] top-4 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#004b93]" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="whitespace-pre-line text-sm font-semibold text-[#0f172a]">
                      {note.text}
                    </p>
                    {note.visitor && (
                      <p className="mt-1.5 text-xs text-[#64748b]">Visita: {note.visitor}</p>
                    )}
                  </div>
                  <FileText size={16} className="shrink-0 text-[#94a3b8]" />
                </div>
                <p className="mt-3 text-[10px] font-semibold text-[#94a3b8]">
                  Registrado por {note.guard}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ListView({
  people,
  onAdd,
}: {
  people: typeof listPeople.black
  onAdd: () => void
}) {
  const [page, setPage] = useState(1)
  const pageSize = 5
  const totalPages = Math.max(1, Math.ceil(people.length / pageSize))
  const pagedPeople = people.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="flex flex-col gap-6">
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-[#7e8984]">Personas y accesos restringidos</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#b91c1c] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#991b1b]"
        >
          <Plus size={16} /> Agregar persona
        </button>
      </div>

      <div className="rounded-xl border border-[#fee2e2] bg-[#fff5f5] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fee2e2] text-[#b91c1c]">
            <ShieldX size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#991b1b]">Acceso restringido</p>
            <p className="mt-1 text-xs text-[#b91c1c]">
              Estas personas o vehículos no pueden ingresar al recinto.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {pagedPeople.map((person) => (
          <div
            key={person.name}
            className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${person.color}`}
            >
              {person.initials}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#0f172a]">{person.name}</p>
              <p className="mt-1 text-xs text-[#64748b]">{person.detail}</p>
            </div>
            <ChevronDown size={16} className="-rotate-90 text-[#94a3b8]" />
          </div>
        ))}
      </div>
    </div>
  )
}
