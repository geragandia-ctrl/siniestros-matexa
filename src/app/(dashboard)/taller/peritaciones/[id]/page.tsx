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
  const [isMobile, setIsMobile]     = useState(false)

  const [companiaId, setCompaniaId]     = useState('')
  const [tipo, setTipo]                 = useState('')
  const [vehiculo, setVehiculo]         = useState('')
  const [patente, setPatente]           = useState('')
  const [nroSiniestro, setNroSiniestro] = useState('')
  const [cliente, setCliente]           = useState('')
  const [manoObra, setManoObra]         = useState('')

  useEffect(() => {
    cargarDatos()
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [id])

  async function cargarDatos() {
    const [{ data: per }, { data: fotosData }, { data: danosData }, { data: ciasData }] = await Promise.all([
supabase.from('peritaciones').select('*, compania:companias(id, nombre), perito:usuarios!perito_id(nombre, email)').eq('id', id).single(),      supabase.from('fotos').select('*').eq('peritacion_id', id).order('created_at'),
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
    setDanos(danosData && danosData.length > 0 ? danosData.map(d => ({ ...d, guardado: true })) : [danonuevo()])
    setLoading(false)
  }

  function danonuevo(): DanoForm {
    return { accion: 'reparar', pieza: '', dias_chapa: 0, panos_pintura: 0, hs_mecanica: 0, otros: 0, orden: 0, guardado: false }
  }

  function actualizarDano(index: number, campo: keyof DanoForm, valor: any) {
    setDanos(prev => prev.map((d, i) => i === index ? { ...d, [campo]: valor } : d))
  }

  function quitarDano(index: number) {
    setDanos(prev => prev.filter((_, i) => i !== index))
  }

  const totalChapa    = danos.reduce((s, d) => s + (Number(d.dias_chapa)    || 0), 0)
  const totalPanos    = danos.reduce((s, d) => s + (Number(d.panos_pintura) || 0), 0)
  const totalMecanica = danos.reduce((s, d) => s + (Number(d.hs_mecanica)   || 0), 0)
  const totalOtros    = danos.reduce((s, d) => s + (Number(d.otros)         || 0), 0)

  async function guardarTodo() {
    setGuardando(true)
    await supabase.from('peritaciones').update({
      compania_id: companiaId, tipo: tipo || null,
      vehiculo: vehiculo || null, patente: patente.toUpperCase() || null,
      nro_siniestro: nroSiniestro || null, cliente: cliente || null,
      mano_obra_total: manoObra ? Number(manoObra) : null,
    }).eq('id', id)

    await supabase.from('danos').delete().eq('peritacion_id', id)
    const danosValidos = danos.filter(d => d.pieza.trim() !== '')
    if (danosValidos.length > 0) {
      await supabase.from('danos').insert(
        danosValidos.map((d, i) => ({
          peritacion_id: id, accion: d.accion, pieza: d.pieza,
          dias_chapa: Number(d.dias_chapa) || 0, panos_pintura: Number(d.panos_pintura) || 0,
          hs_mecanica: Number(d.hs_mecanica) || 0, otros: Number(d.otros) || 0, orden: i,
        }))
      )
    }
    setGuardando(false)
    await cargarDatos()
  }

  async function cambiarEstado(nuevoEstado: string) {
  await guardarTodo()
  const update: any = { estado: nuevoEstado }
  if (nuevoEstado === 'enviada') update.fecha_envio = new Date().toISOString()
  await supabase.from('peritaciones').update(update).eq('id', id)

  // Notificar al perito por email cuando se envía
  if (nuevoEstado === 'enviada' && peritacion?.perito_id) {
    const { data: perito } = await supabase
      .from('usuarios')
      .select('nombre, email')
      .eq('id', peritacion.perito_id)
      .single()

    const { data: tallerData } = await supabase
      .from('talleres')
      .select('nombre_fantasia')
      .eq('id', peritacion.taller_id)
      .single()

    if (perito?.email) {
      await fetch('/api/notificar-perito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailPerito:    perito.email,
          nombrePerito:   perito.nombre,
          nombreTaller:   tallerData?.nombre_fantasia || 'El taller',
          vehiculo:       peritacion.vehiculo,
          patente:        peritacion.patente,
          nroSiniestro:   peritacion.nro_siniestro,
          compania:       (peritacion.compania as any)?.nombre,
          linkPeritacion: `https://siniestros.matexa.app/perito/peritaciones/${id}`,
        })
      })
    }
  }

  await cargarDatos()
}

  async function subirFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setSubiendoFoto(true)
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const fileName = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('siniestros-fotos').upload(fileName, file, { contentType: file.type })
      if (error) continue
      const { data: { publicUrl } } = supabase.storage.from('siniestros-fotos').getPublicUrl(fileName)
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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid #E2E6EC', borderRadius: 10,
    fontSize: 14, fontFamily: 'DM Sans, sans-serif',
    color: '#0F1623', outline: 'none', background: 'white',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <p style={{ fontSize: 14, color: '#8896A8' }}>Cargando...</p>
    </div>
  )

  if (!peritacion) return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <p style={{ fontSize: 15, color: '#8896A8' }}>Peritación no encontrada.</p>
      <button onClick={() => router.push('/taller/peritaciones')}
        style={{ marginTop: 16, background: '#063940', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, cursor: 'pointer' }}>
        Volver
      </button>
    </div>
  )

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={() => router.push('/taller/peritaciones')}
            style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#4A5568', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>
            ← Volver
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#0F1623', letterSpacing: -.3 }}>
                {peritacion.vehiculo || 'Vehículo sin definir'}
              </h1>
              {peritacion.patente && (
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#063940', background: '#eaf4f4', padding: '2px 10px', borderRadius: 8, flexShrink: 0 }}>
                  {peritacion.patente}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              {badgeEstado(peritacion.estado)}
              <span style={{ fontSize: 12, color: '#8896A8' }}>
                {(peritacion.compania as any)?.nombre || ''}
                {peritacion.nro_siniestro && ` · Stro: ${peritacion.nro_siniestro}`}
              </span>
            </div>
          </div>
        </div>

        {/* Botones acción */}
<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
  <button onClick={guardarTodo} disabled={guardando}
    style={{ flex: isMobile ? 1 : undefined, background: guardando ? '#9AA5B4' : '#063940', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
    {guardando ? 'Guardando...' : '💾 Guardar'}
  </button>

  <button
    onClick={async () => {
      await navigator.clipboard.writeText(`https://siniestros.matexa.app/p/${id}`)
      const marcar = window.confirm('Link copiado ✓\n\n¿Querés marcarla como enviada?')
      if (marcar) await cambiarEstado('enviada')
    }}
    style={{ background: 'white', color: '#063940', border: '1.5px solid #063940', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
    🔗 Copiar link
  </button>

  {peritacion.estado === 'pendiente' && (
    <button onClick={() => cambiarEstado('enviada')}
      style={{ flex: isMobile ? 1 : undefined, background: '#7C3AED', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
      📤 Enviar al perito
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Datos */}
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: isMobile ? 18 : 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            Datos del vehículo
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Compañía *</label>
              <select value={companiaId} onChange={e => setCompaniaId(e.target.value)} style={inputStyle}>
                <option value="">Seleccioná</option>
                {companias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)} style={inputStyle}>
                  <option value="">Sin definir</option>
                  <option value="chapa_pintura">Chapa y pintura</option>
                  <option value="granizo">Granizo</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Patente</label>
                <input type="text" value={patente} onChange={e => setPatente(e.target.value.toUpperCase())}
                  placeholder="AB 123 CD" style={{ ...inputStyle, fontFamily: 'DM Mono, monospace', letterSpacing: 1 }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Vehículo</label>
              <input type="text" value={vehiculo} onChange={e => setVehiculo(e.target.value)} placeholder="Ej: VW Gol 2020" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>N° Siniestro</label>
                <input type="text" value={nroSiniestro} onChange={e => setNroSiniestro(e.target.value)}
                  placeholder="00123456" style={{ ...inputStyle, fontFamily: 'DM Mono, monospace' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 5 }}>Cliente</label>
                <input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre asegurado" style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

        {/* Fotos */}
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: isMobile ? 18 : 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1 }}>
              Fotos ({fotos.length})
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={subiendoFoto}
              style={{ background: '#063940', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
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
                    style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,.6)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        </div>

        {/* Tabla de daños */}
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: isMobile ? 18 : 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            Tabla de daños
          </div>

          {isMobile ? (
            /* MOBILE — daños como cards */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {danos.map((dano, i) => (
                <div key={i} style={{ border: '1px solid #E2E6EC', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <select value={dano.accion} onChange={e => actualizarDano(i, 'accion', e.target.value)}
                      style={{ flex: 1, padding: '8px 10px', border: '1.5px solid #E2E6EC', borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#0F1623', outline: 'none', background: 'white' }}>
                      <option value="reparar">Reparar</option>
                      <option value="cambiar">Cambiar</option>
                      <option value="pintar">Pintar</option>
                    </select>
                    <button onClick={() => quitarDano(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8D0DC', fontSize: 18, padding: 4 }}>
                      🗑
                    </button>
                  </div>
                  <input type="text" value={dano.pieza} onChange={e => actualizarDano(i, 'pieza', e.target.value)}
                    placeholder="Pieza (ej: Paragolpe delantero)"
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #E2E6EC', borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#0F1623', outline: 'none', marginBottom: 10 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { campo: 'dias_chapa' as const,    label: 'Días chapa' },
                      { campo: 'panos_pintura' as const, label: 'Paños pintura' },
                      { campo: 'hs_mecanica' as const,   label: 'Hs mecánica' },
                      { campo: 'otros' as const,         label: 'Otros ($)' },
                    ].map(({ campo, label }) => (
                      <div key={campo}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8896A8', marginBottom: 4 }}>{label}</label>
                        <input type="number" min="0" step="0.5" value={dano[campo] || ''} onChange={e => actualizarDano(i, campo, e.target.value)}
                          placeholder="0"
                          style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E2E6EC', borderRadius: 8, fontSize: 13, fontFamily: 'DM Mono, monospace', color: '#0F1623', outline: 'none', textAlign: 'right' }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* DESKTOP — tabla */
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
                          style={{ padding: '6px 10px', border: '1.5px solid #E2E6EC', borderRadius: 8, fontSize: 12, fontFamily: 'DM Sans, sans-serif', outline: 'none', background: 'white' }}>
                          <option value="reparar">Reparar</option>
                          <option value="cambiar">Cambiar</option>
                          <option value="pintar">Pintar</option>
                        </select>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input type="text" value={dano.pieza} onChange={e => actualizarDano(i, 'pieza', e.target.value)}
                          placeholder="Ej: Paragolpe delantero"
                          style={{ width: '100%', minWidth: 160, padding: '6px 10px', border: '1.5px solid #E2E6EC', borderRadius: 8, fontSize: 12, fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
                      </td>
                      {(['dias_chapa', 'panos_pintura', 'hs_mecanica', 'otros'] as const).map(campo => (
                        <td key={campo} style={{ padding: '8px 10px' }}>
                          <input type="number" min="0" step="0.5" value={dano[campo] || ''} onChange={e => actualizarDano(i, campo, e.target.value)}
                            placeholder="0"
                            style={{ width: 80, padding: '6px 10px', border: '1.5px solid #E2E6EC', borderRadius: 8, fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none', textAlign: 'right' }} />
                        </td>
                      ))}
                      <td style={{ padding: '8px 10px' }}>
                        <button onClick={() => quitarDano(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8D0DC', fontSize: 16, padding: 4 }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#E8404A')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#C8D0DC')}>
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #E2E6EC', background: '#F7F8FA' }}>
                    <td colSpan={2} style={{ padding: '10px 10px', fontWeight: 700, fontSize: 12 }}>TOTALES</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', textAlign: 'right' }}>{formatNum(totalChapa)}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', textAlign: 'right' }}>{formatNum(totalPanos)}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', textAlign: 'right' }}>{formatNum(totalMecanica)}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', textAlign: 'right' }}>{formatNum(totalOtros)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Totales mobile */}
          {isMobile && (
            <div style={{ marginTop: 14, background: '#F7F8FA', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Totales</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Días chapa',    value: totalChapa },
                  { label: 'Paños pintura', value: totalPanos },
                  { label: 'Hs mecánica',   value: totalMecanica },
                  { label: 'Otros ($)',     value: totalOtros },
                ].map(t => (
                  <div key={t.label} style={{ background: 'white', borderRadius: 8, padding: '8px 10px', border: '1px solid #E2E6EC' }}>
                    <div style={{ fontSize: 11, color: '#8896A8', marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', fontSize: 15 }}>{formatNum(t.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => setDanos(prev => [...prev, danonuevo()])}
            style={{ marginTop: 14, background: 'white', border: '1.5px dashed #E2E6EC', borderRadius: 10, padding: '10px 18px', fontSize: 13, color: '#4A5568', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%' }}>
            + Agregar daño
          </button>

          {/* Mano de obra */}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4A5568' }}>Mano de obra total (opcional):</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#8896A8' }}>$</span>
              <input type="number" min="0" value={manoObra} onChange={e => setManoObra(e.target.value)}
                placeholder="0"
                style={{ width: 130, padding: '8px 10px 8px 22px', border: '1.5px solid #E2E6EC', borderRadius: 10, fontSize: 13, fontFamily: 'DM Mono, monospace', outline: 'none', textAlign: 'right' }} />
            </div>
          </div>
        </div>

      </div>

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