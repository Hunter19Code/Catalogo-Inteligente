import { Plus } from 'lucide-react'

interface FabProps {
  onClick: () => void
  label?: string
}

export function Fab({ onClick, label = 'Añadir producto' }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed right-5 bottom-6 z-40 flex size-16 items-center justify-center rounded-full bg-primary text-white shadow-[0_12px_32px_rgb(61_122_110_/_0.45)] transition hover:brightness-110 active:scale-95 safe-bottom"
    >
      <Plus className="size-8" strokeWidth={2.5} />
    </button>
  )
}
