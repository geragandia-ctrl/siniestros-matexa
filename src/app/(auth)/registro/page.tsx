'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function RegistroForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const tipoParam    = searchParams.get('tipo')

  const [tipo, setTipo]           = useState<'taller' | 'perito'>(tipoParam === 'perito' ? 'perito' : 'taller')
  const [companias, setCompanias] = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  // Campos taller
  const [nombreTaller, setNombreTaller] = useState('')

  // Campos perito
  const [nombre, setNombre]       = useState('')
  const [apellido, setApellido]   = useState('')
  const [companiaId, setCompaniaId] = useState('')

  // Campos comunes
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [pass2, setPass2]     = useState('')

  useEffect(() => {
    supabase.from('companias').select('*').order('nombre').then(({ data }) => {
      setCompanias(data || [])
    })
  }, [])

  async function registrar() {
    setError('')

    // Validaciones
    if (tipo === 'taller' && !nombreTaller.trim()) { setError('Ingresá el nombre del taller'); return }
    if (tipo === 'perito' && !nombre.trim())        { setError('Ingresá tu nombre'); return }
    if (tipo === 'perito' && !apellido.trim())      { setError('Ingresá tu apellido'); return }
    if (tipo === 'perito' && !companiaId)           { setError('Elegí tu compañía de seguros'); return }
    if (!email.trim())                              { setError('Ingresá tu email'); return }
    if (pass.length < 6)                            { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (pass !== pass2)                             { setError('Las contraseñas no coinciden'); return }

    setLoading(true)

    // Crear usuario en Supabase Auth
    const { data, error: authError } = await supabase.auth.signUp({ email, password: pass })
    if (authError) {
      setLoading(false)
      setError(authError.message === 'User already registered' ? 'Este email ya está registrado' : authError.message)
      return
    }

    const uid = data.user!.id

    if (tipo === 'taller') {
      // Crear taller
      const { data: tallerData, error: tallerError } = await supabase
        .from('talleres')
        .insert({
          nombre_fantasia: nombreTaller,
          razon_social:    nombreTaller,
          direccion:       '-',
          telefono:        '-',
        })
        .select()
        .single()

      if (tallerError) { setLoading(false); setError('Error al crear el taller'); return }

      // Crear usuario taller
      await supabase.from('usuarios').insert({
        id:        uid,
        rol:       'taller',
        taller_id: tallerData.id,
        nombre:    nombreTaller,
        email,
      })

      router.push('/taller/inicio')

    } else {
      // Crear usuario perito
      await supabase.from('usuarios').insert({
        id:          uid,
        rol:         'perito',
        compania_id: companiaId,
        nombre:      `${nombre} ${apellido}`,
        email,
      })

      router.push('/perito/inicio')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: '1.5px solid #E2E6EC', borderRadius: 12,
    fontSize: 14, fontFamily: 'DM Sans, sans-serif',
    color: '#0F1623', outline: 'none', background: 'white',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 40, width: '100%', maxWidth: 460, boxShadow: '0 16px 48px rgba(15,22,35,.12)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, background: '#063940', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 800, color: 'white' }}>M</div>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: '#063940', lineHeight: 1.2 }}>Matexa</div>
            <div style={{ fontSize: 10, color: '#8896A8', fontWeight: 600, letterSpacing: .5 }}>siniestros</div>
          </div>
        </div>

        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#0F1623', marginBottom: 4 }}>Crear cuenta</h1>
        <p style={{ fontSize: 13, color: '#8896A8', marginBottom: 24 }}>Empezá a gestionar peritaciones hoy</p>

        {/* Selector tipo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[
            { value: 'taller', label: '🔧 Soy un taller' },
            { value: 'perito', label: '🏢 Soy perito' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setTipo(opt.value as 'taller' | 'perito')}
              style={{
                padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all .15s',
                background: tipo === opt.value ? '#063940' : 'white',
                color:      tipo === opt.value ? 'white'   : '#4A5568',
                border:     `1.5px solid ${tipo === opt.value ? '#063940' : '#E2E6EC'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#E8404A', marginBottom: 20 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Campos según tipo */}
          {tipo === 'taller' ? (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
                Nombre del taller <span style={{ color: '#E8404A' }}>*</span>
              </label>
              <input type="text" value={nombreTaller} onChange={e => setNombreTaller(e.target.value)}
                placeholder="Ej: Taller Mazzoli" style={inputStyle} />
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
                    Nombre <span style={{ color: '#E8404A' }}>*</span>
                  </label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                    placeholder="Juan" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
                    Apellido <span style={{ color: '#E8404A' }}>*</span>
                  </label>
                  <input type="text" value={apellido} onChange={e => setApellido(e.target.value)}
                    placeholder="Pérez" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
                  Compañía de seguros <span style={{ color: '#E8404A' }}>*</span>
                </label>
                <select value={companiaId} onChange={e => setCompaniaId(e.target.value)} style={inputStyle}>
                  <option value="">Seleccioná tu compañía</option>
                  {companias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
              Email <span style={{ color: '#E8404A' }}>*</span>
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" style={inputStyle} />
          </div>

          {/* Contraseñas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
                Contraseña <span style={{ color: '#E8404A' }}>*</span>
              </label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)}
                placeholder="Mínimo 6 caracteres" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>
                Repetir contraseña <span style={{ color: '#E8404A' }}>*</span>
              </label>
              <input type="password" value={pass2} onChange={e => setPass2(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && registrar()}
                style={inputStyle} />
            </div>
          </div>

        </div>

        <button
          onClick={registrar} disabled={loading}
          style={{ width: '100%', marginTop: 24, padding: 14, background: loading ? '#9AA5B4' : '#063940', color: 'white', fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#8896A8', marginTop: 16 }}>
          ¿Ya tenés cuenta?{' '}
          <a href="/login" style={{ color: '#063940', fontWeight: 600 }}>Iniciá sesión acá</a>
        </p>

      </div>
    </div>
  )
}
export default function RegistroPage() {
  return (
    <Suspense>
      <RegistroForm />
    </Suspense>
  )
}