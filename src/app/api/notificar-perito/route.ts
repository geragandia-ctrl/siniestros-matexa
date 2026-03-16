import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { emailPerito, nombrePerito, nombreTaller, vehiculo, patente, nroSiniestro, compania, linkPeritacion } = await req.json()

  const { error } = await resend.emails.send({
    from:    'Matexa Siniestros <notificaciones@matexa.app>',
    to:      emailPerito,
    subject: `Nueva peritación: ${vehiculo || 'Vehículo'} ${patente ? `· ${patente}` : ''}`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #F7F8FA; padding: 32px 20px;">
        
        <div style="background: #0F1623; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <div style="font-size: 22px; font-weight: 800; color: white; letter-spacing: -0.5px;">Matexa</div>
          <div style="font-size: 12px; color: rgba(255,255,255,.4); margin-top: 2px;">siniestros</div>
        </div>

        <div style="background: white; border-radius: 16px; padding: 28px; border: 1px solid #E2E6EC; margin-bottom: 16px;">
          <h2 style="font-size: 20px; font-weight: 700; color: #0F1623; margin: 0 0 6px 0;">
            Nueva peritación asignada
          </h2>
          <p style="font-size: 14px; color: #8896A8; margin: 0 0 24px 0;">
            Hola ${nombrePerito}, el taller <strong style="color: #0F1623;">${nombreTaller}</strong> te envió una nueva peritación.
          </p>

          <div style="background: #F7F8FA; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              ${vehiculo ? `<tr><td style="color: #8896A8; padding: 5px 0; width: 120px;">Vehículo</td><td style="color: #0F1623; font-weight: 600;">${vehiculo}</td></tr>` : ''}
              ${patente ? `<tr><td style="color: #8896A8; padding: 5px 0;">Patente</td><td style="color: #063940; font-weight: 700; font-family: monospace;">${patente}</td></tr>` : ''}
              ${compania ? `<tr><td style="color: #8896A8; padding: 5px 0;">Compañía</td><td style="color: #0F1623; font-weight: 600;">${compania}</td></tr>` : ''}
              ${nroSiniestro ? `<tr><td style="color: #8896A8; padding: 5px 0;">N° Siniestro</td><td style="color: #0F1623; font-family: monospace;">${nroSiniestro}</td></tr>` : ''}
            </table>
          </div>

          <a href="${linkPeritacion}" 
            style="display: block; background: #063940; color: white; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 12px; font-size: 15px; font-weight: 700;">
            Ver peritación completa →
          </a>
        </div>

        <p style="text-align: center; font-size: 12px; color: #C8D0DC; margin: 0;">
          Matexa Siniestros · siniestros.matexa.app
        </p>
      </div>
    `
  })

  if (error) return NextResponse.json({ error }, { status: 400 })
  return NextResponse.json({ ok: true })
}