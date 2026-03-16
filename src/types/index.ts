export type Rol = 'taller' | 'perito'

export type TipoPeritacion = 'chapa_pintura' | 'granizo'

export type EstadoPeritacion = 'pendiente' | 'enviada' | 'recibida'

export type AccionDano = 'cambiar' | 'reparar' | 'pintar'

export interface Taller {
  id: string
  nombre_fantasia: string
  razon_social: string
  direccion: string
  telefono: string
  cuit?: string
  logo_url?: string
  created_at: string
}

export interface Compania {
  id: string
  nombre: string
  created_at: string
}

export interface Usuario {
  id: string
  rol: Rol
  taller_id?: string
  compania_id?: string
  nombre: string
  email: string
  created_at: string
}

export interface Peritacion {
  id: string
  taller_id: string
  compania_id: string
  perito_id?: string
  tipo?: TipoPeritacion
  vehiculo?: string
  patente?: string
  nro_siniestro?: string
  cliente?: string
  estado: EstadoPeritacion
  mano_obra_total?: number
  fecha_envio?: string
  fecha_recepcion?: string
  created_at: string
  updated_at: string
  // Relaciones
  compania?: Compania
  taller?: Taller
  danos?: Dano[]
  fotos?: Foto[]
}

export interface Dano {
  id: string
  peritacion_id: string
  accion: AccionDano
  pieza: string
  dias_chapa: number
  panos_pintura: number
  hs_mecanica: number
  otros: number
  orden: number
  created_at: string
}

export interface Foto {
  id: string
  peritacion_id: string
  url: string
  nombre?: string
  created_at: string
}

export interface TotalesDanos {
  dias_chapa: number
  panos_pintura: number
  hs_mecanica: number
  otros: number
}