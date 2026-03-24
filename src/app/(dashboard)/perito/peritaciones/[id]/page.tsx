'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ExcelJS from 'exceljs'
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

  async function exportarExcel() {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Peritación')

    ws.columns = [
      { width: 22 }, { width: 36 }, { width: 14 },
      { width: 16 }, { width: 14 }, { width: 14 },
    ]

    const verde      = '063940'
    const verdeMid   = '195e63'
    const verdeClaro = 'EAF4F4'
    const grisClaro  = 'F7F8FA'

    function hStyle(bg: string): Partial<ExcelJS.Style> {
      return {
        font:      { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } },
        alignment: { horizontal: 'left', vertical: 'middle' },
      }
    }
    function lStyle(): Partial<ExcelJS.Style> {
      return { font: { bold: true, color: { argb: 'FF8896A8' }, size: 10 }, alignment: { horizontal: 'left' } }
    }
    function vStyle(mono = false): Partial<ExcelJS.Style> {
      return { font: { size: 10, name: mono ? 'Courier New' : 'Calibri' }, alignment: { horizontal: 'left' } }
    }

    // Título
    const titulo = ws.addRow(['PERITACIÓN DE SINIESTRO'])
    titulo.font = { bold: true, size: 14, color: { argb: `FF${verde}` } }
    ws.addRow([])

    // Datos taller
    const hT = ws.addRow(['DATOS DEL TALLER'])
    hT.eachCell(c => Object.assign(c, { style: hStyle(verde) }))
    ws.mergeCells(`A${hT.number}:F${hT.number}`)
    const taller = peritacion?.taller as any
    ;[
      ['Taller', taller?.nombre_fantasia || '—', 'Razón social', taller?.razon_social || '—'],
      ['Dirección', taller?.direccion || '—', 'Teléfono', taller?.telefono || '—'],
      ['CUIT', taller?.cuit || '—', '', ''],
    ].forEach(([l1,v1,l2,v2]) => {
      const r = ws.addRow([l1,v1,'',l2,v2])
      r.getCell(1).style = lStyle(); r.getCell(2).style = vStyle()
      r.getCell(4).style = lStyle(); r.getCell(5).style = vStyle()
      r.height = 18
    })
    ws.addRow([])

    // Datos siniestro
    const hS = ws.addRow(['DATOS DEL SINIESTRO'])
    hS.eachCell(c => Object.assign(c, { style: hStyle(verde) }))
    ws.mergeCells(`A${hS.number}:F${hS.number}`)
    const tipo = peritacion?.tipo === 'chapa_pintura' ? 'Chapa y pintura' : peritacion?.tipo === 'granizo' ? 'Granizo' : '—'
    ;[
      ['Compañía', (peritacion?.compania as any)?.nombre || '—', 'Tipo', tipo],
      ['Vehículo', peritacion?.vehiculo || '—', 'Patente', peritacion?.patente || '—'],
      ['Cliente', peritacion?.cliente || '—', 'N° Siniestro', peritacion?.nro_siniestro || '—'],
      ['Fecha envío', peritacion?.fecha_envio ? new Date(peritacion.fecha_envio).toLocaleDateString('es-AR') : '—',
       'Fecha recep.', peritacion?.fecha_recepcion ? new Date(peritacion.fecha_recepcion).toLocaleDateString('es-AR') : '—'],
    ].forEach(([l1,v1,l2,v2]) => {
      const r = ws.addRow([l1,v1,'',l2,v2])
      r.getCell(1).style = lStyle(); r.getCell(2).style = vStyle()
      r.getCell(4).style = lStyle(); r.getCell(5).style = vStyle()
      r.height = 18
    })
    ws.addRow([])

    // Tabla daños
    const hD = ws.addRow(['TABLA DE DAÑOS'])
    hD.eachCell(c => Object.assign(c, { style: hStyle(verde) }))
    ws.mergeCells(`A${hD.number}:F${hD.number}`)

    const enc = ws.addRow(['Acción', 'Pieza', 'Días chapa', 'Paños pintura', 'Hs mecánica', 'Otros ($)'])
    enc.eachCell((c, i) => {
      c.style = {
        font:      { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
        fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${verdeMid}` } },
        alignment: { horizontal: i <= 2 ? 'left' : 'center', vertical: 'middle' },
      }
    })
    enc.height = 20

    danos.forEach((d, idx) => {
      const r = ws.addRow([
        d.accion.charAt(0).toUpperCase() + d.accion.slice(1),
        d.pieza,
        Number(d.dias_chapa)    || 0,
        Number(d.panos_pintura) || 0,
        Number(d.hs_mecanica)   || 0,
        Number(d.otros)         || 0,
      ])
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : `FF${grisClaro}`
      r.eachCell((c, i) => {
        c.style = {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } },
          font: { size: 10 },
          alignment: { horizontal: i <= 2 ? 'left' : 'center' },
        }
      })
      r.height = 18
    })

    const tot = ws.addRow(['TOTALES', '', totalChapa, totalPanos, totalMecanica, totalOtros])
    tot.eachCell((c, i) => {
      c.style = {
        font:      { bold: true, size: 10, color: { argb: `FF${verde}` } },
        fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${verdeClaro}` } },
        alignment: { horizontal: i <= 2 ? 'left' : 'center' },
      }
    })
    tot.height = 20

    if (peritacion?.mano_obra_total) {
      ws.addRow([])
      const mo = ws.addRow(['Mano de obra total', '', '', '', '', Number(peritacion.mano_obra_total)])
      mo.getCell(1).style = { font: { bold: true, size: 10, color: { argb: `FF${verde}` } } }
      mo.getCell(6).style = { font: { bold: true, size: 10, color: { argb: `FF${verde}` } }, alignment: { horizontal: 'center' } }
    }

    const buffer = await wb.xlsx.writeBuffer()
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = `Peritacion_${peritacion?.patente || peritacion?.id.slice(0, 6)}_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

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

async function enviarOrden() {
  setConfirmando(true)
  await supabase.from('peritaciones').update({
    estado: 'orden_enviada',
  }).eq('id', id)
  await cargarDatos()
  setConfirmando(false)
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
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: isMobile ? 17 : 22, fontWeight: 700, color: '#0F1623', letterSpacing: -.3 }}>
                {peritacion.vehiculo || 'Vehículo sin definir'}
              </h1>
              {peritacion.patente && (
                <span style={{ fontSize: 13, color: '#063940', background: '#eaf4f4', padding: '2px 10px', borderRadius: 8, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
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

  {peritacion.estado === 'enviada' && (
    <button onClick={confirmarRecepcion} disabled={confirmando}
      style={{ flex: isMobile ? 1 : undefined, background: '#0DBF7E', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
      {confirmando ? 'Confirmando...' : '✓ Confirmar recepción'}
    </button>
  )}

  {peritacion.estado === 'recibida' && (
    <button onClick={enviarOrden} disabled={confirmando}
      style={{ flex: isMobile ? 1 : undefined, background: '#7C3AED', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
      {confirmando ? 'Enviando...' : '📤 Enviar orden'}
    </button>
  )}

  {peritacion.estado === 'orden_enviada' && (
    <div style={{ background: '#EDE9FE', border: '1px solid #7C3AED', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#6D28D9' }}>
      ✓ Orden enviada
    </div>
  )}
</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Datos taller + vehículo */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
          <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: isMobile ? 18 : 24, boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
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
              {taller?.cuit      && <div style={{ fontSize: 13, color: '#4A5568', fontVariantNumeric: 'tabular-nums' }}>CUIT: {taller.cuit}</div>}
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: isMobile ? 18 : 24, boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
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
                  <span style={{ fontSize: 13, color: '#0F1623', fontVariantNumeric: item.mono ? 'tabular-nums' : undefined, fontWeight: item.mono ? 600 : 500 }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fotos */}
        {fotos.length > 0 && (
          <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: isMobile ? 18 : 24, boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
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
            <button onClick={descargarFotos}
              style={{ marginTop: 12, width: '100%', background: '#063940', color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              📸 Descargar fotos
            </button>
          </div>
        )}

        {/* Daños */}
        {danos.length > 0 && (
          <div style={{ background: 'white', border: '1px solid #E2E6EC', borderRadius: 18, padding: isMobile ? 18 : 24, boxShadow: '0 2px 8px rgba(15,22,35,.06)' }}>
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
                          <div style={{ fontWeight: 700, color: '#063940', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{formatNum(item.value)}</div>
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
                        <div style={{ fontWeight: 700, color: '#063940', fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{formatNum(t.value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E6EC', background: '#F7F8FA' }}>
                      {['Acción', 'Pieza', 'Días chapa', 'Paños pintura', 'Hs mecánica', 'Otros ($)'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: .5, whiteSpace: 'nowrap' }}>{h}</th>
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
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4A5568', fontVariantNumeric: 'tabular-nums' }}>{formatNum(d.dias_chapa)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4A5568', fontVariantNumeric: 'tabular-nums' }}>{formatNum(d.panos_pintura)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4A5568', fontVariantNumeric: 'tabular-nums' }}>{formatNum(d.hs_mecanica)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4A5568', fontVariantNumeric: 'tabular-nums' }}>{formatNum(d.otros)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #E2E6EC', background: '#F7F8FA' }}>
                      <td colSpan={2} style={{ padding: '10px 12px', fontWeight: 700, fontSize: 12, color: '#0F1623' }}>TOTALES</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#063940', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNum(totalChapa)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#063940', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNum(totalPanos)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#063940', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNum(totalMecanica)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#063940', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNum(totalOtros)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {peritacion.mano_obra_total && (
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#eaf4f4', borderRadius: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#4A5568' }}>Mano de obra total:</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#063940', fontVariantNumeric: 'tabular-nums' }}>
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