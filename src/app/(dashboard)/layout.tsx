'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Usuario } from '@/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [perfil, setPerfil]       = useState<Usuario | null>(null)
  const [loading, setLoading]     = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data } = await supabase.from('usuarios').select('*').eq('id', session.user.id).single()
    if (!data) { router.push('/login'); return }
    setPerfil(data)
    setLoading(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function iniciales(nombre: string) {
    return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  }

  const esTaller = perfil?.rol === 'taller'

  const navTaller = [
    { href: '/taller/inicio',        icon: '🏠', label: 'Inicio' },
    { href: '/taller/peritaciones',  icon: '📋', label: 'Peritaciones' },
    { href: '/taller/configuracion', icon: '⚙️', label: 'Mi taller' },
  ]
  const navPerito = [
    { href: '/perito/inicio',        icon: '🏠', label: 'Inicio' },
    { href: '/perito/peritaciones',  icon: '📋', label: 'Peritaciones' },
  ]
  const navItems = esTaller ? navTaller : navPerito

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <p className="text-sm text-gray-400 font-dm">Cargando...</p>
    </div>
  )

  return (
    <div className="flex min-h-screen">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-[49]" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`w-60 bg-neutral-900 flex flex-col fixed top-0 left-0 bottom-0 z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.07]">
          <div className="w-[34px] h-[34px] bg-brand-medium rounded-[9px] flex items-center justify-center font-sora text-base font-extrabold text-white flex-shrink-0">M</div>
          <div>
            <div className="font-sora text-[17px] font-extrabold text-white leading-tight">Matexa</div>
            <div className="text-[10px] text-white/35 font-semibold tracking-wide">siniestros</div>
          </div>
        </div>

        {/* Nav */}
        <div className="px-3 pt-5 pb-2">
          <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-white/25 px-2 mb-1.5">
            {esTaller ? 'Taller' : 'Compañía'}
          </div>
          {navItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium mb-0.5 transition-all duration-150 no-underline ${active ? 'bg-brand-medium text-white' : 'text-white/45 hover:bg-white/[0.06] hover:text-white/85'}`}
              >
                <span className="w-[18px] text-center text-[15px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Bottom */}
        <div className="mt-auto p-3 border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg">
            <div className="w-[34px] h-[34px] rounded-full bg-brand-medium flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0">
              {perfil?.nombre ? iniciales(perfil.nombre) : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-white truncate">{perfil?.nombre || ''}</div>
              <div className="text-[11px] text-white/35">{esTaller ? 'Taller' : 'Perito'}</div>
            </div>
          </div>
          <button
            onClick={cerrarSesion}
            className="w-full mt-2 py-2 bg-white/[0.08] border-0 rounded-lg text-white/50 text-[13px] cursor-pointer hover:bg-white/[0.12] transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="md:ml-60 flex-1 flex flex-col min-h-screen">

        {/* Header */}
        <header className="h-[60px] bg-white border-b border-neutral-border flex items-center px-7 sticky top-0 z-40 gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden bg-transparent border-0 cursor-pointer text-xl text-neutral-secondary"
          >☰</button>
          <div className="flex-1 flex items-center gap-1.5 text-[13px] text-neutral-secondary">
            <span>{esTaller ? 'Taller' : 'Perito'}</span>
            <span className="text-neutral-border">›</span>
            <span className="font-semibold text-neutral-900">
              {navItems.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))?.label || ''}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-[13px] font-bold text-brand-dark cursor-pointer">
            {perfil?.nombre ? iniciales(perfil.nombre) : '?'}
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="p-7 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}