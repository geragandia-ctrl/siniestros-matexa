'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Peritacion, Taller } from '@/types'

export default function TallerInicio() {
  const [taller, setTaller]             = useState<Taller | null>(null)
  const [peritaciones, setPeritaciones] = useState<Peritacion[]>([])
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
      .from('usuarios').select('taller_id').eq('id', session.user.id).single()
    if (!usuario?.taller_id) return
    const [{ data: tallerData }, { data: perData }] = await Promise.all([
      supabase.from('talleres').select('*').eq('id', usuario.taller_id).single(),
      supabase.from('peritaciones')
        .select('*, compania:companias(nombre)')
        .eq('taller_id', usuario.taller_id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    setTaller(tallerData)
    setPeritaciones(perData || [])
    setLoading(false)
  }

  const hora   = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  const pendientes = peritaciones.filter(p => p.estado === 'pendiente').length
  const enviadas   = peritaciones.filter(p => p.estado === 'enviada').length
  const recibidas  = peritaciones.filter(p => p.estado === 'recibida').length
  const recientes  = peritaciones.slice(0, 5)

  function estadoBadge(estado: string) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      pendiente: { label: 'Pendiente',  bg: '#FFF3E0', color: '#C05621' },
      enviada:   { label: 'Enviada',    bg: '#EDE9FE', color: '#6D28D9' },
      recibida:  { label: 'Recibida ✓', bg: '#E6FBF3', color: '#047857' },
      orden_enviada: { label: 'Orden enviada', bg: '#EDE9FE', color: '#6D28D9' },
    }
    const s = map[estado] || { label: estado, bg: '#F0F2F5', color: '#8896A8' }
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
        {s.label}
      </span>
    )
  }

  function tiempoRelativo(fecha: string) {
    const diff = Date.now() - new Date(fecha).getTime()
    const min  = Math.floor(diff / 60000)
    const hs   = Math.floor(min / 60)
    const dias = Math.floor(hs / 24)
    if (min < 60)    return `Hace ${min} min`
    if (hs < 24)     return `Hace ${hs}h`
    if (dias === 1)  return 'Ayer'
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
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: isMobile ? 22 : 26, fontWeight: 700, color: '#0F1623', marginBottom: 4, letterSpacing: -.4 }}>
          {saludo} 👋
        </h1>
        <p style={{ fontSize: 14, color: '#8896A8' }}>
          Esto es lo que está pasando hoy en {taller?.nombre_fantasia || 'tu taller'}.
        </p>
      </div>

      {/* Botón nueva — mobile */}
      {isMobile && (
        <Link href="/taller/peritaciones/nueva" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: '#063940', color: 'white', borderRadius: 14,
          padding: '14px 20px', fontSize: 15, fontWeight: 700,
          textDecoration: 'none', marginBottom: 20,
        }}>
          📋 Nueva peritación
        </Link>
      )}

      {/* Stats */}
<div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 14, marginBottom: 24 }}>
  {[
    { icon: '⏳', label: 'Pendientes', value: pendientes },
    { icon: '📤', label: 'Enviadas',   value: enviadas   },
    { icon: '✅', label: 'Recibidas',  value: recibidas  },
  ].map(stat => (
    <div key={stat.label} style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
      <div style={{ fontSize: 28, flexShrink: 0 }}>{stat.icon}</div>
      <div>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, color: '#0F1623', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {stat.value}
        </div>
        <div style={{ fontSize: 13, color: '#8896A8', marginTop: 3 }}>{stat.label}</div>
      </div>
    </div>
  ))}
</div>

      {/* Grid inferior */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>

        {/* Actividad reciente */}
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
          <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E6EC' }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#0F1623' }}>Actividad reciente</span>
            <Link href="/taller/peritaciones" style={{ fontSize: 12, fontWeight: 600, color: '#3e838c', textDecoration: 'none' }}>
              Ver todas →
            </Link>
          </div>
          <div>
            {recientes.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: '#8896A8' }}>
                No hay peritaciones todavía.{' '}
                <Link href="/taller/peritaciones/nueva" style={{ color: '#063940', fontWeight: 600 }}>Creá la primera →</Link>
              </div>
            ) : recientes.map(p => (
              <Link key={p.id} href={`/taller/peritaciones/${p.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: '1px solid #F7F8FA', textDecoration: 'none' }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: p.estado === 'pendiente' ? '#F5962A' : p.estado === 'enviada' ? '#7C3AED' : '#0DBF7E' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0F1623', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.vehiculo || 'Vehículo'}{p.patente ? ` · ${p.patente}` : ''}
                  </div>
                  <div style={{ fontSize: 12, color: '#8896A8', marginTop: 1 }}>
                    {(p.compania as any)?.nombre || ''}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {estadoBadge(p.estado)}
                  <span style={{ fontSize: 11, color: '#8896A8' }}>{tiempoRelativo(p.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Accesos rápidos — solo desktop */}
        {!isMobile && (
          <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #E2E6EC' }}>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#0F1623' }}>Accesos rápidos</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#E2E6EC' }}>
              {[
                { href: '/taller/peritaciones/nueva',          icon: '📋', bg: '#eaf4f4', title: 'Nueva peritación', sub: 'Cargar vehículo' },
                { href: '/taller/peritaciones',                icon: '🔍', bg: '#EDE9FE', title: 'Ver peritaciones', sub: pendientes > 0 ? `${pendientes} pendiente${pendientes > 1 ? 's' : ''}` : 'Ver todas' },
                { href: '/taller/peritaciones?estado=enviada', icon: '📤', bg: '#FFF3E0', title: 'Enviadas',         sub: `${enviadas} enviada${enviadas !== 1 ? 's' : ''}` },
                { href: '/taller/configuracion',               icon: '⚙️', bg: '#F0F2F5', title: 'Mi taller',       sub: 'Datos y logo' },
              ].map(item => (
                <Link key={item.href + item.title} href={item.href}
                  style={{ background: 'white', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F7F8FA')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {item.icon}
                  </div>
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
    </div>
  )
}