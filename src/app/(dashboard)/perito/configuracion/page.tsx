'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PeritoConfiguracion() {
  const [loading, setLoading]     = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje]     = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [nombre, setNombre]       = useState('')
  const [email, setEmail]         = useState('')
  const [companiaId, setCompaniaId] = useState('')
  const [companias, setCompanias] = useState<any[]>([])
  const [userId, setUserId]       = useState('')

  // Contraseña
  const [passActual, setPassActual]   = useState('')
  const [passNueva, setPassNueva]     = useState('')
  const [passNueva2, setPassNueva2]   = useState('')
  const [cambiandoPass, setCambiandoPass] = useState(false)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setUserId(session.user.id)
    setEmail(session.user.email || '')

    const [{ data: usuario }, { data: ciaData }] = await Promise.all([
      supabase.from('usuarios').select('*').eq('id', session.user.id).single(),
      supabase.from('companias').select('*').order('nombre'),
    ])

    if (usuario) {
      setNombre(usuario.nombre || '')
      setCompaniaId(usuario.compania_id || '')
    }
    setCompanias(ciaData || [])
    setLoading(false)
  }

  async function guardarDatos() {
    setGuardando(true)
    setMensaje(null)

    const { error } = await supabase
      .from('usuarios')
      .update({ nombre, compania_id: companiaId || null })
      .eq('id', userId)

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al guardar. Intentá de nuevo.' })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Datos guardados correctamente.' })
    }
    setGuardando(false)
  }

  async function cambiarContrasena() {
    setMensaje(null)
    if (!passNueva || passNueva.length < 6) {
      setMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 6 caracteres.' })
      return
    }
    if (passNueva !== passNueva2) {
      setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })
      return
    }

    setCambiandoPass(true)
    const { error } = await supabase.auth.updateUser({ password: passNueva })

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al cambiar la contraseña.' })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Contraseña actualizada correctamente.' })
      setPassActual('')
      setPassNueva('')
      setPassNueva2('')
    }
    setCambiandoPass(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid #E2E6EC', borderRadius: 10,
    fontSize: 14, fontFamily: 'DM Sans, sans-serif',
    color: '#0F1623', outline: 'none', background: 'white',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: '#0F1623', marginBottom: 7,
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <p style={{ fontSize: 14, color: '#8896A8' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700, color: '#0F1623', marginBottom: 4, letterSpacing: -.4 }}>
          Mis datos
        </h1>
        <p style={{ fontSize: 14, color: '#8896A8' }}>Editá tu información de perito.</p>
      </div>

      {mensaje && (
        <div style={{
          background: mensaje.tipo === 'ok' ? '#E6FBF3' : '#FEF2F2',
          border: `1px solid ${mensaje.tipo === 'ok' ? '#0DBF7E' : '#FECACA'}`,
          borderRadius: 12, padding: '12px 16px', fontSize: 13,
          color: mensaje.tipo === 'ok' ? '#047857' : '#E8404A',
          marginBottom: 20,
        }}>
          {mensaje.tipo === 'ok' ? '✓ ' : '⚠ '}{mensaje.texto}
        </div>
      )}

      {/* Datos personales */}
      <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>
          Datos personales
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Nombre completo</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} disabled
              style={{ ...inputStyle, background: '#F7F8FA', color: '#8896A8', cursor: 'not-allowed' }} />
            <p style={{ fontSize: 11, color: '#8896A8', marginTop: 5 }}>El email no se puede modificar.</p>
          </div>

          <div>
            <label style={labelStyle}>Compañía de seguros</label>
            <select value={companiaId} onChange={e => setCompaniaId(e.target.value)} style={inputStyle}>
              <option value="">Sin asignar</option>
              {companias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        <button onClick={guardarDatos} disabled={guardando}
          style={{ marginTop: 20, background: guardando ? '#9AA5B4' : '#063940', color: 'white', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          {guardando ? 'Guardando...' : '💾 Guardar datos'}
        </button>
      </div>

      {/* Cambiar contraseña */}
      <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: 24, boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>
          Cambiar contraseña
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Nueva contraseña</label>
            <input type="password" value={passNueva} onChange={e => setPassNueva(e.target.value)}
              placeholder="Mínimo 6 caracteres" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Repetir nueva contraseña</label>
            <input type="password" value={passNueva2} onChange={e => setPassNueva2(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && cambiarContrasena()}
              style={inputStyle} />
          </div>
        </div>

        <button onClick={cambiarContrasena} disabled={cambiandoPass}
          style={{ marginTop: 20, background: cambiandoPass ? '#9AA5B4' : '#195e63', color: 'white', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 700, cursor: cambiandoPass ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          {cambiandoPass ? 'Actualizando...' : '🔒 Cambiar contraseña'}
        </button>
      </div>

    </div>
  )
}