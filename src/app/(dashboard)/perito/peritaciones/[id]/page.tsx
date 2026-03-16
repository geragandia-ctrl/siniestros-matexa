'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

export default function PeritoDetallePeritacion() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [peritacion, setPeritacion]     = useState<any>(null)
  const [danos, setDanos]               = useState<any[]>([])
  const [fotos, setFotos]               = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [confirmando, setConfirmando]   = useState(false)
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

  async function confirmarRecepcion() {
    setConfirmando(true)
    await supabase.from('peritaciones').update({
      estado: 'recibida',
      fecha_recepcion: new Date().toISOString(),
    }).eq('id', id)
    await cargarDatos()
    setConfirmando(false)
  }

  const totalChapa    = danos.reduce((s, d) => s + (Number(d.dias_chapa)    || 0), 0)
  const totalPanos    = danos.reduce((s, d) => s + (Number(d.panos_pintura) || 0), 0)
  const totalMecanica = danos.reduce((s, d) => s + (Number(d.hs_mecanica)   || 0), 0)
  const totalOtros    = danos.reduce((s, d) => s + (Number(d.otros)         || 0), 0)

  function formatNum(n: number) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  function formatFecha(fecha: string) {
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  function exportarExcel() {
  const taller = peritacion.taller
  const wb = XLSX.utils.book_new()

  // ── Hoja única ────────────────────────────────────────────
  const filas: any[][] = []

  // Título
  filas.push(['PERITACIÓN DE SINIESTRO'])
  filas.push([])

  // Datos del taller
  filas.push(['DATOS DEL TALLER', '', '', '', '', ''])
  filas.push(['Taller',       taller?.nombre_fantasia || '—', '', 'Razón social', taller?.razon_social || '—', ''])
  filas.push(['Dirección',    taller?.direccion       || '—', '', 'Teléfono',     taller?.telefono     || '—', ''])
  filas.push(['CUIT',         taller?.cuit            || '—', '', '', '', ''])
  filas.push([])

  // Datos del siniestro
  filas.push(['DATOS DEL SINIESTRO', '', '', '', '', ''])
  filas.push(['Compañía',     peritacion.compania?.nombre    || '—', '', 'Tipo',         peritacion.tipo === 'chapa_pintura' ? 'Chapa y pintura' : peritacion.tipo === 'granizo' ? 'Granizo' : '—', ''])
  filas.push(['Vehículo',     peritacion.vehiculo            || '—', '', 'Patente',      peritacion.patente        || '—', ''])
  filas.push(['Cliente',      peritacion.cliente             || '—', '', 'N° Siniestro', peritacion.nro_siniestro  || '—', ''])
  filas.push(['Fecha envío',  peritacion.fecha_envio     ? new Date(peritacion.fecha_envio).toLocaleDateString('es-AR')     : '—', '', 'Fecha recep.',  peritacion.fecha_recepcion ? new Date(peritacion.fecha_recepcion).toLocaleDateString('es-AR') : '—', ''])
  filas.push([])

  // Tabla de daños — encabezados
  filas.push(['TABLA DE DAÑOS', '', '', '', '', ''])
  const headerRow = filas.length - 1
  filas.push(['Acción', 'Pieza', 'Días chapa', 'Paños pintura', 'Hs mecánica', 'Otros ($)'])
  const dataStartRow = filas.length

  // Filas de daños
  danos.forEach(d => {
    filas.push([
      d.accion.charAt(0).toUpperCase() + d.accion.slice(1),
      d.pieza,
      Number(d.dias_chapa)    || 0,
      Number(d.panos_pintura) || 0,
      Number(d.hs_mecanica)   || 0,
      Number(d.otros)         || 0,
    ])
  })

  filas.push([])

  // Totales
  filas.push(['TOTALES', '', totalChapa, totalPanos, totalMecanica, totalOtros])
  const totalesRow = filas.length - 1

  // Mano de obra
  if (peritacion.mano_obra_total) {
    filas.push([])
    filas.push(['Mano de obra total', '', '', '', '', Number(peritacion.mano_obra_total)])
  }

  // Crear hoja
  const ws = XLSX.utils.aoa_to_sheet(filas)

  // Anchos de columna
  ws['!cols'] = [
    { wch: 20 }, // A
    { wch: 35 }, // B
    { wch: 14 }, // C
    { wch: 16 }, // D
    { wch: 14 }, // E
    { wch: 14 }, // F
  ]

  // Estilos — título
  const tituloCell = ws['A1']
  if (tituloCell) {
    tituloCell.s = {
      font: { bold: true, sz: 14, color: { rgb: '063940' } },
      alignment: { horizontal: 'left' }
    }
  }

  // Estilos — headers de sección
  const sectionRows = [2, 7, 12] // filas 0-indexed donde van DATOS DEL TALLER, SINIESTRO, TABLA
  sectionRows.forEach(r => {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })]
    if (cell) cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '063940' } } }
  })

  // Estilos — encabezados tabla daños
  ;['A','B','C','D','E','F'].forEach(col => {
    const cell = ws[`${col}${dataStartRow}`]
    if (cell) cell.s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '195e63' } },
      alignment: { horizontal: col === 'A' || col === 'B' ? 'left' : 'center' }
    }
  })

  // Estilos — fila totales
  ;['A','B','C','D','E','F'].forEach(col => {
    const cell = ws[`${col}${totalesRow + 1}`]
    if (cell) cell.s = {
      font: { bold: true, color: { rgb: '063940' } },
      fill: { fgColor: { rgb: 'EAF4F4' } }
    }
  })

  XLSX.utils.book_append_sheet(wb, ws, 'Peritación')

  const nombre = `Peritacion_${peritacion.patente || peritacion.id.slice(0, 6)}_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`
  XLSX.writeFile(wb, nombre)
}

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <p style={{ fontSize: 14, color: '#8896A8' }}>Cargando...</p>
    </div>
  )

  if (!peritacion) return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <p style={{ fontSize: 15, color: '#8896A8' }}>Peritación no encontrada.</p>
      <button onClick={() => router.push('/perito/peritaciones')}
        style={{ marginTop: 16, background: '#063940', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, cursor: 'pointer' }}>
        Volver
      </button>
    </div>
  )

  const taller = peritacion.taller

  async function descargarFotos() {
  if (fotos.length === 0) return
  const zip = new JSZip()
  const carpeta = zip.folder(`fotos_${peritacion.patente || peritacion.id.slice(0, 6)}`)!

  await Promise.all(fotos.map(async (foto, i) => {
    const response = await fetch(foto.url)
    const blob     = await response.blob()
    const ext      = foto.url.split('.').pop()?.split('?')[0] || 'jpg'
    carpeta.file(`foto_${i + 1}.${ext}`, blob)
  }))

  const content = await zip.generateAsync({ type: 'blob' })
  const url     = URL.createObjectURL(content)
  const a       = document.createElement('a')
  a.href        = url
  a.download    = `fotos_${peritacion.patente || peritacion.id.slice(0, 6)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/perito/peritaciones')}
            style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#4A5568', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>
            ← Volver
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#0F1623', letterSpacing: -.3 }}>
                {peritacion.vehiculo || 'Vehículo sin definir'}
              </h1>
              {peritacion.patente && (
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#063940', background: '#eaf4f4', padding: '2px 10px', borderRadius: 8 }}>
                  {peritacion.patente}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#8896A8', marginTop: 4 }}>
              {peritacion.compania?.nombre}
              {peritacion.nro_siniestro && ` · Stro: ${peritacion.nro_siniestro}`}
              {peritacion.fecha_envio && ` · Enviada el ${formatFecha(peritacion.fecha_envio)}`}
            </div>
          </div>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={exportarExcel}
            style={{ flex: isMobile ? 1 : undefined, background: 'white', color: '#063940', border: '1.5px solid #063940', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            📊 Excel
          </button>
          
          {peritacion.estado === 'enviada' ? (
            <button onClick={confirmarRecepcion} disabled={confirmando}
              style={{ flex: isMobile ? 1 : undefined, background: '#0DBF7E', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {confirmando ? 'Confirmando...' : '✓ Confirmar recepción'}
            </button>
          ) : (
            <div style={{ background: '#E6FBF3', border: '1px solid #0DBF7E', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#047857' }}>
              ✓ Recibida el {peritacion.fecha_recepcion ? formatFecha(peritacion.fecha_recepcion) : ''}
            </div>
          )}
        </div>
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
            {fotos.length > 0 && (
  <button onClick={descargarFotos}
    style={{ marginTop: 12, width: '100%', background: '#063940', color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
    📸 Descargar fotos
  </button>
)}
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
                      ].map(item => item.value > 0 && (
                        <div key={item.label} style={{ background: '#F7F8FA', borderRadius: 6, padding: '6px 8px' }}>
                          <div style={{ fontSize: 10, color: '#8896A8', marginBottom: 1 }}>{item.label}</div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#063940', fontSize: 13 }}>{formatNum(item.value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {/* Totales mobile */}
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