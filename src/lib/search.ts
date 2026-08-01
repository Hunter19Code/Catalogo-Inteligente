import type { Categoria, FiltroRapido, Producto, ProductoEstado } from '../types'

const ALIMENTACION = new Set(['comida', 'bocatas'])
const LIMPIEZA = new Set(['jabones', 'hogar', 'limpieza'])

export const ESTADO_META: Record<
  ProductoEstado,
  { label: string; emoji: string; className: string }
> = {
  favorito: {
    label: 'Favorito',
    emoji: '⭐',
    className: 'bg-amber-100 text-amber-900',
  },
  comprar: {
    label: 'Comprar',
    emoji: '🛒',
    className: 'bg-sky-100 text-sky-900',
  },
  comprado: {
    label: 'Comprado',
    emoji: '✅',
    className: 'bg-emerald-100 text-emerald-900',
  },
  no_comprar: {
    label: 'No comprar más',
    emoji: '❌',
    className: 'bg-rose-100 text-rose-900',
  },
}

export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function matchesQuery(producto: Producto, query: string) {
  const q = normalize(query.trim())
  if (!q) return true
  const haystack = normalize(
    [
      producto.nombre,
      producto.marca ?? '',
      producto.descripcion ?? '',
      producto.subtipo ?? '',
      ...(producto.etiquetas ?? []),
      ...(producto.alias ?? []),
    ].join(' '),
  )
  return q.split(/\s+/).every((token) => haystack.includes(token))
}

function ancestorNames(
  cat: Categoria | undefined,
  catById: Map<string, Categoria>,
) {
  const names: string[] = []
  let current = cat
  const guard = new Set<string>()
  while (current) {
    if (guard.has(current.id)) break
    guard.add(current.id)
    names.push(normalize(current.nombre))
    current = current.parent_id
      ? catById.get(current.parent_id)
      : undefined
  }
  return names
}

export function applyFiltro(
  productos: Producto[],
  categorias: Categoria[],
  filtro: FiltroRapido,
) {
  const catById = new Map(categorias.map((c) => [c.id, c]))

  return productos.filter((p) => {
    const cat = catById.get(p.categoria_id)
    const names = ancestorNames(cat, catById)

    switch (filtro) {
      case 'favoritos':
        return p.favorito || p.estado === 'favorito'
      case 'comprados':
        return p.estado === 'comprado'
      case 'pendientes':
        return p.estado === 'comprar'
      case 'alimentacion':
        return names.some((n) => ALIMENTACION.has(n))
      case 'limpieza':
        return names.some((n) => LIMPIEZA.has(n))
      default:
        return true
    }
  })
}

export function filterProductos(
  productos: Producto[],
  categorias: Categoria[],
  query: string,
  filtro: FiltroRapido,
) {
  return applyFiltro(productos, categorias, filtro).filter((p) =>
    matchesQuery(p, query),
  )
}

export function sortProductos(productos: Producto[]) {
  return [...productos].sort((a, b) => {
    if (a.order_index !== b.order_index) return a.order_index - b.order_index
    return a.nombre.localeCompare(b.nombre, 'es')
  })
}
