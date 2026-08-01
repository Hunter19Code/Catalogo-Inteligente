import type { Categoria, Producto } from '../types'

export function isRootCategoria(c: Categoria) {
  return !c.parent_id
}

function byOrder(a: Categoria, b: Categoria) {
  if (a.order_index !== b.order_index) return a.order_index - b.order_index
  return a.nombre.localeCompare(b.nombre, 'es')
}

export function getChildren(categorias: Categoria[], parentId: string | null) {
  return categorias
    .filter((c) => (parentId ? c.parent_id === parentId : !c.parent_id))
    .sort(byOrder)
}

export function getRootCategorias(categorias: Categoria[]) {
  return getChildren(categorias, null)
}

export function getSubcategorias(categorias: Categoria[], parentId: string) {
  return getChildren(categorias, parentId)
}

/** Todos los descendientes + el nodo, sin límite de profundidad. */
export function getCategoriaIdsInBranch(
  categorias: Categoria[],
  rootId: string,
) {
  const ids = new Set<string>([rootId])
  const byParent = new Map<string | null, Categoria[]>()
  for (const c of categorias) {
    const key = c.parent_id ?? null
    const list = byParent.get(key) ?? []
    list.push(c)
    byParent.set(key, list)
  }

  const stack = [rootId]
  while (stack.length) {
    const current = stack.pop()!
    const children = byParent.get(current) ?? []
    for (const child of children) {
      if (!ids.has(child.id)) {
        ids.add(child.id)
        stack.push(child.id)
      }
    }
  }
  return ids
}

/** Todos los ids a borrar (nodo + descendientes). */
export function collectDescendantIds(categorias: Categoria[], id: string) {
  return getCategoriaIdsInBranch(categorias, id)
}

export function countProductosInBranch(
  productos: Producto[],
  categorias: Categoria[],
  categoriaId: string,
) {
  const ids = getCategoriaIdsInBranch(categorias, categoriaId)
  return productos.filter((p) => ids.has(p.categoria_id)).length
}

export function getAncestors(
  categorias: Categoria[],
  categoriaId: string,
): Categoria[] {
  const byId = new Map(categorias.map((c) => [c.id, c]))
  const chain: Categoria[] = []
  let current = byId.get(categoriaId)
  const guard = new Set<string>()
  while (current) {
    if (guard.has(current.id)) break
    guard.add(current.id)
    chain.unshift(current)
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }
  return chain
}

export function getCategoriaPathLabel(
  categorias: Categoria[],
  categoriaId: string,
) {
  return getAncestors(categorias, categoriaId)
    .map((c) => c.nombre)
    .join(' › ')
}

export function getCategoriaSelectOptions(categorias: Categoria[]) {
  const options: { id: string; label: string; depth: number }[] = []

  function walk(parentId: string | null, depth: number) {
    for (const c of getChildren(categorias, parentId)) {
      const indent = '\u00A0\u00A0'.repeat(depth)
      options.push({
        id: c.id,
        label: `${indent}${c.icono} ${c.nombre}`,
        depth,
      })
      walk(c.id, depth + 1)
    }
  }

  walk(null, 0)
  return options
}

export function nextOrderIndex(
  items: { order_index: number }[],
) {
  if (items.length === 0) return 0
  return Math.max(...items.map((i) => i.order_index)) + 1
}

export function reorderByIds<T extends { id: string; order_index: number }>(
  items: T[],
  orderedIds: string[],
): T[] {
  const byId = new Map(items.map((i) => [i.id, i]))
  return orderedIds
    .map((id, index) => {
      const item = byId.get(id)
      if (!item) return null
      return { ...item, order_index: index }
    })
    .filter(Boolean) as T[]
}
