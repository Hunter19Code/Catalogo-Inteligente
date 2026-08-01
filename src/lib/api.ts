import { SEED_CATEGORIAS, SEED_HISTORIAL, SEED_PRODUCTOS } from '../data/seed'
import {
  collectDescendantIds,
  getChildren,
  nextOrderIndex,
} from './categories'
import { todayISO } from './dates'
import { supabase, isSupabaseConfigured } from './supabase'
import type {
  Categoria,
  CategoriaInput,
  HistorialEntry,
  HistorialInput,
  Producto,
  ProductoInput,
} from '../types'

const KEY_CATS = 'favoritos_categorias_v2'
const KEY_PRODS = 'favoritos_productos_v2'
const KEY_HIST = 'favoritos_historial_v2'
const KEY_LEGACY_CATS = 'favoritos_categorias'
const KEY_LEGACY_PRODS = 'favoritos_productos'

function uid() {
  return crypto.randomUUID()
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function normalizeCategoria(c: Categoria, index = 0): Categoria {
  return {
    ...c,
    parent_id: c.parent_id ?? null,
    order_index: c.order_index ?? index,
  }
}

function normalizeProducto(p: Producto, index = 0): Producto {
  return {
    ...p,
    alias: p.alias ?? [],
    etiquetas: p.etiquetas ?? [],
    order_index: p.order_index ?? index,
    favorito: p.favorito ?? p.estado === 'favorito',
  }
}

function migrateLegacyIfNeeded() {
  if (localStorage.getItem(KEY_CATS)) return

  const legacyCats = localStorage.getItem(KEY_LEGACY_CATS)
  const legacyProds = localStorage.getItem(KEY_LEGACY_PRODS)

  if (legacyCats) {
    const cats = (JSON.parse(legacyCats) as Categoria[]).map(normalizeCategoria)
    writeLocal(KEY_CATS, cats)
  } else {
    writeLocal(KEY_CATS, SEED_CATEGORIAS)
  }

  if (legacyProds) {
    const prods = (JSON.parse(legacyProds) as Producto[]).map(normalizeProducto)
    writeLocal(KEY_PRODS, prods)
  } else {
    writeLocal(KEY_PRODS, SEED_PRODUCTOS)
  }

  if (!localStorage.getItem(KEY_HIST)) {
    writeLocal(KEY_HIST, SEED_HISTORIAL)
  }
}

function ensureLocalSeed() {
  migrateLegacyIfNeeded()
  if (!localStorage.getItem(KEY_CATS)) writeLocal(KEY_CATS, SEED_CATEGORIAS)
  if (!localStorage.getItem(KEY_PRODS)) writeLocal(KEY_PRODS, SEED_PRODUCTOS)
  if (!localStorage.getItem(KEY_HIST)) writeLocal(KEY_HIST, SEED_HISTORIAL)
}

export async function getCategorias(): Promise<Categoria[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('order_index')
      .order('nombre')
    if (error) throw error
    return (data ?? []).map(normalizeCategoria)
  }
  ensureLocalSeed()
  return readLocal(KEY_CATS, SEED_CATEGORIAS).map(normalizeCategoria)
}

export async function getProductos(): Promise<Producto[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('order_index')
      .order('nombre')
    if (error) throw error
    return (data ?? []).map(normalizeProducto)
  }
  ensureLocalSeed()
  return readLocal(KEY_PRODS, SEED_PRODUCTOS).map(normalizeProducto)
}

export async function getHistorial(
  productoId?: string,
): Promise<HistorialEntry[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('historial')
      .select('*')
      .order('fecha', { ascending: false })
    if (productoId) query = query.eq('producto_id', productoId)
    const { data, error } = await query
    if (error) throw error
    return data ?? []
  }
  ensureLocalSeed()
  const all = readLocal<HistorialEntry[]>(KEY_HIST, SEED_HISTORIAL)
  const filtered = productoId
    ? all.filter((h) => h.producto_id === productoId)
    : all
  return filtered.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export async function createCategoria(
  input: CategoriaInput,
): Promise<Categoria> {
  const siblings = getChildren(await getCategorias(), input.parent_id ?? null)
  const payload = {
    ...input,
    parent_id: input.parent_id ?? null,
    order_index: input.order_index ?? nextOrderIndex(siblings),
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('categorias')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return normalizeCategoria(data)
  }

  const categorias = await getCategorias()
  const nueva: Categoria = {
    id: uid(),
    ...payload,
    created_at: new Date().toISOString(),
  }
  writeLocal(KEY_CATS, [...categorias, nueva])
  return nueva
}

export async function updateCategoria(
  id: string,
  patch: Partial<CategoriaInput>,
): Promise<Categoria> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('categorias')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return normalizeCategoria(data)
  }

  const categorias = await getCategorias()
  const next = categorias.map((c) => (c.id === id ? { ...c, ...patch } : c))
  writeLocal(KEY_CATS, next)
  const updated = next.find((c) => c.id === id)
  if (!updated) throw new Error('Categoría no encontrada')
  return updated
}

export async function reorderCategorias(
  orderedIds: string[],
): Promise<Categoria[]> {
  const categorias = await getCategorias()
  const next = categorias.map((c) => {
    const index = orderedIds.indexOf(c.id)
    return index >= 0 ? { ...c, order_index: index } : c
  })

  if (isSupabaseConfigured && supabase) {
    await Promise.all(
      orderedIds.map((id, order_index) =>
        supabase!.from('categorias').update({ order_index }).eq('id', id),
      ),
    )
    return getCategorias()
  }

  writeLocal(KEY_CATS, next)
  return next.map(normalizeCategoria)
}

export async function deleteCategoria(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) throw error
    return
  }

  const categorias = await getCategorias()
  const toDelete = collectDescendantIds(categorias, id)
  writeLocal(
    KEY_CATS,
    categorias.filter((c) => !toDelete.has(c.id)),
  )
  const productos = await getProductos()
  const removedProductIds = new Set(
    productos.filter((p) => toDelete.has(p.categoria_id)).map((p) => p.id),
  )
  writeLocal(
    KEY_PRODS,
    productos.filter((p) => !toDelete.has(p.categoria_id)),
  )
  const historial = await getHistorial()
  writeLocal(
    KEY_HIST,
    historial.filter((h) => !removedProductIds.has(h.producto_id)),
  )
}

export async function createHistorial(
  input: HistorialInput,
): Promise<HistorialEntry> {
  const payload = {
    producto_id: input.producto_id,
    fecha: input.fecha ?? todayISO(),
    supermercado: input.supermercado ?? null,
    accion: input.accion,
    nota: input.nota ?? null,
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('historial')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const entry: HistorialEntry = {
    id: uid(),
    ...payload,
    created_at: new Date().toISOString(),
  }
  const all = await getHistorial()
  writeLocal(KEY_HIST, [entry, ...all])
  return entry
}

export async function createProducto(input: ProductoInput): Promise<Producto> {
  const siblings = (await getProductos()).filter(
    (p) => p.categoria_id === input.categoria_id,
  )
  const payload = {
    ...input,
    alias: input.alias ?? [],
    etiquetas: input.etiquetas ?? [],
    favorito: input.favorito ?? input.estado === 'favorito',
    order_index: input.order_index ?? nextOrderIndex(siblings),
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('productos')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return normalizeProducto(data)
  }

  const productos = await getProductos()
  const nuevo: Producto = {
    id: uid(),
    ...payload,
    created_at: new Date().toISOString(),
  }
  writeLocal(KEY_PRODS, [nuevo, ...productos])
  return nuevo
}

export async function updateProducto(
  id: string,
  patch: Partial<ProductoInput>,
  options?: { recordHistorial?: boolean; supermercado?: string },
): Promise<Producto> {
  const current = (await getProductos()).find((p) => p.id === id)
  if (!current) throw new Error('Producto no encontrado')

  const becameComprado =
    patch.estado === 'comprado' && current.estado !== 'comprado'
  const today = todayISO()

  const enriched: Partial<ProductoInput> = { ...patch }
  if (becameComprado || options?.recordHistorial) {
    enriched.ultima_compra = patch.ultima_compra ?? today
    enriched.ultimo_uso = patch.ultimo_uso ?? today
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('productos')
      .update({
        ...enriched,
        favorito:
          enriched.favorito ??
          (enriched.estado ? enriched.estado === 'favorito' : undefined),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    if (becameComprado || options?.recordHistorial) {
      await createHistorial({
        producto_id: id,
        fecha: enriched.ultima_compra ?? today,
        supermercado:
          options?.supermercado ?? current.supermercado_habitual ?? null,
        accion: becameComprado ? 'comprado' : 'usado',
      })
    }
    return normalizeProducto(data)
  }

  const productos = await getProductos()
  const next = productos.map((p) =>
    p.id === id
      ? {
          ...p,
          ...enriched,
          favorito:
            enriched.favorito ??
            (enriched.estado ? enriched.estado === 'favorito' : p.favorito),
        }
      : p,
  )
  writeLocal(KEY_PRODS, next)

  if (becameComprado || options?.recordHistorial) {
    await createHistorial({
      producto_id: id,
      fecha: enriched.ultima_compra ?? today,
      supermercado:
        options?.supermercado ?? current.supermercado_habitual ?? null,
      accion: becameComprado ? 'comprado' : 'usado',
    })
  }

  const updated = next.find((p) => p.id === id)
  if (!updated) throw new Error('Producto no encontrado')
  return updated
}

export async function reorderProductos(
  orderedIds: string[],
): Promise<Producto[]> {
  const productos = await getProductos()
  const next = productos.map((p) => {
    const index = orderedIds.indexOf(p.id)
    return index >= 0 ? { ...p, order_index: index } : p
  })

  if (isSupabaseConfigured && supabase) {
    await Promise.all(
      orderedIds.map((id, order_index) =>
        supabase!.from('productos').update({ order_index }).eq('id', id),
      ),
    )
    return getProductos()
  }

  writeLocal(KEY_PRODS, next)
  return next.map(normalizeProducto)
}

export async function deleteProducto(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (error) throw error
    return
  }
  const productos = await getProductos()
  writeLocal(
    KEY_PRODS,
    productos.filter((p) => p.id !== id),
  )
  const historial = await getHistorial()
  writeLocal(
    KEY_HIST,
    historial.filter((h) => h.producto_id !== id),
  )
}
