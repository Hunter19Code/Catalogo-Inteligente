import { Link } from 'react-router-dom'
import type { Categoria } from '../types'

interface CategoryCardProps {
  categoria: Categoria
  count: number
  index?: number
  dragHandle?: React.ReactNode
}

export function CategoryCard({
  categoria,
  count,
  index = 0,
  dragHandle,
}: CategoryCardProps) {
  return (
    <div
      className="animate-fade-up relative flex min-h-[120px] flex-col justify-between overflow-hidden rounded-[1.5rem] shadow-soft"
      style={{
        background: `linear-gradient(145deg, ${categoria.color}33 0%, ${categoria.color}55 100%)`,
        animationDelay: `${index * 40}ms`,
      }}
    >
      {dragHandle}
      <Link
        to={`/categoria/${categoria.id}`}
        className="relative z-0 flex min-h-[120px] flex-1 flex-col justify-between p-4 text-left transition active:scale-[0.98]"
      >
        <div
          className="pointer-events-none absolute -right-4 -bottom-6 size-28 rounded-full opacity-30"
          style={{ background: categoria.color }}
        />
        <span className="text-3xl drop-shadow-sm">{categoria.icono}</span>
        <div>
          <h2 className="pr-8 text-lg font-bold tracking-tight text-ink">
            {categoria.nombre}
          </h2>
          <p className="mt-0.5 text-sm font-medium text-ink-muted">
            {count} {count === 1 ? 'producto' : 'productos'}
          </p>
        </div>
      </Link>
    </div>
  )
}
