'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Usuario } from '@/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [perfil, setPerfil]           = useState<Usuario | null>(null)
  const [loading, setLoading]         = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile]       = useState(false)

  useEffect(() => {
    checkAuth()
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F7F8FA' }}>
      <p style={{ fontSize: 14, color: '#8896A8', fontFamily: 'DM Sans, sans-serif' }}>Cargando...</p>
    </div>
  )

  const sidebarWidth = 240

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FA' }}>

      {/* Overlay mobile */}
      {sidebarOpen && isMobile && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 49 }}
        />
      )}

      {/* SIDEBAR */}
      <aside style={{
        width: sidebarWidth,
        background: '#0F1623',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
        transform: isMobile && !sidebarOpen ? `translateX(-${sidebarWidth}px)` : 'translateX(0)',
        transition: 'transform .3s ease',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ width: 36, height: 36, background: '#195e63', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 800, color: 'white', flexShrink: 0 }}>M</div>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>Matexa</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 600, letterSpacing: .5 }}>siniestros</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: '20px 12px 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,.25)', padding: '0 8px', marginBottom: 6 }}>
            {esTaller ? 'Taller' : 'Compañía'}
          </div>
          {navItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setSidebarOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 10px', borderRadius: 8,
                  fontSize: 14, fontWeight: 500,
                  color: active ? 'white' : 'rgba(255,255,255,.45)',
                  background: active ? '#195e63' : 'transparent',
                  textDecoration: 'none', marginBottom: 2,
                  transition: 'all .18s',
                }}
              >
                <span style={{ width: 20, textAlign: 'center', fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Bottom */}
        <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#195e63', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>
              {perfil?.nombre ? iniciales(perfil.nombre) : '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{perfil?.nombre || ''}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{esTaller ? 'Taller' : 'Perito'}</div>
            </div>
          </div>
          <button
            onClick={cerrarSesion}
            style={{ width: '100%', marginTop: 8, padding: '9px', background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{
        marginLeft: isMobile ? 0 : sidebarWidth,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        transition: 'margin-left .3s ease',
      }}>

        {/* Header */}
        <header style={{
          height: 60,
          background: 'white',
          borderBottom: '1px solid #E2E6EC',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          gap: 12,
        }}>
          {/* Hamburguesa — solo mobile */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#4A5568', padding: 4, display: 'flex', alignItems: 'center' }}
            >
              ☰
            </button>
          )}

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#8896A8' }}>
            <span>{esTaller ? 'Taller' : 'Perito'}</span>
            <span style={{ color: '#C8D0DC' }}>›</span>
            <span style={{ fontWeight: 600, color: '#0F1623' }}>
              {navItems.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))?.label || ''}
            </span>
          </div>

          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#eaf4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#063940', cursor: 'pointer', flexShrink: 0 }}>
            {perfil?.nombre ? iniciales(perfil.nombre) : '?'}
          </div>
        </header>

        {/* Contenido */}
        <main style={{ padding: isMobile ? '20px 16px' : 28, flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  )
}