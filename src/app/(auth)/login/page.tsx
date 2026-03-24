'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function doLogin() {
    setError('')
    if (!email || !pass) { setError('Completá email y contraseña'); return }
    setLoading(true)

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (err) { setLoading(false); setError('Email o contraseña incorrectos'); return }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', data.user.id)
      .single()

    if (usuario?.rol === 'taller') {
      router.push('/taller/inicio')
    } else {
      router.push('/perito/inicio')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 16px 48px rgba(15,22,35,.12)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, background: '#063940', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 800, color: 'white' }}>M</div>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: '#063940', lineHeight: 1.2 }}>Matexa</div>
            <div style={{ fontSize: 10, color: '#8896A8', fontWeight: 600, letterSpacing: .5 }}>peritaciones</div>
          </div>
        </div>

        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#0F1623', marginBottom: 4 }}>Iniciar sesión</h1>
        <p style={{ fontSize: 13, color: '#8896A8', marginBottom: 28 }}>Bienvenido de vuelta</p>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#E8404A', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E2E6EC', borderRadius: 12, fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#0F1623', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F1623', marginBottom: 7 }}>Contraseña</label>
          <input
            type="password" value={pass} onChange={e => setPass(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E2E6EC', borderRadius: 12, fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#0F1623', outline: 'none' }}
          />
        </div>

        <button
          onClick={doLogin} disabled={loading}
          style={{ width: '100%', padding: 14, background: loading ? '#9AA5B4' : '#063940', color: 'white', fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Ingresando...' : 'Ingresar →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#8896A8', marginTop: 16 }}>
          ¿No tenés cuenta?{' '}
          <a href="/" style={{ color: '#063940', fontWeight: 600 }}>Registrate desde el inicio</a>
        </p>
      </div>
    </div>
  )
}