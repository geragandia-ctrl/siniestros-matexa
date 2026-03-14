'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function ConfiguracionPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tallerId, setTallerId]           = useState<string | null>(null)
  const [loading, setLoading]             = useState(true)
  const [guardando, setGuardando]         = useState(false)
  const [subiendoLogo, setSubiendoLogo]   = useState(false)
  const [guardado, setGuardado]           = useState(false)
  const [cambiosPendientes, setCambiosPendientes] = useState(false)

  // Campos
  const [nombreFantasia, setNombreFantasia] = useState('')
  const [razonSocial, setRazonSocial]       = useState('')
  const [direccion, setDireccion]           = useState('')
  const [telefono, setTelefono]             = useState('')
  const [cuit, setCuit]                     = useState('')
  const [logoUrl, setLogoUrl]               = useState('')

  // Valores originales para detectar cambios
  const [original, setOriginal] = useState<any>(null)

  useEffect(() => { cargarDatos() }, [])

  // Detectar cambios sin guardar
  useEffect(() => {
    if (!original) return
    const hayCambios =
      nombreFantasia !== original.nombre_fantasia ||
      razonSocial    !== original.razon_social    ||
      direccion      !== original.direccion       ||
      telefono       !== original.telefono        ||
      cuit           !== (original.cuit || '')    ||
      logoUrl        !== (original.logo_url || '')
    setCambiosPendientes(hayCambios)
  }, [nombreFantasia, razonSocial, direccion, telefono, cuit, logoUrl, original])

  // Alertar si sale sin guardar
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (cambiosPendientes) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [cambiosPendientes])

  async function cargarDatos() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: usuario } = await supabase
      .from('usuarios').select('taller_id').eq('id', session.user.id).single()
    if (!usuario?.taller_id) return
    setTallerId(usuario.taller_id)

    const { data: taller } = await supabase
      .from('talleres').select('*').eq('id', usuario.taller_id).single()

    if (taller) {
      setNombreFantasia(taller.nombre_fantasia || '')
      setRazonSocial(taller.razon_social || '')
      setDireccion(taller.direccion || '')
      setTelefono(taller.telefono || '')
      setCuit(taller.cuit || '')
      setLogoUrl(taller.logo_url || '')
      setOriginal(taller)
    }

    setLoading(false)
  }

  async function guardar() {
    if (!nombreFantasia.trim()) { alert('El nombre del taller es obligatorio'); return }
    if (!razonSocial.trim())    { alert('La razón social es obligatoria'); return }
    if (!direccion.trim())      { alert('La dirección es obligatoria'); return }
    if (!telefono.trim())       { alert('El teléfono es obligatorio'); return }

    setGuardando(true)

    await supabase.from('talleres').update({
      nombre_fantasia: nombreFantasia,
      razon_social:    razonSocial,
      direccion,
      telefono,
      cuit:     cuit || null,
      logo_url: logoUrl || null,
    }).eq('id', tallerId)

    setOriginal({ nombre_fantasia: nombreFantasia, razon_social: razonSocial, direccion, telefono, cuit, logo_url: logoUrl })
    setCambiosPendientes(false)
    setGuardando(false)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
  }

  async function subirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !tallerId) return

    setSubiendoLogo(true)
    const ext      = file.name.split('.').pop()
    const fileName = `logos/${tallerId}.${ext}`

    await supabase.storage.from('siniestros-fotos').remove([fileName])

    const { error } = await supabase.storage
      .from('siniestros-fotos')
      .upload(fileName, file, { contentType: file.type, upsert: true })

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('siniestros-fotos').getPublicUrl(fileName)
      setLogoUrl(publicUrl)
      setCambiosPendientes(true)
    }

    setSubiendoLogo(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: '1.5px solid #E2E6EC', borderRadius: 12,
    fontSize: 14, fontFamily: 'DM Sans, sans-serif',
    color: '#0F1623', outline: 'none', background: 'white',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <p style={{ fontSize: 14, color: '#8896A8' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700, color: '#0F1623', letterSpacing: -.3, marginBottom: 4 }}>
            Mi taller
          </h1>
          <p style={{ fontSize: 14, color: '#8896A8' }}>
            Estos datos aparecen en los Excel y PDF que exportás.
          </p>
        </div>
        {cambiosPendientes && (
          <span style={{ fontSize: 12, color: '#F5962A', fontWeight: 600, background: '#FFF3E0', padding: '4px 12px', borderRadius: 20 }}>
            ● Cambios sin guardar
          </span>
        )}
      </div>

      {guardado && (
        <div style={{ background: '#E6FBF3', border: '1px solid #0DBF7E', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#047857', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          ✅ Datos guardados correctamente
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Logo */}
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            Logo del taller
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Preview */}
            <div style={{ width: 90, height: 90, borderRadius: 14, border: '1.5px solid #E2E6EC', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
              ) : (
                <span style={{ fontSize: 32 }}>🏭</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 6 }}>
                {logoUrl ? 'Logo cargado' : 'Sin logo todavía'}
              </div>
              <div style={{ fontSize: 12, color: '#8896A8', marginBottom: 12 }}>
                PNG o JPG. Se va a ver en los PDF y Excel exportados.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => fileInputRef.current?.click()} disabled={subiendoLogo}
                  style={{ background: '#063940', color: 'white', border: 'none', borderRadius: 9, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  {subiendoLogo ? 'Subiendo...' : logoUrl ? '🔄 Cambiar logo' : '📤 Subir logo'}
                </button>
                {logoUrl && (
                  <button onClick={() => { setLogoUrl(''); setCambiosPendientes(true) }}
                    style={{ background: 'white', color: '#E8404A', border: '1px solid #FECACA', borderRadius: 9, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={subirLogo} style={{ display: 'none' }} />
        </div>

        {/* Datos */}
        <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>
            Datos del taller
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
                  Nombre fantasía <span style={{ color: '#E8404A' }}>*</span>
                </label>
                <input type="text" value={nombreFantasia} onChange={e => setNombreFantasia(e.target.value)}
                  placeholder="Ej: Taller Mazzoli" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
                  Razón social <span style={{ color: '#E8404A' }}>*</span>
                </label>
                <input type="text" value={razonSocial} onChange={e => setRazonSocial(e.target.value)}
                  placeholder="Ej: Mazzoli Juan Carlos" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
                Dirección <span style={{ color: '#E8404A' }}>*</span>
              </label>
              <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)}
                placeholder="Ej: Av. Colón 1234, Córdoba" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
                  Teléfono <span style={{ color: '#E8404A' }}>*</span>
                </label>
                <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                  placeholder="Ej: 351 000-0000" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
                  CUIT <span style={{ fontSize: 11, color: '#8896A8', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input type="text" value={cuit} onChange={e => setCuit(e.target.value)}
                  placeholder="Ej: 20-12345678-9" style={{ ...inputStyle, fontFamily: 'DM Mono, monospace' }} />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Botón guardar */}
      <div style={{ marginTop: 20 }}>
        <button onClick={guardar} disabled={guardando || !cambiosPendientes}
          style={{
            width: '100%', padding: 14,
            background: guardando || !cambiosPendientes ? '#9AA5B4' : '#063940',
            color: 'white', border: 'none', borderRadius: 14,
            fontSize: 15, fontWeight: 700,
            cursor: guardando || !cambiosPendientes ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}>
          {guardando ? 'Guardando...' : '💾 Guardar cambios'}
        </button>
        {!cambiosPendientes && !guardando && (
          <p style={{ textAlign: 'center', fontSize: 12, color: '#8896A8', marginTop: 8 }}>
            No hay cambios pendientes
          </p>
        )}
      </div>

    </div>
  )
}