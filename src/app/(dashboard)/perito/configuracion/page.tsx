'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PeritoConfiguracion() {
  const [loading, setLoading]       = useState(true)
  const [guardando, setGuardando]   = useState(false)
  const [mensaje, setMensaje]       = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [nombre, setNombre]         = useState('')
  const [email, setEmail]           = useState('')
  const [companias, setCompanias]   = useState<any[]>([])
  const [seleccionadas, setSeleccionadas] = useState<string[]>([])
  const [userId, setUserId]         = useState('')

  const [passNueva, setPassNueva]   = useState('')
  const [passNueva2, setPassNueva2] = useState('')
  const [cambiandoPass, setCambiandoPass] = useState(false)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setUserId(session.user.id)
    setEmail(session.user.email || '')

    const [{ data: usuario }, { data: ciaData }, { data: misCompanias }] = await Promise.all([
      supabase.from('usuarios').select('*').eq('id', session.user.id).single(),
      supabase.from('companias').select('*').order('nombre'),
      supabase.from('perito_companias').select('compania_id').eq('perito_id', session.user.id),
    ])

    if (usuario) setNombre(usuario.nombre || '')
    setCompanias(ciaData || [])
    setSeleccionadas((misCompanias || []).map((r: any) => r.compania_id))
    setLoading(false)
  }

  function toggleCompania(id: string) {
    setSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  async function guardarDatos() {
    setGuardando(true)
    setMensaje(null)

    // Guardar nombre
    const { error: errUsuario } = await supabase
      .from('usuarios')
      .update({ nombre })
      .eq('id', userId)

    if (errUsuario) {
      setMensaje({ tipo: 'error', texto: 'Error al guardar los datos.' })
      setGuardando(false)
      return
    }

    // Sincronizar compañías — borrar y reinsertar
    await supabase.from('perito_companias').delete().eq('perito_id', userId)

    if (seleccionadas.length > 0) {
      await supabase.from('perito_companias').insert(
        seleccionadas.map(compania_id => ({ perito_id: userId, compania_id }))
      )
    }

    setMensaje({ tipo: 'ok', texto: 'Datos guardados correctamente.' })
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
        <p style={{ fontSize: 14, color: '#8896A8' }}>Editá tu información y tus compañías asignadas.</p>
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
        </div>
      </div>

      {/* Compañías */}
      <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Compañías asignadas
        </div>
        <p style={{ fontSize: 13, color: '#8896A8', marginBottom: 16 }}>
          Seleccioná las compañías para las que recibís peritaciones.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {companias.map(c => {
            const activa = seleccionadas.includes(c.id)
            return (
              <div key={c.id} onClick={() => toggleCompania(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${activa ? '#063940' : '#E2E6EC'}`,
                  background: activa ? '#eaf4f4' : 'white',
                  transition: 'all .15s',
                }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${activa ? '#063940' : '#C8D0DC'}`,
                  background: activa ? '#063940' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {activa && <span style={{ color: 'white', fontSize: 12, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontSize: 14, fontWeight: activa ? 600 : 400, color: activa ? '#063940' : '#4A5568' }}>
                  {c.nombre}
                </span>
              </div>
            )
          })}
        </div>

        {seleccionadas.length > 0 && (
          <div style={{ marginTop: 14, fontSize: 13, color: '#3e838c', fontWeight: 600 }}>
            {seleccionadas.length} compañía{seleccionadas.length !== 1 ? 's' : ''} seleccionada{seleccionadas.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Botón guardar */}
      <button onClick={guardarDatos} disabled={guardando}
        style={{ width: '100%', marginBottom: 16, background: guardando ? '#9AA5B4' : '#063940', color: 'white', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
        {guardando ? 'Guardando...' : '💾 Guardar cambios'}
      </button>

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