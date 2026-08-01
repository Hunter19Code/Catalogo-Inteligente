export type ProductoEstado = 'favorito' | 'comprar' | 'comprado' | 'no_comprar'

export type HistorialAccion = 'comprado' | 'usado' | 'terminado' | 'anadido'

export interface Categoria {
  id: string
  parent_id?: string | null
  nombre: string
  icono: string
  color: string
  order_index: number
  created_at?: string
}

export interface Producto {
  id: string
  categoria_id: string
  nombre: string
  marca?: string | null
  descripcion?: string | null
  subtipo?: string | null
  etiquetas?: string[] | null
  alias?: string[] | null
  estado: ProductoEstado
  foto_url?: string | null
  favorito: boolean
  ultima_compra?: string | null
  ultimo_uso?: string | null
  supermercado_habitual?: string | null
  order_index: number
  created_at?: string
  /** Código de barras (futuro) */
  codigo_barras?: string | null
}

export interface HistorialEntry {
  id: string
  producto_id: string
  fecha: string
  supermercado?: string | null
  accion: HistorialAccion
  nota?: string | null
  created_at?: string
}

export type FiltroRapido =
  | 'todos'
  | 'favoritos'
  | 'comprados'
  | 'pendientes'
  | 'alimentacion'
  | 'limpieza'

export interface ProductoInput {
  categoria_id: string
  nombre: string
  marca?: string
  descripcion?: string
  subtipo?: string
  etiquetas?: string[]
  alias?: string[]
  estado: ProductoEstado
  foto_url?: string
  favorito?: boolean
  ultima_compra?: string
  ultimo_uso?: string
  supermercado_habitual?: string
  order_index?: number
  codigo_barras?: string
}

export interface CategoriaInput {
  nombre: string
  icono: string
  color: string
  parent_id?: string | null
  order_index?: number
}

export interface HistorialInput {
  producto_id: string
  fecha?: string
  supermercado?: string | null
  accion: HistorialAccion
  nota?: string | null
}
