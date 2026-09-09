import type {
  AIImageItem,
  CanonicalUnit,
} from './contracts'

const UNIT_VARIANTS: ReadonlyArray<{
  unit: CanonicalUnit
  variants: readonly string[]
}> = [
  { unit: 'unidad', variants: ['unidades', 'unidad', 'uds', 'ud'] },
  { unit: 'paquete', variants: ['paquetes', 'paquete', 'packs', 'pack', 'paq'] },
  { unit: 'botella', variants: ['botellas', 'botella', 'bot'] },
  { unit: 'bandeja', variants: ['bandejas', 'bandeja'] },
  { unit: 'docena', variants: ['docenas', 'docena'] },
  { unit: 'bolsa', variants: ['bolsas', 'bolsa'] },
  { unit: 'lata', variants: ['latas', 'lata', 'lat'] },
  { unit: 'caja', variants: ['cajas', 'caja'] },
  { unit: 'tarro', variants: ['tarros', 'tarro'] },
  { unit: 'kg', variants: ['kilogramos', 'kilogramo', 'kilos', 'kilo', 'kg'] },
  { unit: 'ml', variants: ['mililitros', 'mililitro', 'ml'] },
  { unit: 'g', variants: ['gramos', 'gramo', 'gr', 'g'] },
  { unit: 'l', variants: ['litros', 'litro', 'lts', 'lt', 'l'] },
]

const variantToUnit = new Map(
  UNIT_VARIANTS.flatMap(({ unit, variants }) =>
    variants.map((variant) => [variant, unit] as const),
  ),
)
const unitPattern = [...variantToUnit.keys()]
  .sort((left, right) => right.length - left.length)
  .join('|')

export interface ExtractedQuantity {
  value: number | null
  unit: CanonicalUnit | null
  evidenceText: string
  source: 'value_and_unit' | 'count' | 'unit_only'
}

export interface QuantityResolution {
  value: number | null
  unit: CanonicalUnit | null
  evidenceText: string | null
  conflict: boolean
  priceConfusionPrevented: boolean
}

function decimal(value: string) {
  return Number(value.replace(',', '.'))
}

export function detectTrailingPrice(text: string) {
  const match = text.match(
    /(?:^|\s)(\d{1,6}[,.]\d{2})\s*(?:€|eur)?\s*$/iu,
  )
  if (!match) return null
  return {
    value: decimal(match[1]),
    evidenceText: match[1],
    start: match.index! + match[0].indexOf(match[1]),
  }
}

export function extractQuantityAndUnit(
  originalText: string,
  documentKind?: string,
): ExtractedQuantity | null {
  const trailingPrice =
    documentKind === 'receipt' ? detectTrailingPrice(originalText) : null
  const text =
    trailingPrice === null
      ? originalText
      : originalText.slice(0, trailingPrice.start).trimEnd()

  const valueAndUnit = text.match(
    new RegExp(
      String.raw`(?:^|\s)(\d+(?:[.,]\d+)?)\s*(${unitPattern})\b`,
      'iu',
    ),
  )
  if (valueAndUnit) {
    const unitText = valueAndUnit[2].toLocaleLowerCase('es')
    return {
      value: decimal(valueAndUnit[1]),
      unit: variantToUnit.get(unitText) ?? null,
      evidenceText: `${valueAndUnit[1]}${valueAndUnit[0].includes(' ') ? ' ' : ''}${valueAndUnit[2]}`.trim(),
      source: 'value_and_unit',
    }
  }

  const leadingCount = text.match(
    /^\s*(\d+)\s*(?:[x×]\s*)?(?=\p{L})/iu,
  )
  if (leadingCount) {
    return {
      value: Number(leadingCount[1]),
      unit: 'unidad',
      evidenceText: leadingCount[0].trim(),
      source: 'count',
    }
  }

  const unitOnly = text.match(
    new RegExp(String.raw`(?:^|\s)(${unitPattern})\b`, 'iu'),
  )
  if (unitOnly) {
    return {
      value: null,
      unit:
        variantToUnit.get(unitOnly[1].toLocaleLowerCase('es')) ?? null,
      evidenceText: unitOnly[1],
      source: 'unit_only',
    }
  }

  return null
}

export function resolveItemQuantity(
  item: AIImageItem,
  documentKind: string,
): QuantityResolution {
  const extracted = extractQuantityAndUnit(
    item.source.originalText,
    documentKind,
  )
  const interpreted = item.interpretation.quantity
  const trailingPrice =
    documentKind === 'receipt'
      ? detectTrailingPrice(item.source.originalText)
      : null
  const modelUsedPriceAsQuantity =
    trailingPrice !== null &&
    interpreted.value === trailingPrice.value &&
    interpreted.evidenceText?.includes(trailingPrice.evidenceText) === true

  if (extracted) {
    const conflict =
      (interpreted.value !== null &&
        interpreted.value !== extracted.value) ||
      (interpreted.unit !== null && interpreted.unit !== extracted.unit)
    return {
      value: extracted.value,
      unit: extracted.unit,
      evidenceText: extracted.evidenceText,
      conflict,
      priceConfusionPrevented: modelUsedPriceAsQuantity,
    }
  }

  if (modelUsedPriceAsQuantity) {
    return {
      value: null,
      unit: null,
      evidenceText: null,
      conflict: true,
      priceConfusionPrevented: true,
    }
  }

  return {
    value: interpreted.value,
    unit: interpreted.unit,
    evidenceText: interpreted.evidenceText,
    conflict: false,
    priceConfusionPrevented: false,
  }
}
