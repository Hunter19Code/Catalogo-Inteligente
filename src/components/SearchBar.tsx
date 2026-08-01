import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar productos…',
  autoFocus,
}: SearchBarProps) {
  return (
    <label className="relative block">
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
        strokeWidth={2}
      />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        className="h-14 w-full rounded-2xl border-0 bg-white/90 pr-12 pl-12 text-base shadow-soft outline-none ring-1 ring-stone-200/80 transition placeholder:text-ink-muted focus:ring-2 focus:ring-primary/40"
      />
      {value ? (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2 text-ink-muted"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </label>
  )
}
