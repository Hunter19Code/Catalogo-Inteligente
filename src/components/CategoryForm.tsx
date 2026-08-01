import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Categoria, CategoriaInput } from '../types'

const ICONOS = [
  '🍝',
  '🧴',
  '🏠',
  '🥪',
  '👧',
  '📦',
  '🛒',
  '🧼',
  '🐾',
  '💊',
  '👕',
  '🧸',
  '🧃',
  '🧊',
  '🍬',
  '☕',
  '🥐',
  '🧀',
  '🥩',
  '🥗',
  '🍌',
  '🧽',
  '🧹',
  '🛏️',
  '💄',
  '🧻',
  '🔋',
  '🎁',
]

const COLORES = [
  '#F4A261',
  '#7EB8C9',
  '#A8C686',
  '#E9C46A',
  '#E76F51',
  '#9B8EC4',
  '#5C9EAD',
  '#D4A373',
  '#84A59D',
  '#F28482',
  '#6D8B74',
  '#C9A227',
]

interface CategoryFormProps {
  open: boolean
  onClose: () => void
  initial?: Categoria | null
  parentId?: string | null
  parentNombre?: string
  onSubmit: (input: CategoriaInput) => Promise<void>
  onDelete?: () => Promise<void>
}

export function CategoryForm({
  open,
  onClose,
  initial,
  parentId = null,
  parentNombre,
  onSubmit,
  onDelete,
}: CategoryFormProps) {
  const [nombre, setNombre] = useState('')
  const [icono, setIcono] = useState('📦')
  const [color, setColor] = useState(COLORES[0])
  const [saving, setSaving] = useState(false)

  const isChild =
    Boolean(parentId) || Boolean(initial?.parent_id) || Boolean(parentNombre)
  const title = initial
    ? 'Editar categoría'
    : isChild
      ? 'Nueva subcategoría'
      : 'Nueva categoría'

  useEffect(() => {
    if (!open) return
    setNombre(initial?.nombre ?? '')
    setIcono(initial?.icono ?? '📦')
    setColor(initial?.color ?? COLORES[0])
  }, [open, initial])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setSaving(true)
    try {
      await onSubmit({
        nombre: nombre.trim(),
        icono,
        color,
        parent_id: initial?.parent_id ?? parentId ?? null,
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
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
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
          {parentNombre ? (
            <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm font-medium text-ink-muted">
              Dentro de <span className="font-bold text-ink">{parentNombre}</span>
            </p>
          ) : null}

          <div
            className="rounded-[1.35rem] p-5 text-center shadow-soft"
            style={{
              background: `linear-gradient(145deg, ${color}40 0%, ${color}70 100%)`,
            }}
          >
            <span className="text-5xl">{icono}</span>
            <p className="mt-2 text-xl font-bold">
              {nombre.trim() ||
                (isChild ? 'Nombre de la subcategoría' : 'Nombre de la categoría')}
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink-muted">
              Nombre
            </span>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={
                isChild
                  ? 'Ej. Lácteos, Fruta, Congelados…'
                  : 'Ej. Hogar, Comida, Mascotas…'
              }
              className="field-input"
              autoFocus={!initial}
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-ink-muted">
              Icono
            </span>
            <div className="grid grid-cols-7 gap-2">
              {ICONOS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcono(emoji)}
                  className={`flex size-11 items-center justify-center rounded-2xl text-xl transition active:scale-95 ${
                    icono === emoji
                      ? 'bg-primary/15 ring-2 ring-primary'
                      : 'bg-surface-2'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-ink-muted">
              Color
            </span>
            <div className="flex flex-wrap gap-2.5">
              {COLORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  className={`size-10 rounded-full transition active:scale-95 ${
                    color === c ? 'ring-2 ring-ink ring-offset-2' : ''
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !nombre.trim()}
            className="mt-2 h-14 rounded-2xl bg-primary text-base font-bold text-white shadow-soft transition active:scale-[0.98] disabled:opacity-50"
          >
            {saving
              ? 'Guardando…'
              : initial
                ? 'Guardar cambios'
                : isChild
                  ? 'Crear subcategoría'
                  : 'Crear categoría'}
          </button>

          {initial && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    '¿Eliminar esta categoría, todo lo que contiene y sus artículos?',
                  )
                ) {
                  void onDelete()
                }
              }}
              className="h-12 rounded-2xl text-sm font-semibold text-rose-600"
            >
              Eliminar categoría
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
      `}</style>
    </div>
  )
}
