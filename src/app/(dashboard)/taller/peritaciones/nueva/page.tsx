'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Compania } from '@/types'

export default function NuevaPeritacionPage() {
  const router       = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [companias, setCompanias]   = useState<Compania[]>([])
  const [peritos, setPeritos]       = useState<any[]>([])
  const [tallerId, setTallerId]     = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [fotos, setFotos]           = useState<{ file: File; preview: string }[]>([])

  // Campos
  const [companiaId, setCompaniaId]     = useState('')
  const [peritoId, setPeritoId]         = useState('')
  const [tipo, setTipo]                 = useState('')
  const [vehiculo, setVehiculo]         = useState('')
  const [patente, setPatente]           = useState('')
  const [nroSiniestro, setNroSiniestro] = useState('')
  const [cliente, setCliente]           = useState('')

  useEffect(() => { cargarDatos() }, [])

  // Cuando cambia la compañía, cargar peritos de esa compañía
  useEffect(() => {
    setPeritoId('')
    if (!companiaId) { setPeritos([]); return }
    supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('rol', 'perito')
      .eq('compania_id', companiaId)
      .order('nombre')
      .then(({ data }) => setPeritos(data || []))
  }, [companiaId])

  async function cargarDatos() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: usuario } = await supabase
      .from('usuarios').select('taller_id').eq('id', session.user.id).single()
    if (!usuario?.taller_id) return
    setTallerId(usuario.taller_id)
    const { data: ciaData } = await supabase.from('companias').select('*').order('nombre')
    setCompanias(ciaData || [])
  }

  function agregarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const nuevas = files.map(file => ({ file, preview: URL.createObjectURL(file) }))
    setFotos(prev => [...prev, ...nuevas])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function quitarFoto(index: number) {
    setFotos(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function guardar() {
    if (!companiaId) { setError('Elegí una compañía de seguros'); return }
    if (!tallerId)   { setError('Error de sesión, recargá la página'); return }

    setLoading(true)
    setError('')

    const { data: peritacion, error: errPer } = await supabase
      .from('peritaciones')
      .insert({
        taller_id:     tallerId,
        compania_id:   companiaId,
        perito_id:     peritoId || null,
        tipo:          tipo || null,
        vehiculo:      vehiculo || null,
        patente:       patente.toUpperCase() || null,
        nro_siniestro: nroSiniestro || null,
        cliente:       cliente || null,
        estado:        'pendiente',
      })
      .select()
      .single()

    if (errPer || !peritacion) {
      setLoading(false)
      setError('Error al guardar, intentá de nuevo')
      return
    }

    // Subir fotos
    for (const foto of fotos) {
      const ext      = foto.file.name.split('.').pop()
      const fileName = `${peritacion.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: errUpload } = await supabase.storage
        .from('siniestros-fotos')
        .upload(fileName, foto.file, { contentType: foto.file.type })
      if (errUpload) continue
      const { data: { publicUrl } } = supabase.storage.from('siniestros-fotos').getPublicUrl(fileName)
      await supabase.from('fotos').insert({ peritacion_id: peritacion.id, url: publicUrl, nombre: foto.file.name })
    }

    router.push(`/taller/peritaciones/${peritacion.id}`)
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()}
          style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#4A5568', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          ← Volver
        </button>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, color: '#0F1623', letterSpacing: -.3 }}>
            Nueva peritación
          </h1>
          <p style={{ fontSize: 13, color: '#8896A8' }}>Solo la compañía es obligatoria. El resto lo completás después.</p>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#E8404A', marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Datos */}
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            Datos del vehículo
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Compañía */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
                Compañía de seguros <span style={{ color: '#E8404A' }}>*</span>
              </label>
              <select value={companiaId} onChange={e => setCompaniaId(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${!companiaId && error ? '#E8404A' : '#E2E6EC'}`, borderRadius: 12, fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: companiaId ? '#0F1623' : '#8896A8', outline: 'none', background: 'white' }}>
                <option value="">Seleccioná la compañía</option>
                {companias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            {/* Perito — aparece solo cuando hay compañía seleccionada */}
            {companiaId && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
                  Perito asignado
                  <span style={{ fontSize: 11, color: '#8896A8', fontWeight: 400, marginLeft: 6 }}>(opcional)</span>
                </label>
                {peritos.length === 0 ? (
                  <div style={{ padding: '10px 14px', border: '1.5px solid #E2E6EC', borderRadius: 12, fontSize: 13, color: '#8896A8', background: '#F7F8FA' }}>
                    No hay peritos registrados para esta compañía
                  </div>
                ) : (
                  <select value={peritoId} onChange={e => setPeritoId(e.target.value)}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E2E6EC', borderRadius: 12, fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: peritoId ? '#0F1623' : '#8896A8', outline: 'none', background: 'white' }}>
                    <option value="">Sin asignar</option>
                    {peritos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                )}
              </div>
            )}

            {/* Tipo */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>Tipo de siniestro</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { value: 'chapa_pintura', label: '🔧 Chapa y pintura' },
                  { value: 'granizo',       label: '🌨 Granizo' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setTipo(tipo === opt.value ? '' : opt.value)}
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all .15s',
                      background: tipo === opt.value ? '#063940' : 'white',
                      color:      tipo === opt.value ? 'white'   : '#4A5568',
                      border:     `1.5px solid ${tipo === opt.value ? '#063940' : '#E2E6EC'}`,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehículo y Patente */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>Vehículo</label>
                <input type="text" value={vehiculo} onChange={e => setVehiculo(e.target.value)} placeholder="Ej: VW Gol 2020"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E2E6EC', borderRadius: 12, fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#0F1623', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>Patente</label>
                <input type="text" value={patente} onChange={e => setPatente(e.target.value.toUpperCase())} placeholder="Ej: AB 123 CD"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E2E6EC', borderRadius: 12, fontSize: 14, fontFamily: 'DM Mono, monospace', color: '#063940', outline: 'none', letterSpacing: 1 }} />
              </div>
            </div>

            {/* Siniestro y Cliente */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>N° Siniestro</label>
                <input type="text" value={nroSiniestro} onChange={e => setNroSiniestro(e.target.value)} placeholder="Ej: 00123456"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E2E6EC', borderRadius: 12, fontSize: 14, fontFamily: 'DM Mono, monospace', color: '#0F1623', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>Cliente</label>
                <input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre del asegurado"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E2E6EC', borderRadius: 12, fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#0F1623', outline: 'none' }} />
              </div>
            </div>

          </div>
        </div>

        {/* Fotos */}
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1 }}>Fotos del daño</div>
              <div style={{ fontSize: 12, color: '#8896A8', marginTop: 2 }}>
                {fotos.length === 0 ? 'Opcional — podés agregarlas ahora o después' : `${fotos.length} foto${fotos.length !== 1 ? 's' : ''} agregada${fotos.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            <button onClick={() => fileInputRef.current?.click()}
              style={{ background: '#063940', color: 'white', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              📷 Agregar fotos
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment" onChange={agregarFotos} style={{ display: 'none' }} />

          {fotos.length === 0 ? (
            <div onClick={() => fileInputRef.current?.click()}
              style={{ border: '2px dashed #E2E6EC', borderRadius: 14, padding: '32px 20px', textAlign: 'center', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#3e838c')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#E2E6EC')}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#4A5568', marginBottom: 4 }}>Tocá para sacar fotos o subir desde la galería</div>
              <div style={{ fontSize: 12, color: '#8896A8' }}>En el celular abre la cámara directamente</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
              {fotos.map((foto, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '1', border: '1px solid #E2E6EC' }}>
                  <img src={foto.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => quitarFoto(i)}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.6)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ✕
                  </button>
                </div>
              ))}
              <div onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed #E2E6EC', borderRadius: 10, aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 24, color: '#C8D0DC' }}>
                +
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Botón guardar */}
      <div style={{ marginTop: 20 }}>
        <button onClick={guardar} disabled={loading}
          style={{ width: '100%', padding: 16, background: loading ? '#9AA5B4' : '#063940', color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          {loading ? `Guardando${fotos.length > 0 ? ` fotos (${fotos.length})...` : '...'}` : '✓ Crear peritación pendiente'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#8896A8', marginTop: 10 }}>
          Después podés agregar daños y enviar al perito desde el detalle.
        </p>
      </div>

    </div>
  )
}