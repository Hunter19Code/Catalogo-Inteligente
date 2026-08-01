import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createCategoria,
  createProducto,
  deleteCategoria,
  deleteProducto,
  getCategorias,
  getHistorial,
  getProductos,
  reorderCategorias,
  reorderProductos,
  updateCategoria,
  updateProducto,
} from '../lib/api'
import { collectDescendantIds, countProductosInBranch } from '../lib/categories'
import type {
  Categoria,
  CategoriaInput,
  HistorialEntry,
  Producto,
  ProductoInput,
} from '../types'

interface FavoritosContextValue {
  categorias: Categoria[]
  productos: Producto[]
  historial: HistorialEntry[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addProducto: (input: ProductoInput) => Promise<Producto>
  editProducto: (
    id: string,
    patch: Partial<ProductoInput>,
    options?: { recordHistorial?: boolean; supermercado?: string },
  ) => Promise<Producto>
  removeProducto: (id: string) => Promise<void>
  reorderProductosInList: (orderedIds: string[]) => Promise<void>
  addCategoria: (input: CategoriaInput) => Promise<Categoria>
  editCategoria: (
    id: string,
    patch: Partial<CategoriaInput>,
  ) => Promise<Categoria>
  removeCategoria: (id: string) => Promise<void>
  reorderCategoriasInList: (orderedIds: string[]) => Promise<void>
  countByCategoria: (categoriaId: string) => number
  historialDe: (productoId: string) => HistorialEntry[]
}

const FavoritosContext = createContext<FavoritosContextValue | null>(null)

export function FavoritosProvider({ children }: { children: ReactNode }) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [historial, setHistorial] = useState<HistorialEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cats, prods, hist] = await Promise.all([
        getCategorias(),
        getProductos(),
        getHistorial(),
      ])
      setCategorias(cats)
      setProductos(prods)
      setHistorial(hist)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addProducto = useCallback(async (input: ProductoInput) => {
    const created = await createProducto(input)
    setProductos((prev) => [created, ...prev])
    return created
  }, [])

  const editProducto = useCallback(
    async (
      id: string,
      patch: Partial<ProductoInput>,
      options?: { recordHistorial?: boolean; supermercado?: string },
    ) => {
      const updated = await updateProducto(id, patch, options)
      setProductos((prev) => prev.map((p) => (p.id === id ? updated : p)))
      if (options?.recordHistorial || patch.estado === 'comprado') {
        const hist = await getHistorial()
        setHistorial(hist)
      }
      return updated
    },
    [],
  )

  const removeProducto = useCallback(async (id: string) => {
    await deleteProducto(id)
    setProductos((prev) => prev.filter((p) => p.id !== id))
    setHistorial((prev) => prev.filter((h) => h.producto_id !== id))
  }, [])

  const reorderProductosInList = useCallback(async (orderedIds: string[]) => {
    const next = await reorderProductos(orderedIds)
    setProductos(next)
  }, [])

  const addCategoria = useCallback(async (input: CategoriaInput) => {
    const created = await createCategoria(input)
    setCategorias((prev) => [...prev, created])
    return created
  }, [])

  const editCategoria = useCallback(
    async (id: string, patch: Partial<CategoriaInput>) => {
      const updated = await updateCategoria(id, patch)
      setCategorias((prev) => prev.map((c) => (c.id === id ? updated : c)))
      return updated
    },
    [],
  )

  const removeCategoria = useCallback(async (id: string) => {
    const cats = await getCategorias()
    const toDelete = collectDescendantIds(cats, id)
    await deleteCategoria(id)
    setCategorias((prev) => prev.filter((c) => !toDelete.has(c.id)))
    setProductos((prev) => {
      const removed = new Set(
        prev.filter((p) => toDelete.has(p.categoria_id)).map((p) => p.id),
      )
      setHistorial((h) => h.filter((entry) => !removed.has(entry.producto_id)))
      return prev.filter((p) => !toDelete.has(p.categoria_id))
    })
  }, [])

  const reorderCategoriasInList = useCallback(async (orderedIds: string[]) => {
    const next = await reorderCategorias(orderedIds)
    setCategorias(next)
  }, [])

  const countByCategoria = useCallback(
    (categoriaId: string) =>
      countProductosInBranch(productos, categorias, categoriaId),
    [productos, categorias],
  )

  const historialDe = useCallback(
    (productoId: string) =>
      historial
        .filter((h) => h.producto_id === productoId)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [historial],
  )

  const value = useMemo(
    () => ({
      categorias,
      productos,
      historial,
      loading,
      error,
      refresh,
      addProducto,
      editProducto,
      removeProducto,
      reorderProductosInList,
      addCategoria,
      editCategoria,
      removeCategoria,
      reorderCategoriasInList,
      countByCategoria,
      historialDe,
    }),
    [
      categorias,
      productos,
      historial,
      loading,
      error,
      refresh,
      addProducto,
      editProducto,
      removeProducto,
      reorderProductosInList,
      addCategoria,
      editCategoria,
      removeCategoria,
      reorderCategoriasInList,
      countByCategoria,
      historialDe,
    ],
  )

  return (
    <FavoritosContext.Provider value={value}>
      {children}
    </FavoritosContext.Provider>
  )
}

export function useFavoritos() {
  const ctx = useContext(FavoritosContext)
  if (!ctx) throw new Error('useFavoritos debe usarse dentro de FavoritosProvider')
  return ctx
}
