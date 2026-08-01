import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { AddMenu } from '../components/AddMenu'
import { CategoryForm } from '../components/CategoryForm'
import { Fab } from '../components/Fab'
import { FilterChips } from '../components/FilterChips'
import { InstallBanner } from '../components/InstallBanner'
import { ProductCard } from '../components/ProductCard'
import { ProductForm } from '../components/ProductForm'
import { ProductHistory } from '../components/ProductHistory'
import { SearchBar } from '../components/SearchBar'
import { SortableCategoryCard } from '../components/SortableCategoryCard'
import { SortableList } from '../components/SortableList'
import { useFavoritos } from '../hooks/useFavoritos'
import { getRootCategorias } from '../lib/categories'
import { filterProductos } from '../lib/search'
import type {
  CategoriaInput,
  FiltroRapido,
  Producto,
  ProductoInput,
} from '../types'

export function HomePage() {
  const {
    categorias,
    productos,
    loading,
    error,
    countByCategoria,
    addProducto,
    editProducto,
    removeProducto,
    addCategoria,
    reorderCategoriasInList,
    historialDe,
  } = useFavoritos()

  const [query, setQuery] = useState('')
  const [filtro, setFiltro] = useState<FiltroRapido>('todos')
  const [menuOpen, setMenuOpen] = useState(false)
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)

  const searching = query.trim().length > 0 || filtro !== 'todos'

  const departamentos = useMemo(
    () => getRootCategorias(categorias),
    [categorias],
  )

  const resultados = useMemo(
    () => filterProductos(productos, categorias, query, filtro),
    [productos, categorias, query, filtro],
  )

  const catMap = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias],
  )

  async function handleSubmitProducto(input: ProductoInput) {
    if (editing) {
      await editProducto(editing.id, input)
    } else {
      await addProducto(input)
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-28 safe-top">
      <header className="animate-fade-up pt-2 pb-5">
        <p className="text-sm font-semibold tracking-wide text-primary">
          Siempre a mano
        </p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
          Favoritos
        </h1>
        <p className="mt-1 text-base text-ink-muted">
          Encuentra cualquier producto en segundos
        </p>
      </header>

      <InstallBanner />

      <div className="sticky top-0 z-20 -mx-4 space-y-3 bg-gradient-to-b from-surface via-surface to-transparent px-4 pt-1 pb-4">
        <SearchBar value={query} onChange={setQuery} />
        <FilterChips value={filtro} onChange={setFiltro} />
      </div>

      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="py-12 text-center text-ink-muted">Cargando…</p>
      ) : searching ? (
        <section className="space-y-3">
          <p className="text-sm font-medium text-ink-muted">
            {resultados.length}{' '}
            {resultados.length === 1 ? 'resultado' : 'resultados'}
          </p>
          {resultados.length === 0 ? (
            <EmptyState
              title="Nada por aquí"
              subtitle="Prueba con otra palabra o quita el filtro"
            />
          ) : (
            resultados.map((p, i) => (
              <ProductCard
                key={p.id}
                producto={p}
                index={i}
                categoriaNombre={catMap.get(p.categoria_id)?.nombre}
                onClick={() => {
                  setEditing(p)
                  setProductFormOpen(true)
                }}
              />
            ))
          )}
        </section>
      ) : (
        <>
          <p className="mb-2 text-xs font-medium text-ink-muted">
            Mantén pulsado el icono ⋮⋮ para reordenar
          </p>
          <SortableList
            ids={departamentos.map((c) => c.id)}
            strategy="grid"
            onReorder={(ids) => void reorderCategoriasInList(ids)}
          >
            <section className="grid grid-cols-2 gap-3">
              {departamentos.map((cat, i) => (
                <SortableCategoryCard
                  key={cat.id}
                  categoria={cat}
                  count={countByCategoria(cat.id)}
                  index={i}
                />
              ))}
              <button
                type="button"
                onClick={() => setCategoryFormOpen(true)}
                className="animate-fade-up flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[1.5rem] border-2 border-dashed border-stone-300 bg-white/50 p-5 text-ink-muted transition active:scale-[0.98]"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-primary">
                  <Plus className="size-6" strokeWidth={2.5} />
                </span>
                <span className="text-sm font-bold">Nueva categoría</span>
              </button>
            </section>
          </SortableList>
        </>
      )}

      <Fab label="Añadir" onClick={() => setMenuOpen(true)} />

      <AddMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        canAddArticulo={departamentos.length > 0}
        onAddCategoria={() => {
          setMenuOpen(false)
          setCategoryFormOpen(true)
        }}
        onAddArticulo={() => {
          setMenuOpen(false)
          setEditing(null)
          setProductFormOpen(true)
        }}
      />

      <ProductForm
        open={productFormOpen}
        onClose={() => {
          setProductFormOpen(false)
          setEditing(null)
        }}
        categorias={categorias}
        initial={editing}
        onSubmit={handleSubmitProducto}
        onOpenHistory={
          editing
            ? () => {
                setProductFormOpen(false)
                setHistoryOpen(true)
              }
            : undefined
        }
        onDelete={
          editing
            ? async () => {
                await removeProducto(editing.id)
                setProductFormOpen(false)
                setEditing(null)
              }
            : undefined
        }
      />

      <ProductHistory
        open={historyOpen}
        onClose={() => {
          setHistoryOpen(false)
          setEditing(null)
        }}
        producto={editing}
        entries={editing ? historialDe(editing.id) : []}
      />

      <CategoryForm
        open={categoryFormOpen}
        onClose={() => setCategoryFormOpen(false)}
        onSubmit={async (input: CategoriaInput) => {
          await addCategoria(input)
        }}
      />
    </div>
  )
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/70 px-6 py-12 text-center shadow-soft ring-1 ring-stone-200/60">
      <p className="text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
    </div>
  )
}
