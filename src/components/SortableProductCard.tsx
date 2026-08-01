import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { ProductCard } from './ProductCard'
import type { Producto } from '../types'

interface SortableProductCardProps {
  producto: Producto
  categoriaNombre?: string
  onClick?: () => void
  index?: number
}

export function SortableProductCard({
  producto,
  categoriaNombre,
  onClick,
  index = 0,
}: SortableProductCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: producto.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.85 : 1,
        zIndex: isDragging ? 20 : undefined,
      }}
    >
      <ProductCard
        producto={producto}
        categoriaNombre={categoriaNombre}
        onClick={onClick}
        index={index}
        dragHandle={
          <button
            type="button"
            className="flex w-10 shrink-0 items-center justify-center rounded-l-[1.35rem] text-ink-muted touch-none active:bg-surface-2"
            aria-label="Arrastrar producto"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  )
}
