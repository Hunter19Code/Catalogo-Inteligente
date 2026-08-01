import type { FiltroRapido } from '../types'

const FILTROS: { id: FiltroRapido; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'favoritos', label: '⭐ Favoritos' },
  { id: 'pendientes', label: '🛒 Pendientes' },
  { id: 'comprados', label: '✅ Comprados' },
  { id: 'alimentacion', label: 'Solo alimentación' },
  { id: 'limpieza', label: 'Solo limpieza' },
]

interface FilterChipsProps {
  value: FiltroRapido
  onChange: (value: FiltroRapido) => void
}

export function FilterChips({ value, onChange }: FilterChipsProps) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FILTROS.map((f) => {
        const active = value === f.id
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-95 ${
              active
                ? 'bg-primary text-white shadow-soft'
                : 'bg-white/80 text-ink-muted ring-1 ring-stone-200/80'
            }`}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
