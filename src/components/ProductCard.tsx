import { ESTADO_META } from '../lib/search'
import { formatRelativeOrShort } from '../lib/dates'
import type { Producto } from '../types'

interface ProductCardProps {
  producto: Producto
  categoriaNombre?: string
  onClick?: () => void
  index?: number
  dragHandle?: React.ReactNode
}

export function ProductCard({
  producto,
  categoriaNombre,
  onClick,
  index = 0,
  dragHandle,
}: ProductCardProps) {
  const meta = ESTADO_META[producto.estado]
  const last =
    formatRelativeOrShort(producto.ultimo_uso) ??
    formatRelativeOrShort(producto.ultima_compra)

  return (
    <div
      className="animate-fade-up flex w-full items-stretch gap-1 rounded-[1.35rem] bg-white shadow-soft ring-1 ring-stone-200/60"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {dragHandle}
      <button
        type="button"
        onClick={onClick}
        className={`flex min-w-0 flex-1 flex-col gap-2 p-4 text-left transition active:scale-[0.99] ${
          dragHandle ? 'rounded-r-[1.35rem] pl-1' : 'rounded-[1.35rem]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold tracking-tight text-ink">
              {producto.nombre}
            </h3>
            {producto.marca ? (
              <p className="mt-0.5 text-sm font-medium text-ink-muted">
                {producto.marca}
              </p>
            ) : null}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}
          >
            {meta.emoji} {meta.label}
          </span>
        </div>

        {last ? (
          <p className="text-xs text-stone-400">Último uso · {last}</p>
        ) : null}

        {producto.descripcion ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-stone-600">
            {producto.descripcion}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          {categoriaNombre ? (
            <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium">
              {categoriaNombre}
            </span>
          ) : null}
        </div>
      </button>
    </div>
  )
}
