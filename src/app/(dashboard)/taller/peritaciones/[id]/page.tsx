'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Peritacion, Dano, Foto, Compania } from '@/types'

type DanoForm = Omit<Dano, 'id' | 'peritacion_id' | 'created_at'> & { id?: string; guardado?: boolean }

export default function DetallePeritacionPage() {
  const router   = useRouter()
  const { id }   = useParams<{ id: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [peritacion, setPeritacion] = useState<Peritacion | null>(null)
  const [companias, setCompanias]   = useState<Compania[]>([])
  const [fotos, setFotos]           = useState<Foto[]>([])
  const [danos, setDanos]           = useState<DanoForm[]>([])
  const [loading, setLoading]       = useState(true)
  const [guardando, setGuardando]   = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)

  // Campos editables
  const [companiaId, setCompaniaId]     = useState('')
  const [tipo, setTipo]                 = useState('')
  const [vehiculo, setVehiculo]         = useState('')
  const [patente, setPatente]           = useState('')
  const [nroSiniestro, setNroSiniestro] = useState('')
  const [cliente, setCliente]           = useState('')
  const [manoObra, setManoObra]         = useState('')

  useEffect(() => { cargarDatos() }, [id])

  async function cargarDatos() {
    const [{ data: per }, { data: fotosData }, { data: danosData }, { data: ciasData }] = await Promise.all([
      supabase.from('peritaciones').select('*, compania:companias(id, nombre)').eq('id', id).single(),
      supabase.from('fotos').select('*').eq('peritacion_id', id).order('created_at'),
      supabase.from('danos').select('*').eq('peritacion_id', id).order('orden'),
      supabase.from('companias').select('*').order('nombre'),
    ])

    if (per) {
      setPeritacion(per)
      setCompaniaId(per.compania_id || '')
      setTipo(per.tipo || '')
      setVehiculo(per.vehiculo || '')
      setPatente(per.patente || '')
      setNroSiniestro(per.nro_siniestro || '')
      setCliente(per.cliente || '')
      setManoObra(per.mano_obra_total?.toString() || '')
    }

    setFotos(fotosData || [])
    setCompanias(ciasData || [])

    if (danosData && danosData.length > 0) {
      setDanos(danosData.map(d => ({ ...d, guardado: true })))
    } else {
      setDanos([danonuevo()])
    }

    setLoading(false)
  }

  function danonuevo(): DanoForm {
    return { accion: 'reparar', pieza: '', dias_chapa: 0, panos_pintura: 0, hs_mecanica: 0, otros: 0, orden: 0, guardado: false }
  }

  function agregarDano() {
    setDanos(prev => [...prev, danonuevo()])
  }

  function actualizarDano(index: number, campo: keyof DanoForm, valor: any) {
    setDanos(prev => prev.map((d, i) => i === index ? { ...d, [campo]: valor, guardado: false } : d))
  }

  function quitarDano(index: number) {
    setDanos(prev => prev.filter((_, i) => i !== index))
  }

  // Totales
  const totalChapa    = danos.reduce((s, d) => s + (Number(d.dias_chapa)    || 0), 0)
  const totalPanos    = danos.reduce((s, d) => s + (Number(d.panos_pintura) || 0), 0)
  const totalMecanica = danos.reduce((s, d) => s + (Number(d.hs_mecanica)   || 0), 0)
  const totalOtros    = danos.reduce((s, d) => s + (Number(d.otros)         || 0), 0)

  async function guardarTodo() {
    setGuardando(true)

    // Guardar campos de peritación
    await supabase.from('peritaciones').update({
      compania_id:    companiaId,
      tipo:           tipo || null,
      vehiculo:       vehiculo || null,
      patente:        patente.toUpperCase() || null,
      nro_siniestro:  nroSiniestro || null,
      cliente:        cliente || null,
      mano_obra_total: manoObra ? Number(manoObra) : null,
    }).eq('id', id)

    // Guardar daños — borrar y reinsertar
    await supabase.from('danos').delete().eq('peritacion_id', id)

    const danosValidos = danos.filter(d => d.pieza.trim() !== '')
    if (danosValidos.length > 0) {
      await supabase.from('danos').insert(
        danosValidos.map((d, i) => ({
          peritacion_id: id,
          accion:        d.accion,
          pieza:         d.pieza,
          dias_chapa:    Number(d.dias_chapa)    || 0,
          panos_pintura: Number(d.panos_pintura) || 0,
          hs_mecanica:   Number(d.hs_mecanica)   || 0,
          otros:         Number(d.otros)         || 0,
          orden:         i,
        }))
      )
    }

    setDanos(prev => prev.map(d => ({ ...d, guardado: true })))
    setGuardando(false)
    await cargarDatos()
  }

  async function cambiarEstado(nuevoEstado: string) {
    await guardarTodo()
    const update: any = { estado: nuevoEstado }
    if (nuevoEstado === 'enviada') update.fecha_envio = new Date().toISOString()
    await supabase.from('peritaciones').update(update).eq('id', id)
    await cargarDatos()
  }

  async function subirFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setSubiendoFoto(true)

    for (const file of files) {
      const ext      = file.name.split('.').pop()
      const fileName = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: errUpload } = await supabase.storage
        .from('siniestros-fotos')
        .upload(fileName, file, { contentType: file.type })

      if (errUpload) { console.error(errUpload); continue }

      const { data: { publicUrl } } = supabase.storage
        .from('siniestros-fotos')
        .getPublicUrl(fileName)

      await supabase.from('fotos').insert({ peritacion_id: id, url: publicUrl, nombre: file.name })
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
    setSubiendoFoto(false)
    const { data } = await supabase.from('fotos').select('*').eq('peritacion_id', id).order('created_at')
    setFotos(data || [])
  }

  async function eliminarFoto(foto: Foto) {
    if (!confirm('¿Eliminar esta foto?')) return
    await supabase.from('fotos').delete().eq('id', foto.id)
    setFotos(prev => prev.filter(f => f.id !== foto.id))
  }

  function formatNum(n: number) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  function badgeEstado(estado: string) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      pendiente: { label: 'Pendiente', bg: '#FFF3E0', color: '#C05621' },
      enviada:   { label: 'Enviada',   bg: '#EDE9FE', color: '#6D28D9' },
      recibida:  { label: 'Recibida ✓', bg: '#E6FBF3', color: '#047857' },
    }
    const s = map[estado] || { label: estado, bg: '#F0F2F5', color: '#8896A8' }
    return <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>{s.label}</span>
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <p style={{ fontSize: 14, color: '#8896A8' }}>Cargando...</p>
    </div>
  )

  if (!peritacion) return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <p style={{ fontSize: 15, color: '#8896A8' }}>Peritación no encontrada.</p>
      <button onClick={() => router.push('/taller/peritaciones')} style={{ marginTop: 16, background: '#063940', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, cursor: 'pointer' }}>
        Volver a peritaciones
      </button>
    </div>
  )

  const card = (children: React.ReactNode, style?: React.CSSProperties) => (
    <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: 24, ...style }}>
      {children}
    </div>
  )

  const sectionLabel = (label: string) => (
    <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16 }}>
      {label}
    </div>
  )

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/taller/peritaciones')}
            style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#4A5568', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            ← Volver
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: '#0F1623', letterSpacing: -.3 }}>
                {peritacion.vehiculo || 'Vehículo sin definir'}
                {peritacion.patente && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: '#063940', marginLeft: 10, background: '#eaf4f4', padding: '2px 10px', borderRadius: 8 }}>{peritacion.patente}</span>}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {badgeEstado(peritacion.estado)}
              <span style={{ fontSize: 12, color: '#8896A8' }}>
                {(peritacion.compania as any)?.nombre || ''}
                {peritacion.nro_siniestro && ` · Stro: ${peritacion.nro_siniestro}`}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={guardarTodo} disabled={guardando}
            style={{ background: guardando ? '#9AA5B4' : '#063940', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            {guardando ? 'Guardando...' : '💾 Guardar'}
          </button>
          {peritacion.estado === 'pendiente' && (
            <button onClick={() => cambiarEstado('enviada')}
              style={{ background: '#7C3AED', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              📤 Marcar como enviada
            </button>
          )}
          {peritacion.estado === 'enviada' && (
            <button onClick={() => cambiarEstado('pendiente')}
              style={{ background: 'white', color: '#4A5568', border: '1px solid #E2E6EC', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Volver a pendiente
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Datos */}
        {card(
          <>
            {sectionLabel('Datos del vehículo')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Compañía *</label>
                <select value={companiaId} onChange={e => setCompaniaId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6EC', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#0F1623', outline: 'none', background: 'white' }}>
                  <option value="">Seleccioná</option>
                  {companias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Tipo</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6EC', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#0F1623', outline: 'none', background: 'white' }}>
                    <option value="">Sin definir</option>
                    <option value="chapa_pintura">Chapa y pintura</option>
                    <option value="granizo">Granizo</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Patente</label>
                  <input type="text" value={patente} onChange={e => setPatente(e.target.value.toUpperCase())}
                    placeholder="AB 123 CD"
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6EC', borderRadius: 10, fontSize: 13, fontFamily: 'DM Mono, monospace', color: '#063940', outline: 'none', letterSpacing: 1 }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Vehículo</label>
                <input type="text" value={vehiculo} onChange={e => setVehiculo(e.target.value)} placeholder="Ej: VW Gol 2020"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6EC', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#0F1623', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>N° Siniestro</label>
                  <input type="text" value={nroSiniestro} onChange={e => setNroSiniestro(e.target.value)} placeholder="00123456"
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6EC', borderRadius: 10, fontSize: 13, fontFamily: 'DM Mono, monospace', color: '#0F1623', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Cliente</label>
                  <input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre asegurado"
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E6EC', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#0F1623', outline: 'none' }} />
                </div>
              </div>

            </div>
          </>
        )}

        {/* Fotos */}
        {card(
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              {sectionLabel(`Fotos (${fotos.length})`)}
              <button onClick={() => fileInputRef.current?.click()} disabled={subiendoFoto}
                style={{ background: '#063940', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {subiendoFoto ? 'Subiendo...' : '📷 Agregar'}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment" onChange={subirFotos} style={{ display: 'none' }} />

            {fotos.length === 0 ? (
              <div onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed #E2E6EC', borderRadius: 12, padding: '24px 16px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📸</div>
                <div style={{ fontSize: 13, color: '#8896A8' }}>Tocá para agregar fotos</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                {fotos.map(foto => (
                  <div key={foto.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', border: '1px solid #E2E6EC', cursor: 'pointer' }}
                    onClick={() => setFotoAmpliada(foto.url)}>
                    <img src={foto.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={e => { e.stopPropagation(); eliminarFoto(foto) }}
                      style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,.6)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✕
                    </button>
                  </div>
                ))}
                <div onClick={() => fileInputRef.current?.click()}
                  style={{ border: '2px dashed #E2E6EC', borderRadius: 8, aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 22, color: '#C8D0DC' }}>
                  +
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* Tabla de daños */}
      {card(
        <>
          {sectionLabel('Tabla de daños')}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E6EC' }}>
                  {['Acción', 'Pieza', 'Días chapa', 'Paños pintura', 'Hs mecánica', 'Otros ($)', ''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: .5, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {danos.map((dano, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F7F8FA' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <select value={dano.accion} onChange={e => actualizarDano(i, 'accion', e.target.value)}
                        style={{ padding: '6px 10px', border: '1.5px solid #E2E6EC', borderRadius: 8, fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#0F1623', outline: 'none', background: 'white' }}>
                        <option value="reparar">Reparar</option>
                        <option value="cambiar">Cambiar</option>
                        <option value="pintar">Pintar</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input type="text" value={dano.pieza} onChange={e => actualizarDano(i, 'pieza', e.target.value)}
                        placeholder="Ej: Paragolpe delantero"
                        style={{ width: '100%', minWidth: 160, padding: '6px 10px', border: '1.5px solid #E2E6EC', borderRadius: 8, fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#0F1623', outline: 'none' }} />
                    </td>
                    {(['dias_chapa', 'panos_pintura', 'hs_mecanica', 'otros'] as const).map(campo => (
                      <td key={campo} style={{ padding: '8px 10px' }}>
                        <input type="number" min="0" step="0.5" value={dano[campo] || ''} onChange={e => actualizarDano(i, campo, e.target.value)}
                          placeholder="0"
                          style={{ width: 80, padding: '6px 10px', border: '1.5px solid #E2E6EC', borderRadius: 8, fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#0F1623', outline: 'none', textAlign: 'right' }} />
                      </td>
                    ))}
                    <td style={{ padding: '8px 10px' }}>
                      <button onClick={() => quitarDano(i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8D0DC', fontSize: 16, padding: 4, borderRadius: 6 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#E8404A')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#C8D0DC')}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totales */}
              <tfoot>
                <tr style={{ borderTop: '2px solid #E2E6EC', background: '#F7F8FA' }}>
                  <td colSpan={2} style={{ padding: '10px 10px', fontWeight: 700, fontSize: 12, color: '#0F1623' }}>TOTALES</td>
                  <td style={{ padding: '10px 10px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', textAlign: 'right' }}>{formatNum(totalChapa)}</td>
                  <td style={{ padding: '10px 10px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', textAlign: 'right' }}>{formatNum(totalPanos)}</td>
                  <td style={{ padding: '10px 10px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', textAlign: 'right' }}>{formatNum(totalMecanica)}</td>
                  <td style={{ padding: '10px 10px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', textAlign: 'right' }}>{formatNum(totalOtros)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <button onClick={agregarDano}
            style={{ marginTop: 14, background: 'white', border: '1.5px dashed #E2E6EC', borderRadius: 10, padding: '9px 18px', fontSize: 13, color: '#4A5568', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#063940'; e.currentTarget.style.color = '#063940' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E6EC'; e.currentTarget.style.color = '#4A5568' }}>
            + Agregar daño
          </button>

          {/* Mano de obra */}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4A5568' }}>Valor total mano de obra (opcional):</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#8896A8' }}>$</span>
              <input type="number" min="0" value={manoObra} onChange={e => setManoObra(e.target.value)}
                placeholder="0"
                style={{ width: 140, padding: '8px 10px 8px 22px', border: '1.5px solid #E2E6EC', borderRadius: 10, fontSize: 13, fontFamily: 'DM Mono, monospace', color: '#0F1623', outline: 'none', textAlign: 'right' }} />
            </div>
          </div>
        </>
      )}

      {/* Foto ampliada */}
      {fotoAmpliada && (
        <div onClick={() => setFotoAmpliada(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}>
          <img src={fotoAmpliada} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
          <button onClick={() => setFotoAmpliada(null)}
            style={{ position: 'fixed', top: 20, right: 20, background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

    </div>
  )
}