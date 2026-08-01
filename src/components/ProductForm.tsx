import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getCategoriaSelectOptions } from '../lib/categories'
import { ESTADO_META } from '../lib/search'
import type { Categoria, Producto, ProductoEstado, ProductoInput } from '../types'

interface ProductFormProps {
  open: boolean
  onClose: () => void
  categorias: Categoria[]
  initial?: Producto | null
  defaultCategoriaId?: string
  onSubmit: (input: ProductoInput) => Promise<void>
  onDelete?: () => Promise<void>
  onOpenHistory?: () => void
}

const ESTADOS: ProductoEstado[] = [
  'favorito',
  'comprar',
  'comprado',
  'no_comprar',
]

function parseList(value: string) {
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function ProductForm({
  open,
  onClose,
  categorias,
  initial,
  defaultCategoriaId,
  onSubmit,
  onDelete,
  onOpenHistory,
}: ProductFormProps) {
  const [nombre, setNombre] = useState('')
  const [marca, setMarca] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [subtipo, setSubtipo] = useState('')
  const [etiquetas, setEtiquetas] = useState('')
  const [alias, setAlias] = useState('')
  const [supermercado, setSupermercado] = useState('')
  const [estado, setEstado] = useState<ProductoEstado>('comprar')
  const [categoriaId, setCategoriaId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setNombre(initial?.nombre ?? '')
    setMarca(initial?.marca ?? '')
    setDescripcion(initial?.descripcion ?? '')
    setSubtipo(initial?.subtipo ?? '')
    setEtiquetas((initial?.etiquetas ?? []).join(', '))
    setAlias((initial?.alias ?? []).join(', '))
    setSupermercado(initial?.supermercado_habitual ?? '')
    setEstado(initial?.estado ?? 'comprar')
    setCategoriaId(
      initial?.categoria_id ??
        defaultCategoriaId ??
        categorias[0]?.id ??
        '',
    )
  }, [open, initial, defaultCategoriaId, categorias])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !categoriaId) return
    setSaving(true)
    try {
      await onSubmit({
        nombre: nombre.trim(),
        marca: marca.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        subtipo: subtipo.trim() || undefined,
        etiquetas: parseList(etiquetas),
        alias: parseList(alias),
        supermercado_habitual: supermercado.trim() || undefined,
        estado,
        categoria_id: categoriaId,
        favorito: estado === 'favorito',
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="animate-sheet-up relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-xl font-bold tracking-tight">
            {initial ? 'Editar artículo' : 'Nuevo artículo'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-surface-2"
            aria-label="Cerrar formulario"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6 safe-bottom"
        >
          <Field label="Nombre">
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Fairy Limón"
              className="field-input"
              autoFocus={!initial}
            />
          </Field>

          <Field label="Nombres alternativos (alias)">
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Fairy, lavavajillas fairy…"
              className="field-input"
            />
            <span className="mt-1 block text-xs text-ink-muted">
              Separados por coma. Ayudan a encontrarlo y a leer tickets.
            </span>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca">
              <input
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Opcional"
                className="field-input"
              />
            </Field>
            <Field label="Supermercado">
              <input
                value={supermercado}
                onChange={(e) => setSupermercado(e.target.value)}
                placeholder="Mercadona…"
                className="field-input"
              />
            </Field>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink-muted">
              Categoría
            </span>
            {categorias.length === 0 ? (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Primero crea una categoría.
              </p>
            ) : (
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="field-input"
                required
              >
                {getCategoriaSelectOptions(categorias).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </label>

          <Field label="Estado">
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS.map((e) => {
                const meta = ESTADO_META[e]
                const active = estado === e
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEstado(e)}
                    className={`rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${
                      active
                        ? `${meta.className} ring-2 ring-ink/15`
                        : 'bg-surface-2 text-ink-muted'
                    }`}
                  >
                    {meta.emoji} {meta.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Comentarios">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Notas, olores, tamaño…"
              rows={3}
              className="field-input resize-none"
            />
          </Field>

          <Field label="Etiquetas">
            <input
              value={etiquetas}
              onChange={(e) => setEtiquetas(e.target.value)}
              placeholder="ducha, nevera…"
              className="field-input"
            />
          </Field>

          {initial && onOpenHistory ? (
            <button
              type="button"
              onClick={onOpenHistory}
              className="h-12 rounded-2xl bg-surface-2 text-sm font-semibold text-ink"
            >
              Ver historial de uso
            </button>
          ) : null}

          <button
            type="submit"
            disabled={saving || !nombre.trim()}
            className="mt-2 h-14 rounded-2xl bg-primary text-base font-bold text-white shadow-soft transition active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear artículo'}
          </button>

          {initial && onDelete ? (
            <button
              type="button"
              onClick={() => void onDelete()}
              className="h-12 rounded-2xl text-sm font-semibold text-rose-600"
            >
              Eliminar artículo
            </button>
          ) : null}
        </form>
      </div>

      <style>{`
        .field-input {
          width: 100%;
          height: 3.25rem;
          border-radius: 1rem;
          border: 0;
          background: #efeae3;
          padding: 0 1rem;
          font-size: 1rem;
          outline: none;
        }
        textarea.field-input {
          height: auto;
          padding-top: 0.85rem;
          padding-bottom: 0.85rem;
        }
        select.field-input {
          appearance: none;
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  )
}
