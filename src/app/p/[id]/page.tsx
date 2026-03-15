'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export default function PeritacionPublica() {
  const { id } = useParams<{ id: string }>()

  const [peritacion, setPeritacion]     = useState<any>(null)
  const [danos, setDanos]               = useState<any[]>([])
  const [fotos, setFotos]               = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)
  const [isMobile, setIsMobile]         = useState(false)

  useEffect(() => {
    cargarDatos()
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [id])

  async function cargarDatos() {
    const [{ data: per }, { data: danosData }, { data: fotosData }] = await Promise.all([
      supabase.from('peritaciones')
        .select('*, taller:talleres(nombre_fantasia, razon_social, direccion, telefono, cuit, logo_url), compania:companias(nombre)')
        .eq('id', id).single(),
      supabase.from('danos').select('*').eq('peritacion_id', id).order('orden'),
      supabase.from('fotos').select('*').eq('peritacion_id', id).order('created_at'),
    ])
    setPeritacion(per)
    setDanos(danosData || [])
    setFotos(fotosData || [])
    setLoading(false)
  }

  const totalChapa    = danos.reduce((s, d) => s + (Number(d.dias_chapa)    || 0), 0)
  const totalPanos    = danos.reduce((s, d) => s + (Number(d.panos_pintura) || 0), 0)
  const totalMecanica = danos.reduce((s, d) => s + (Number(d.hs_mecanica)   || 0), 0)
  const totalOtros    = danos.reduce((s, d) => s + (Number(d.otros)         || 0), 0)

  function formatNum(n: number) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  function formatFecha(fecha: string) {
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  function exportarExcel() {
    const taller = peritacion.taller
    const datosGenerales = [
      ['PERITACIÓN DE SINIESTRO'], [],
      ['Taller',          taller?.nombre_fantasia || ''],
      ['Razón social',    taller?.razon_social    || ''],
      ['Dirección',       taller?.direccion       || ''],
      ['Teléfono',        taller?.telefono        || ''],
      ['CUIT',            taller?.cuit            || ''],
      [],
      ['Compañía',        peritacion.compania?.nombre  || ''],
      ['Vehículo',        peritacion.vehiculo          || ''],
      ['Patente',         peritacion.patente           || ''],
      ['Cliente',         peritacion.cliente           || ''],
      ['N° Siniestro',    peritacion.nro_siniestro     || ''],
      ['Tipo',            peritacion.tipo === 'chapa_pintura' ? 'Chapa y pintura' : peritacion.tipo === 'granizo' ? 'Granizo' : ''],
      ['Fecha envío',     peritacion.fecha_envio ? new Date(peritacion.fecha_envio).toLocaleDateString('es-AR') : ''],
    ]
    const encabezados = ['Acción', 'Pieza', 'Días chapa', 'Paños pintura', 'Hs mecánica', 'Otros ($)']
    const filasDanos  = danos.map(d => [d.accion, d.pieza, d.dias_chapa, d.panos_pintura, d.hs_mecanica, d.otros])
    const filaTotales = ['TOTALES', '', totalChapa, totalPanos, totalMecanica, totalOtros]
    const filaManoObra = peritacion.mano_obra_total ? [[], ['Mano de obra total', '', '', '', '', peritacion.mano_obra_total]] : []
    const danosSheet = [encabezados, ...filasDanos, [], filaTotales, ...filaManoObra]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(datosGenerales), 'Datos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(danosSheet), 'Daños')
    XLSX.writeFile(wb, `Peritacion_${peritacion.patente || peritacion.id.slice(0, 6)}_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F7F8FA' }}>
      <p style={{ fontSize: 14, color: '#8896A8', fontFamily: 'DM Sans, sans-serif' }}>Cargando...</p>
    </div>
  )

  if (!peritacion) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F7F8FA' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        <p style={{ fontSize: 15, color: '#8896A8', fontFamily: 'DM Sans, sans-serif' }}>Peritación no encontrada.</p>
      </div>
    </div>
  )

  const taller = peritacion.taller

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <header style={{ background: '#0F1623', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#195e63', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 800, color: 'white' }}>M</div>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>Matexa</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>siniestros</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Vista pública · Solo lectura</div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '20px 16px' : '28px 20px' }}>

        {/* Título */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#0F1623', letterSpacing: -.3 }}>
              {peritacion.vehiculo || 'Vehículo sin definir'}
            </h1>
            {peritacion.patente && (
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#063940', background: '#eaf4f4', padding: '3px 12px', borderRadius: 8, fontWeight: 600 }}>
                {peritacion.patente}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#8896A8' }}>
            {peritacion.compania?.nombre}
            {peritacion.nro_siniestro && ` · Stro: ${peritacion.nro_siniestro}`}
            {peritacion.fecha_envio && ` · Enviada el ${formatFecha(peritacion.fecha_envio)}`}
          </div>
        </div>

        {/* Botón Excel */}
        <div style={{ marginBottom: 20 }}>
          <button onClick={exportarExcel}
            style={{ background: '#063940', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            📊 Exportar Excel
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Datos taller + vehículo */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>

            {/* Taller */}
            <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: isMobile ? 18 : 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Datos del taller</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                {taller?.logo_url ? (
                  <img src={taller.logo_url} alt="Logo" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'contain', border: '1px solid #E2E6EC', padding: 4 }} />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: 10, background: '#eaf4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏭</div>
                )}
                <div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#0F1623' }}>{taller?.nombre_fantasia}</div>
                  <div style={{ fontSize: 12, color: '#8896A8' }}>{taller?.razon_social}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {taller?.direccion && <div style={{ fontSize: 13, color: '#4A5568' }}>📍 {taller.direccion}</div>}
                {taller?.telefono  && <div style={{ fontSize: 13, color: '#4A5568' }}>📞 {taller.telefono}</div>}
                {taller?.cuit      && <div style={{ fontSize: 13, color: '#4A5568', fontFamily: 'DM Mono, monospace' }}>CUIT: {taller.cuit}</div>}
              </div>
            </div>

            {/* Vehículo */}
            <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: isMobile ? 18 : 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Datos del vehículo</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Vehículo',     value: peritacion.vehiculo },
                  { label: 'Patente',      value: peritacion.patente, mono: true },
                  { label: 'Cliente',      value: peritacion.cliente },
                  { label: 'N° Siniestro', value: peritacion.nro_siniestro, mono: true },
                  { label: 'Tipo',         value: peritacion.tipo === 'chapa_pintura' ? 'Chapa y pintura' : peritacion.tipo === 'granizo' ? 'Granizo' : null },
                ].map(item => item.value && (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#8896A8', fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontSize: 13, color: '#0F1623', fontFamily: item.mono ? 'DM Mono, monospace' : undefined, fontWeight: item.mono ? 600 : 500 }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fotos */}
          {fotos.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: isMobile ? 18 : 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                Fotos del daño ({fotos.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                {fotos.map(foto => (
                  <div key={foto.id} onClick={() => setFotoAmpliada(foto.url)}
                    style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '1', border: '1px solid #E2E6EC', cursor: 'zoom-in' }}>
                    <img src={foto.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daños */}
          {danos.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: isMobile ? 18 : 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                Tabla de daños
              </div>

              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {danos.map((d, i) => (
                    <div key={i} style={{ border: '1px solid #E2E6EC', borderRadius: 10, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ background: '#eaf4f4', color: '#063940', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, textTransform: 'capitalize' as const }}>{d.accion}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F1623' }}>{d.pieza}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {[
                          { label: 'Días chapa',    value: d.dias_chapa },
                          { label: 'Paños pintura', value: d.panos_pintura },
                          { label: 'Hs mecánica',   value: d.hs_mecanica },
                          { label: 'Otros ($)',     value: d.otros },
                        ].filter(x => x.value > 0).map(item => (
                          <div key={item.label} style={{ background: '#F7F8FA', borderRadius: 6, padding: '6px 8px' }}>
                            <div style={{ fontSize: 10, color: '#8896A8', marginBottom: 1 }}>{item.label}</div>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', fontSize: 13 }}>{formatNum(item.value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={{ background: '#F7F8FA', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Totales</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
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
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E6EC' }}>
                        {['Acción', 'Pieza', 'Días chapa', 'Paños pintura', 'Hs mecánica', 'Otros ($)'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: .5, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {danos.map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F7F8FA' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: '#eaf4f4', color: '#063940', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, textTransform: 'capitalize' as const }}>{d.accion}</span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#0F1623', fontWeight: 500 }}>{d.pieza}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', textAlign: 'right', color: '#4A5568' }}>{formatNum(d.dias_chapa)}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', textAlign: 'right', color: '#4A5568' }}>{formatNum(d.panos_pintura)}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', textAlign: 'right', color: '#4A5568' }}>{formatNum(d.hs_mecanica)}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', textAlign: 'right', color: '#4A5568' }}>{formatNum(d.otros)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #E2E6EC', background: '#F7F8FA' }}>
                        <td colSpan={2} style={{ padding: '10px 12px', fontWeight: 700, fontSize: 12, color: '#0F1623' }}>TOTALES</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', textAlign: 'right' }}>{formatNum(totalChapa)}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', textAlign: 'right' }}>{formatNum(totalPanos)}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', textAlign: 'right' }}>{formatNum(totalMecanica)}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', textAlign: 'right' }}>{formatNum(totalOtros)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {peritacion.mano_obra_total && (
                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#eaf4f4', borderRadius: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#4A5568' }}>Mano de obra total:</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 700, color: '#063940' }}>
                    ${formatNum(peritacion.mano_obra_total)}
                  </span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 12, color: '#C8D0DC' }}>
          Generado por Matexa Siniestros · siniestros.matexa.app
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