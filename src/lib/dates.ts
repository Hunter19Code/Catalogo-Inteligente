const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function parseDateOnly(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Texto discreto: "hace 3 días" o "29 jul 2026" si > 14 días */
export function formatRelativeOrShort(dateStr?: string | null) {
  if (!dateStr) return null
  const date = parseDateOnly(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffDays === 0) return 'hoy'
  if (diffDays === 1) return 'ayer'
  if (diffDays > 1 && diffDays <= 14) return `hace ${diffDays} días`
  return formatShortDate(dateStr)
}

export function formatShortDate(dateStr: string) {
  const date = parseDateOnly(dateStr)
  return `${date.getDate()} ${MESES[date.getMonth()]} ${date.getFullYear()}`
}

export function formatHistorialLine(
  fecha: string,
  supermercado?: string | null,
) {
  const date = formatShortDate(fecha)
  return supermercado ? `${date} · ${supermercado}` : date
}
