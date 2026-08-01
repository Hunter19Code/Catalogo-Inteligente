import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { CategoryCard } from './CategoryCard'
import type { Categoria } from '../types'

interface SortableCategoryCardProps {
  categoria: Categoria
  count: number
  index?: number
}

export function SortableCategoryCard({
  categoria,
  count,
  index = 0,
}: SortableCategoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categoria.id })

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
      <CategoryCard
        categoria={categoria}
        count={count}
        index={index}
        dragHandle={
          <button
            type="button"
            className="absolute top-2 right-2 z-10 flex size-9 items-center justify-center rounded-full bg-white/70 text-ink-muted touch-none"
            aria-label="Arrastrar para reordenar"
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
