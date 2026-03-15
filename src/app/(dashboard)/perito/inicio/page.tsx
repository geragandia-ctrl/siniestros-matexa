'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function PeritoInicio() {
  const [compania, setCompania]         = useState<any>(null)
  const [peritaciones, setPeritaciones] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [isMobile, setIsMobile]         = useState(false)

  useEffect(() => {
    cargarDatos()
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function cargarDatos() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*, compania:companias(id, nombre)')
      .eq('id', session.user.id)
      .single()

    if (!usuario) return
    setCompania(usuario.compania)

    const { data: perData } = await supabase
      .from('peritaciones')
      .select('*, taller:talleres(nombre_fantasia), compania:companias(nombre)')
      .eq('perito_id', session.user.id)
      .in('estado', ['enviada', 'recibida'])
      .order('created_at', { ascending: false })
      .limit(20)

    setPeritaciones(perData || [])
    setLoading(false)
  }

  const hora    = new Date().getHours()
  const saludo  = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'
  const enviadas  = peritaciones.filter(p => p.estado === 'enviada').length
  const recibidas = peritaciones.filter(p => p.estado === 'recibida').length
  const recientes = peritaciones.slice(0, 5)

  function badgeEstado(estado: string) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      enviada:  { label: 'Para revisar', bg: '#EDE9FE', color: '#6D28D9' },
      recibida: { label: 'Recibida ✓',   bg: '#E6FBF3', color: '#047857' },
    }
    const s = map[estado] || { label: estado, bg: '#F0F2F5', color: '#8896A8' }
    return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>{s.label}</span>
  }

  function tiempoRelativo(fecha: string) {
    const diff = Date.now() - new Date(fecha).getTime()
    const dias = Math.floor(diff / 86400000)
    if (dias === 0) return 'Hoy'
    if (dias === 1) return 'Ayer'
    return `Hace ${dias} días`
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <p style={{ fontSize: 14, color: '#8896A8' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Título */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: isMobile ? 22 : 24, fontWeight: 700, color: '#0F1623', marginBottom: 4, letterSpacing: -.3 }}>
          {saludo} 👋
        </h1>
        <p style={{ fontSize: 14, color: '#8896A8' }}>
          Peritaciones de <strong>{compania?.nombre || 'tu compañía'}</strong>
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 10 : 16, marginBottom: 24 }}>
        {[
          { icon: '📋', bg: '#EDE9FE', label: 'Para revisar', value: enviadas,  sub: 'Sin confirmar' },
          { icon: '✅', bg: '#E6FBF3', label: 'Confirmadas',  value: recibidas, sub: 'Este período' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 16, padding: isMobile ? '14px 12px' : 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, marginBottom: 10 }}>
              {stat.icon}
            </div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: isMobile ? 24 : 28, fontWeight: 700, color: '#0F1623', lineHeight: 1, marginBottom: 4 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: isMobile ? 11 : 13, color: '#8896A8' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recientes */}
      <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '16px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E6EC' }}>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#0F1623' }}>Recientes</span>
          <Link href="/perito/peritaciones" style={{ fontSize: 12, fontWeight: 600, color: '#3e838c', textDecoration: 'none' }}>
            Ver todas →
          </Link>
        </div>
        <div>
          {recientes.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: '#8896A8' }}>
              No hay peritaciones todavía.
            </div>
          ) : recientes.map(p => (
            <Link key={p.id} href={`/perito/peritaciones/${p.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #F7F8FA', textDecoration: 'none' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: p.estado === 'enviada' ? '#7C3AED' : '#0DBF7E' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0F1623', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.vehiculo || 'Vehículo'}{p.patente ? ` · ${p.patente}` : ''}
                </div>
                <div style={{ fontSize: 12, color: '#8896A8', marginTop: 1 }}>{p.taller?.nombre_fantasia || ''}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                {badgeEstado(p.estado)}
                <span style={{ fontSize: 11, color: '#8896A8' }}>{tiempoRelativo(p.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Accesos rápidos — solo desktop */}
      {!isMobile && (
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #E2E6EC' }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#0F1623' }}>Accesos rápidos</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#E2E6EC' }}>
            {[
              { href: '/perito/peritaciones?estado=enviada',  icon: '📋', bg: '#EDE9FE', title: 'Para revisar', sub: `${enviadas} sin confirmar` },
              { href: '/perito/peritaciones',                 icon: '🔍', bg: '#eaf4f4', title: 'Ver todas',    sub: `${peritaciones.length} peritaciones` },
              { href: '/perito/peritaciones?estado=recibida', icon: '✅', bg: '#E6FBF3', title: 'Confirmadas',  sub: `${recibidas} recibidas` },
              { href: '/perito/peritaciones',                 icon: '🏢', bg: '#F0F2F5', title: compania?.nombre || 'Mi compañía', sub: 'Ver todo' },
            ].map(item => (
              <Link key={item.href + item.title} href={item.href}
                style={{ background: 'white', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F7F8FA')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F1623' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#8896A8' }}>{item.sub}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}