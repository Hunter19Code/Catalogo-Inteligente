import { FolderPlus, PackagePlus, X } from 'lucide-react'

interface AddMenuProps {
  open: boolean
  onClose: () => void
  onAddCategoria: () => void
  onAddArticulo: () => void
  canAddArticulo?: boolean
  categoriaLabel?: string
  categoriaHint?: string
  showCategoria?: boolean
}

export function AddMenu({
  open,
  onClose,
  onAddCategoria,
  onAddArticulo,
  canAddArticulo = true,
  categoriaLabel = 'Categoría',
  categoriaHint = 'Hogar, comida, limpieza…',
  showCategoria = true,
}: AddMenuProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="animate-sheet-up relative z-10 w-full max-w-lg rounded-t-[1.75rem] bg-white px-5 pt-5 pb-8 shadow-2xl safe-bottom">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">¿Qué quieres añadir?</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-surface-2"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3">
          {showCategoria ? (
            <button
              type="button"
              onClick={onAddCategoria}
              className="flex w-full items-center gap-4 rounded-[1.35rem] bg-surface-2 p-4 text-left transition active:scale-[0.98]"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white">
                <FolderPlus className="size-6" />
              </span>
              <span>
                <span className="block text-lg font-bold">{categoriaLabel}</span>
                <span className="block text-sm text-ink-muted">
                  {categoriaHint}
                </span>
              </span>
            </button>
          ) : null}

          <button
            type="button"
            disabled={!canAddArticulo}
            onClick={onAddArticulo}
            className="flex w-full items-center gap-4 rounded-[1.35rem] bg-surface-2 p-4 text-left transition active:scale-[0.98] disabled:opacity-45"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-white">
              <PackagePlus className="size-6" />
            </span>
            <span>
              <span className="block text-lg font-bold">Artículo</span>
              <span className="block text-sm text-ink-muted">
                {canAddArticulo
                  ? 'Cualquier producto'
                  : 'Crea antes una categoría'}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
