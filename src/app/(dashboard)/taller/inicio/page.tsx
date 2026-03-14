'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Peritacion, Taller } from '@/types'

export default function TallerInicio() {
  const [taller, setTaller]         = useState<Taller | null>(null)
  const [peritaciones, setPeritaciones] = useState<Peritacion[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('taller_id')
      .eq('id', session.user.id)
      .single()

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

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  const pendientes = peritaciones.filter(p => p.estado === 'pendiente').length
  const enviadas   = peritaciones.filter(p => p.estado === 'enviada').length
  const recibidas  = peritaciones.filter(p => p.estado === 'recibida').length
  const recientes  = peritaciones.slice(0, 5)

  function estadoBadge(estado: string) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      pendiente: { label: 'Pendiente', bg: '#FFF3E0', color: '#C05621' },
      enviada:   { label: 'Enviada',   bg: '#EDE9FE', color: '#6D28D9' },
      recibida:  { label: 'Recibida ✓', bg: '#E6FBF3', color: '#047857' },
    }
    const s = map[estado] || { label: estado, bg: '#F0F2F5', color: '#8896A8' }
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
        {s.label}
      </span>
    )
  }

  function tiempoRelativo(fecha: string) {
    const diff = Date.now() - new Date(fecha).getTime()
    const min  = Math.floor(diff / 60000)
    const hs   = Math.floor(min / 60)
    const dias = Math.floor(hs / 24)
    if (min < 60)   return `Hace ${min} min`
    if (hs < 24)    return `Hace ${hs}h`
    if (dias === 1) return 'Ayer'
    return `Hace ${dias} días`
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm text-neutral-secondary">Cargando...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Título */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700, color: '#0F1623', marginBottom: 4, letterSpacing: -.3 }}>
          {saludo} 👋
        </h1>
        <p style={{ fontSize: 14, color: '#8896A8' }}>
          Esto es lo que está pasando hoy en {taller?.nombre_fantasia || 'tu taller'}.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { icon: '⏳', bg: '#FFF3E0', label: 'Pendientes',    value: pendientes, sub: 'Sin completar' },
          { icon: '📤', bg: '#EDE9FE', label: 'Enviadas',      value: enviadas,   sub: 'Esperando perito' },
          { icon: '✅', bg: '#E6FBF3', label: 'Recibidas',     value: recibidas,  sub: 'Confirmadas' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>
                {stat.icon}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: '#F0F2F5', color: '#8896A8' }}>
                {stat.sub}
              </span>
            </div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 700, color: '#0F1623', lineHeight: 1, marginBottom: 4 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 13, color: '#8896A8' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Grid inferior */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Actividad reciente */}
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E6EC' }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#0F1623' }}>Actividad reciente</span>
            <Link href="/taller/peritaciones" style={{ fontSize: 12, fontWeight: 600, color: '#3e838c', textDecoration: 'none' }}>
              Ver todas →
            </Link>
          </div>
          <div>
            {recientes.length === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: '#8896A8' }}>
                No hay peritaciones todavía.{' '}
                <Link href="/taller/peritaciones" style={{ color: '#063940', fontWeight: 600 }}>Creá la primera →</Link>
              </div>
            ) : recientes.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #F7F8FA' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: p.estado === 'pendiente' ? '#F5962A' : p.estado === 'enviada' ? '#7C3AED' : '#0DBF7E' }} />
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
              </div>
            ))}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #E2E6EC' }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#0F1623' }}>Accesos rápidos</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#E2E6EC' }}>
            {[
              { href: '/taller/peritaciones?nueva=1', icon: '📋', bg: '#eaf4f4', title: 'Nueva peritación', sub: 'Cargar vehículo' },
              { href: '/taller/peritaciones',         icon: '🔍', bg: '#EDE9FE', title: 'Ver peritaciones', sub: pendientes > 0 ? `${pendientes} pendiente${pendientes > 1 ? 's' : ''}` : 'Ver todas' },
              { href: '/taller/peritaciones?estado=enviada', icon: '📤', bg: '#FFF3E0', title: 'Enviadas',    sub: `${enviadas} enviada${enviadas !== 1 ? 's' : ''}` },
              { href: '/taller/configuracion',        icon: '⚙️', bg: '#F0F2F5', title: 'Mi taller',    sub: 'Datos y logo' },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{ background: 'white', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', transition: 'background .15s' }}
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

      </div>
    </div>
  )
}