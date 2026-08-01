import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { AddMenu } from '../components/AddMenu'
import { CategoryForm } from '../components/CategoryForm'
import { Fab } from '../components/Fab'
import { ProductCard } from '../components/ProductCard'
import { ProductForm } from '../components/ProductForm'
import { ProductHistory } from '../components/ProductHistory'
import { SearchBar } from '../components/SearchBar'
import { SortableCategoryCard } from '../components/SortableCategoryCard'
import { SortableList } from '../components/SortableList'
import { SortableProductCard } from '../components/SortableProductCard'
import { useFavoritos } from '../hooks/useFavoritos'
import {
  getAncestors,
  getCategoriaIdsInBranch,
  getSubcategorias,
} from '../lib/categories'
import { matchesQuery, sortProductos } from '../lib/search'
import type { CategoriaInput, Producto, ProductoInput } from '../types'

export function CategoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    categorias,
    productos,
    loading,
    countByCategoria,
    addProducto,
    editProducto,
    removeProducto,
    reorderProductosInList,
    addCategoria,
    editCategoria,
    removeCategoria,
    reorderCategoriasInList,
    historialDe,
  } = useFavoritos()

  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [childFormOpen, setChildFormOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)

  const categoria = categorias.find((c) => c.id === id)
  const ancestors = useMemo(
    () => (id ? getAncestors(categorias, id) : []),
    [categorias, id],
  )
  const parent = ancestors.length > 1 ? ancestors[ancestors.length - 2] : null

  const children = useMemo(
    () => (id ? getSubcategorias(categorias, id) : []),
    [categorias, id],
  )

  const lista = useMemo(() => {
    if (!id) return []
    const searching = query.trim().length > 0
    const ids = searching
      ? getCategoriaIdsInBranch(categorias, id)
      : new Set([id])

    return sortProductos(
      productos
        .filter((p) => ids.has(p.categoria_id))
        .filter((p) => matchesQuery(p, query)),
    )
  }, [productos, id, query, categorias])

  const backTo = parent ? `/categoria/${parent.id}` : '/'

  if (!loading && !categoria) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-bold">Categoría no encontrada</p>
        <Link to="/" className="mt-4 inline-block font-semibold text-primary">
          Volver al inicio
        </Link>
      </div>
    )
  }

  async function handleSubmitProducto(input: ProductoInput) {
    if (editing) {
      await editProducto(editing.id, input)
    } else {
      await addProducto(input)
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-28 safe-top">
      <header className="animate-fade-up pt-2 pb-4">
        <div className="mb-4 flex items-center justify-between">
          <Link
            to={backTo}
            className="inline-flex size-11 items-center justify-center rounded-full bg-white shadow-soft ring-1 ring-stone-200/70"
            aria-label="Volver"
          >
            <ArrowLeft className="size-5" />
          </Link>
          {categoria ? (
            <button
              type="button"
              onClick={() => setCategoryFormOpen(true)}
              className="inline-flex size-11 items-center justify-center rounded-full bg-white shadow-soft ring-1 ring-stone-200/70"
              aria-label="Editar"
            >
              <Pencil className="size-5" />
            </button>
          ) : null}
        </div>

        {categoria ? (
          <button
            type="button"
            onClick={() => setCategoryFormOpen(true)}
            className="w-full rounded-[1.5rem] p-5 text-left shadow-soft transition active:scale-[0.99]"
            style={{
              background: `linear-gradient(145deg, ${categoria.color}40 0%, ${categoria.color}70 100%)`,
            }}
          >
            {ancestors.length > 1 ? (
              <p className="mb-1 text-xs font-semibold text-ink-muted">
                {ancestors
                  .slice(0, -1)
                  .map((a) => `${a.icono} ${a.nombre}`)
                  .join(' › ')}
              </p>
            ) : null}
            <span className="text-4xl">{categoria.icono}</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              {categoria.nombre}
            </h1>
            <p className="mt-1 text-sm font-medium text-ink-muted">
              {countByCategoria(categoria.id)}{' '}
              {countByCategoria(categoria.id) === 1 ? 'artículo' : 'artículos'}
              {children.length > 0
                ? ` · ${children.length} subcategorías`
                : ''}
            </p>
          </button>
        ) : (
          <div className="h-28 animate-pulse rounded-[1.5rem] bg-white/60" />
        )}
      </header>

      <div className="mb-4">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={`Buscar en ${categoria?.nombre ?? 'categoría'}…`}
        />
      </div>

      {!query.trim() ? (
        <section className="mb-5">
          {children.length > 0 ? (
            <p className="mb-2 text-xs font-medium text-ink-muted">
              Arrastra ⋮⋮ para reordenar subcategorías
            </p>
          ) : null}
          <SortableList
            ids={children.map((c) => c.id)}
            strategy="grid"
            onReorder={(ids) => void reorderCategoriasInList(ids)}
          >
            <div className="grid grid-cols-2 gap-3">
              {children.map((child, i) => (
                <SortableCategoryCard
                  key={child.id}
                  categoria={child}
                  count={countByCategoria(child.id)}
                  index={i}
                />
              ))}
              <button
                type="button"
                onClick={() => setChildFormOpen(true)}
                className="animate-fade-up flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[1.5rem] border-2 border-dashed border-stone-300 bg-white/50 p-4 text-ink-muted transition active:scale-[0.98]"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-primary">
                  <Plus className="size-5" strokeWidth={2.5} />
                </span>
                <span className="text-sm font-bold">Subcategoría</span>
              </button>
            </div>
          </SortableList>
        </section>
      ) : null}

      <section className="space-y-3">
        {!query.trim() && lista.length > 0 ? (
          <p className="text-xs font-medium text-ink-muted">
            Arrastra ⋮⋮ para reordenar artículos
          </p>
        ) : null}

        {query.trim() ? (
          lista.map((p, i) => (
            <ProductCard
              key={p.id}
              producto={p}
              index={i}
              onClick={() => {
                setEditing(p)
                setFormOpen(true)
              }}
            />
          ))
        ) : (
          <SortableList
            ids={lista.map((p) => p.id)}
            onReorder={(ids) => void reorderProductosInList(ids)}
          >
            <div className="space-y-3">
              {lista.map((p, i) => (
                <SortableProductCard
                  key={p.id}
                  producto={p}
                  index={i}
                  onClick={() => {
                    setEditing(p)
                    setFormOpen(true)
                  }}
                />
              ))}
            </div>
          </SortableList>
        )}

        {!loading && lista.length === 0 && (children.length === 0 || query.trim()) ? (
          <div className="rounded-[1.5rem] bg-white/70 px-6 py-12 text-center shadow-soft">
            <p className="text-lg font-bold">
              {query.trim() ? 'Nada por aquí' : 'Sin artículos aún'}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {query.trim()
                ? 'Prueba con otra palabra'
                : 'Pulsa + para añadir productos o subcategorías'}
            </p>
          </div>
        ) : null}
      </section>

      <Fab label="Añadir" onClick={() => setMenuOpen(true)} />

      <AddMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        categoriaLabel="Subcategoría"
        categoriaHint={`Dentro de ${categoria?.nombre ?? 'esta categoría'}`}
        onAddCategoria={() => {
          setMenuOpen(false)
          setChildFormOpen(true)
        }}
        onAddArticulo={() => {
          setMenuOpen(false)
          setEditing(null)
          setFormOpen(true)
        }}
      />

      <ProductForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        categorias={categorias}
        initial={editing}
        defaultCategoriaId={id}
        onSubmit={handleSubmitProducto}
        onOpenHistory={
          editing
            ? () => {
                setFormOpen(false)
                setHistoryOpen(true)
              }
            : undefined
        }
        onDelete={
          editing
            ? async () => {
                await removeProducto(editing.id)
                setFormOpen(false)
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
        initial={categoria}
        parentId={categoria?.parent_id}
        parentNombre={parent?.nombre}
        onSubmit={async (input: CategoriaInput) => {
          if (!categoria) return
          await editCategoria(categoria.id, input)
        }}
        onDelete={
          categoria
            ? async () => {
                const parentId = categoria.parent_id
                await removeCategoria(categoria.id)
                setCategoryFormOpen(false)
                navigate(parentId ? `/categoria/${parentId}` : '/')
              }
            : undefined
        }
      />

      <CategoryForm
        open={childFormOpen}
        onClose={() => setChildFormOpen(false)}
        parentId={id}
        parentNombre={categoria?.nombre}
        onSubmit={async (input: CategoriaInput) => {
          if (!id) return
          await addCategoria({ ...input, parent_id: id })
        }}
      />
    </div>
  )
}
