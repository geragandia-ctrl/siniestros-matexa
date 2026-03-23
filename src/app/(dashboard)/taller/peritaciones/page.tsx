'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Peritacion, Compania } from '@/types'

export default function PeritacionesPage() {
  const router = useRouter()
  const [peritaciones, setPeritaciones] = useState<Peritacion[]>([])
  const [companias, setCompanias]       = useState<Compania[]>([])
  const [loading, setLoading]           = useState(true)
  const [isMobile, setIsMobile]         = useState(false)

  const [busqueda, setBusqueda]             = useState('')
  const [filtroEstado, setFiltroEstado]     = useState('')
  const [filtroCompania, setFiltroCompania] = useState('')

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
    const [{ data: perData }, { data: ciaData }] = await Promise.all([
      supabase.from('peritaciones')
        .select('*, compania:companias(id, nombre)')
        .eq('taller_id', usuario.taller_id)
        .order('created_at', { ascending: false }),
      supabase.from('companias').select('*').order('nombre'),
    ])
    setPeritaciones(perData || [])
    setCompanias(ciaData || [])
    setLoading(false)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta peritación?')) return
    await supabase.from('peritaciones').delete().eq('id', id)
    setPeritaciones(prev => prev.filter(p => p.id !== id))
  }

  const filtradas = peritaciones.filter(p => {
    const q = busqueda.toLowerCase()
    const matchBusqueda = !q ||
      p.patente?.toLowerCase().includes(q) ||
      p.vehiculo?.toLowerCase().includes(q) ||
      p.nro_siniestro?.toLowerCase().includes(q) ||
      p.cliente?.toLowerCase().includes(q)
    const matchEstado   = !filtroEstado   || p.estado === filtroEstado
    const matchCompania = !filtroCompania || p.compania_id === filtroCompania
    return matchBusqueda && matchEstado && matchCompania
  })

  function badgeEstado(estado: string) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      pendiente: { label: 'Pendiente',  bg: '#FFF3E0', color: '#C05621' },
      enviada:   { label: 'Enviada',    bg: '#EDE9FE', color: '#6D28D9' },
      recibida:  { label: 'Recibida ✓', bg: '#E6FBF3', color: '#047857' },
    }
    const s = map[estado] || { label: estado, bg: '#F0F2F5', color: '#8896A8' }
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
        {s.label}
      </span>
    )
  }

  function formatFecha(fecha: string) {
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const inputStyle: React.CSSProperties = {
    padding: '9px 12px', border: '1.5px solid #E2E6EC', borderRadius: 10,
    fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#0F1623',
    outline: 'none', background: 'white',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <p style={{ fontSize: 14, color: '#8896A8' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: isMobile ? 20 : 26, fontWeight: 700, color: '#0F1623', marginBottom: 2, letterSpacing: -.4 }}>
            Peritaciones
          </h1>
          <p style={{ fontSize: 13, color: '#8896A8' }}>
            {peritaciones.length} en total
          </p>
        </div>
        <button
          onClick={() => router.push('/taller/peritaciones/nueva')}
          style={{ background: '#063940', color: 'white', border: 'none', borderRadius: 12, padding: isMobile ? '10px 18px' : '11px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}
        >
          + Nueva
        </button>
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 16, padding: '14px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
        <input
          type="text"
          placeholder="🔍  Buscar por patente, vehículo, siniestro..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ ...inputStyle, width: '100%' }}
        />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 130 }}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="enviada">Enviada</option>
            <option value="recibida">Recibida</option>
          </select>
          <select value={filtroCompania} onChange={e => setFiltroCompania(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 130 }}>
            <option value="">Todas las compañías</option>
            {companias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {(busqueda || filtroEstado || filtroCompania) && (
            <button onClick={() => { setBusqueda(''); setFiltroEstado(''); setFiltroCompania('') }}
              style={{ ...inputStyle, cursor: 'pointer', color: '#8896A8' }}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Contenido */}
      {filtradas.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 16, padding: '48px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0F1623', marginBottom: 6 }}>
            {peritaciones.length === 0 ? 'Todavía no hay peritaciones' : 'No hay resultados'}
          </p>
          <p style={{ fontSize: 13, color: '#8896A8', marginBottom: 20 }}>
            {peritaciones.length === 0 ? 'Cuando llegue un auto, creá la primera peritación.' : 'Probá con otros filtros.'}
          </p>
          {peritaciones.length === 0 && (
            <button onClick={() => router.push('/taller/peritaciones/nueva')}
              style={{ background: '#063940', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              + Nueva peritación
            </button>
          )}
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtradas.map(p => (
            <div key={p.id} onClick={() => router.push(`/taller/peritaciones/${p.id}`)}
              style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#063940', marginBottom: 2, fontVariantNumeric: 'tabular-nums' }}>
                    {p.patente || <span style={{ color: '#C8D0DC' }}>Sin patente</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F1623' }}>
                    {p.vehiculo || 'Vehículo sin definir'}
                  </div>
                </div>
                {badgeEstado(p.estado)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, color: '#8896A8' }}>
                  {(p.compania as any)?.nombre || '—'}
                  {p.cliente ? ` · ${p.cliente}` : ''}
                </div>
                <div style={{ fontSize: 11, color: '#8896A8' }}>{formatFecha(p.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E6EC', background: '#F7F8FA' }}>
                {['Patente', 'Vehículo', 'Cliente', 'Compañía', 'Tipo', 'Estado', 'Fecha', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: .5, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(p => (
                <tr key={p.id} onClick={() => router.push(`/taller/peritaciones/${p.id}`)}
                  style={{ borderBottom: '1px solid #F7F8FA', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F7F8FA')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: '#063940', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                    {p.patente || <span style={{ color: '#C8D0DC' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px', color: '#0F1623', fontWeight: 500 }}>
                    {p.vehiculo || <span style={{ color: '#C8D0DC' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px', color: '#4A5568' }}>
                    {p.cliente || <span style={{ color: '#C8D0DC' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px', color: '#4A5568' }}>
                    {(p.compania as any)?.nombre || <span style={{ color: '#C8D0DC' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px', color: '#4A5568' }}>
                    {p.tipo ? (p.tipo === 'chapa_pintura' ? 'Chapa y pintura' : 'Granizo') : <span style={{ color: '#C8D0DC' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px' }}>{badgeEstado(p.estado)}</td>
                  <td style={{ padding: '13px 16px', color: '#8896A8', whiteSpace: 'nowrap' }}>{formatFecha(p.created_at)}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <button onClick={e => { e.stopPropagation(); eliminar(p.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8D0DC', fontSize: 16, padding: 4, borderRadius: 6 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#E8404A')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#C8D0DC')}>
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}