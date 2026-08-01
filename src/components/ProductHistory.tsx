import { X } from 'lucide-react'
import { formatHistorialLine } from '../lib/dates'
import type { HistorialEntry, Producto } from '../types'

interface ProductHistoryProps {
  open: boolean
  onClose: () => void
  producto: Producto | null
  entries: HistorialEntry[]
}

const ACCION_LABEL: Record<string, string> = {
  comprado: 'Comprado',
  usado: 'Usado',
  terminado: 'Terminado',
  anadido: 'Añadido',
}

export function ProductHistory({
  open,
  onClose,
  producto,
  entries,
}: ProductHistoryProps) {
  if (!open || !producto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="animate-sheet-up relative z-10 flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Historial</h2>
            <p className="text-sm text-ink-muted">{producto.nombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-surface-2"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8 safe-bottom">
          {entries.length === 0 ? (
            <p className="rounded-2xl bg-surface-2 px-4 py-8 text-center text-sm text-ink-muted">
              Aún no hay usos registrados. Al marcar como comprado se guardará
              aquí.
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {formatHistorialLine(entry.fecha, entry.supermercado)}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {ACCION_LABEL[entry.accion] ?? entry.accion}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
