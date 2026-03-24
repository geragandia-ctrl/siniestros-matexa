'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function PeritoPeritacionesPage() {
  const router = useRouter()
  const [peritaciones, setPeritaciones] = useState<any[]>([])
  const [companias, setCompanias]       = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [confirmando, setConfirmando]   = useState<string | null>(null)
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

    // Obtener compañías del perito
    const { data: misCompanias } = await supabase
      .from('perito_companias')
      .select('compania_id, compania:companias(id, nombre)')
      .eq('perito_id', session.user.id)

    setCompanias((misCompanias || []).map((r: any) => r.compania).filter(Boolean))

    const { data } = await supabase
      .from('peritaciones')
      .select('*, taller:talleres(id, nombre_fantasia), compania:companias(id, nombre)')
      .eq('perito_id', session.user.id)
      .in('estado', ['enviada', 'recibida', 'orden_enviada'])
      .order('created_at', { ascending: false })

    setPeritaciones(data || [])
    setLoading(false)
  }

  async function confirmarRecepcion(id: string) {
    setConfirmando(id)
    await supabase.from('peritaciones').update({
      estado: 'recibida',
      fecha_recepcion: new Date().toISOString(),
    }).eq('id', id)
    setPeritaciones(prev => prev.map(p => p.id === id ? { ...p, estado: 'recibida' } : p))
    setConfirmando(null)
  }

  const filtradas = peritaciones.filter(p => {
    const q = busqueda.toLowerCase()
    const matchBusqueda = !q ||
      p.patente?.toLowerCase().includes(q) ||
      p.vehiculo?.toLowerCase().includes(q) ||
      p.nro_siniestro?.toLowerCase().includes(q)
    const matchEstado   = !filtroEstado   || p.estado === filtroEstado
    const matchCompania = !filtroCompania || p.compania?.id === filtroCompania
    return matchBusqueda && matchEstado && matchCompania
  })

  function badgeEstado(estado: string) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      enviada:  { label: 'Para revisar', bg: '#EDE9FE', color: '#6D28D9' },
      recibida: { label: 'Recibida ✓',   bg: '#E6FBF3', color: '#047857' },
      orden_enviada: { label: 'Orden enviada', bg: '#EDE9FE', color: '#6D28D9' },
    }
    const s = map[estado] || { label: estado, bg: '#F0F2F5', color: '#8896A8' }
    return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{s.label}</span>
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

async function enviarOrden(id: string) {
  setConfirmando(id)
  await supabase.from('peritaciones').update({ estado: 'orden_enviada' }).eq('id', id)
  setPeritaciones(prev => prev.map(p => p.id === id ? { ...p, estado: 'orden_enviada' } : p))
  setConfirmando(null)
}

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: isMobile ? 20 : 26, fontWeight: 700, color: '#0F1623', marginBottom: 2, letterSpacing: -.4 }}>
          Peritaciones
        </h1>
        <p style={{ fontSize: 13, color: '#8896A8' }}>
          {filtradas.length} peritación{filtradas.length !== 1 ? 'es' : ''} asignadas a vos
        </p>
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 16, padding: '14px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
        <input type="text" placeholder="🔍  Buscar por patente, vehículo, siniestro..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ ...inputStyle, width: '100%' }} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 130 }}>
            <option value="">Todos los estados</option>
            <option value="enviada">Para revisar</option>
            <option value="recibida">Recibidas</option>
            <option value="orden_enviada">Orden enviada</option>
          </select>
          <select value={filtroCompania} onChange={e => setFiltroCompania(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 130 }}>
            <option value="">Todas las compañías</option>
            {companias.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
            {peritaciones.length === 0 ? 'No hay peritaciones todavía' : 'No hay resultados'}
          </p>
          <p style={{ fontSize: 13, color: '#8896A8' }}>
            {peritaciones.length === 0 ? 'Cuando un taller te envíe una peritación aparecerá acá.' : 'Probá con otros filtros.'}
          </p>
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtradas.map(p => (
            <div key={p.id} style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
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
              <div style={{ fontSize: 12, color: '#8896A8', marginBottom: 10 }}>
                {p.taller?.nombre_fantasia || '—'}
                {p.compania?.nombre ? ` · ${p.compania.nombre}` : ''}
                {p.nro_siniestro ? ` · Stro: ${p.nro_siniestro}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => router.push(`/perito/peritaciones/${p.id}`)}
                  style={{ flex: 1, background: '#F7F8FA', color: '#0F1623', border: '1px solid #E2E6EC', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Ver detalle
                </button>
                {p.estado === 'enviada' && (
                  <button onClick={() => confirmarRecepcion(p.id)} disabled={confirmando === p.id}
                    style={{ flex: 1, background: '#0DBF7E', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {confirmando === p.id ? '...' : '✓ Confirmar'}
                  </button>
                )}
{p.estado === 'recibida' && (
  <button onClick={() => enviarOrden(p.id)} disabled={confirmando === p.id}
    style={{ flex: 1, background: '#7C3AED', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
    {confirmando === p.id ? '...' : '📤 Orden Enviada'}
  </button>
)}
{p.estado === 'orden_enviada' && (
  <span style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#6D28D9', fontWeight: 600, padding: '8px 14px' }}>✓ Orden enviada</span>
)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E6EC', background: '#F7F8FA' }}>
                {['Patente', 'Vehículo', 'Taller', 'Compañía', 'Siniestro', 'Estado', 'Fecha envío', 'Acción'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: .5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(p => (
                <tr key={p.id}
                  style={{ borderBottom: '1px solid #F7F8FA', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F7F8FA')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                  <td onClick={() => router.push(`/perito/peritaciones/${p.id}`)} style={{ padding: '13px 16px', fontWeight: 700, color: '#063940', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                    {p.patente || <span style={{ color: '#C8D0DC' }}>—</span>}
                  </td>
                  <td onClick={() => router.push(`/perito/peritaciones/${p.id}`)} style={{ padding: '13px 16px', color: '#0F1623', fontWeight: 500 }}>{p.vehiculo || <span style={{ color: '#C8D0DC' }}>—</span>}</td>
                  <td onClick={() => router.push(`/perito/peritaciones/${p.id}`)} style={{ padding: '13px 16px', color: '#4A5568' }}>{p.taller?.nombre_fantasia || <span style={{ color: '#C8D0DC' }}>—</span>}</td>
                  <td onClick={() => router.push(`/perito/peritaciones/${p.id}`)} style={{ padding: '13px 16px', color: '#4A5568' }}>{p.compania?.nombre || <span style={{ color: '#C8D0DC' }}>—</span>}</td>
                  <td onClick={() => router.push(`/perito/peritaciones/${p.id}`)} style={{ padding: '13px 16px', color: '#4A5568', fontVariantNumeric: 'tabular-nums' }}>{p.nro_siniestro || <span style={{ color: '#C8D0DC' }}>—</span>}</td>
                  <td onClick={() => router.push(`/perito/peritaciones/${p.id}`)} style={{ padding: '13px 16px' }}>{badgeEstado(p.estado)}</td>
                  <td onClick={() => router.push(`/perito/peritaciones/${p.id}`)} style={{ padding: '13px 16px', color: '#8896A8', whiteSpace: 'nowrap' }}>
                    {p.fecha_envio ? formatFecha(p.fecha_envio) : <span style={{ color: '#C8D0DC' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
  {p.estado === 'enviada' ? (
    <button onClick={e => { e.stopPropagation(); confirmarRecepcion(p.id) }} disabled={confirmando === p.id}
      style={{ background: '#0DBF7E', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
      {confirmando === p.id ? '...' : '✓ Confirmar'}
    </button>
  ) : p.estado === 'recibida' ? (
    <button onClick={e => { e.stopPropagation(); enviarOrden(p.id) }} disabled={confirmando === p.id}
      style={{ background: '#7C3AED', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
      {confirmando === p.id ? '...' : '📤 Enviar orden'}
    </button>
  ) : p.estado === 'orden_enviada' ? (
    <span style={{ fontSize: 12, color: '#6D28D9', fontWeight: 600 }}>✓ Orden enviada</span>
  ) : null}
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