import {
  NormalizedDetectedProductSchema,
  type AIImageAnalysisResponse,
  type AIImageItem,
  type NormalizedDetectedProduct,
} from './contracts'
import {
  resolveItemQuantity,
  type QuantityResolution,
} from './quantity'

const STOP_WORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las'])
const NON_NAME_TOKENS = new Set([
  'x',
  'kg',
  'g',
  'gr',
  'l',
  'lt',
  'ml',
  'ud',
  'uds',
  'unidad',
  'unidades',
])

function comparisonText(value: string) {
  return value
    .toLocaleLowerCase('es')
    .replaceAll('0', 'o')
    .replaceAll('1', 'i')
    .replaceAll('3', 'e')
    .replaceAll('4', 'a')
    .replaceAll('5', 's')
    .replaceAll('7', 't')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function tokens(value: string) {
  return comparisonText(value)
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter(
      (token) =>
        !STOP_WORDS.has(token) &&
        !NON_NAME_TOKENS.has(token) &&
        !/^\d+(?:[.,]\d+)?$/.test(token),
    ) ?? []
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, i) => i)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      )
    }
    previous.splice(0, previous.length, ...current)
  }
  return previous[right.length]
}

function tokenSupport(source: string, target: string) {
  if (source === target) return 1
  if (
    source.length >= 2 &&
    target.length > source.length &&
    target.startsWith(source)
  ) {
    return 0.9
  }
  if (
    Math.min(source.length, target.length) >= 4 &&
    editDistance(source, target) <= 1
  ) {
    return 0.78
  }
  return 0
}

export function semanticEvidenceScore(originalText: string, name: string) {
  const sourceTokens = tokens(originalText)
  const targetTokens = tokens(name)
  if (sourceTokens.length === 0 || targetTokens.length === 0) return 0

  const scores = targetTokens.map((target) =>
    Math.max(...sourceTokens.map((source) => tokenSupport(source, target))),
  )
  return scores.reduce((total, score) => total + score, 0) / scores.length
}

function titleCaseFirst(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return normalized
  const casingPreserved =
    normalized === normalized.toLocaleUpperCase('es')
      ? normalized.toLocaleLowerCase('es')
      : normalized
  return (
    casingPreserved.charAt(0).toLocaleUpperCase('es') +
    casingPreserved.slice(1)
  )
}

/**
 * Recuperación conservadora: elimina únicamente patrones inequívocos de
 * cantidad/precio. No expande abreviaturas ni añade palabras.
 */
export function literalProductName(originalText: string) {
  return titleCaseFirst(
    originalText
      .replace(/\b\d+[.,]\d{2}\s*(?:€|eur)?\s*$/iu, '')
      .replace(/^\s*\d+(?:[.,]\d+)?\s*[x×]?\s*/u, '')
      .replace(
        /\b\d+(?:[.,]\d+)?\s*(?:kg|gr?|l|lt|ml|uds?|unidades?)\b/giu,
        '',
      )
      .trim()
      .replace(/^[x×]\s*/u, ''),
  )
}

function confidenceReasons(
  item: AIImageItem,
  evidenceScore: number,
  usedLiteralFallback: boolean,
  quantity: QuantityResolution,
) {
  const reasons = new Set<
    NormalizedDetectedProduct['confidence']['reasons'][number]
  >()
  if (item.source.legibility >= 0.85) reasons.add('clear_text')
  if (item.source.legibility < 0.6) reasons.add('poor_image_quality')
  if (item.interpretation.interpretationKind === 'corrected_ocr') {
    reasons.add('corrected_ocr')
  }
  if (item.interpretation.interpretationKind === 'expanded_abbreviation') {
    reasons.add('expanded_abbreviation')
  }
  if (
    item.interpretation.interpretationKind === 'ambiguous' ||
    evidenceScore < 0.72 ||
    usedLiteralFallback
  ) {
    reasons.add('ambiguous_name')
  }
  if (item.interpretation.uncertainties.includes('quantity')) {
    reasons.add('ambiguous_quantity')
  }
  if (item.interpretation.uncertainties.includes('unit')) {
    reasons.add('ambiguous_unit')
  }
  if (item.interpretation.uncertainties.includes('price_vs_quantity')) {
    reasons.add('price_quantity_conflict')
  }
  if (quantity.conflict || quantity.priceConfusionPrevented) {
    reasons.add('price_quantity_conflict')
  }
  if (item.source.crossedOut === 'possible') {
    reasons.add('possible_crossed_out')
  }
  return [...reasons]
}

function interpretationCeiling(item: AIImageItem) {
  switch (item.interpretation.interpretationKind) {
    case 'literal':
      return 1
    case 'expanded_abbreviation':
      return 0.92
    case 'corrected_ocr':
      return 0.82
    case 'ambiguous':
      return 0.5
    case 'not_a_product':
      return 0
  }
}

function normalizeItem(
  item: AIImageItem,
  documentQuality: number,
  documentKind: string,
): NormalizedDetectedProduct | null {
  if (item.interpretation.name === null) return null

  const proposedName = titleCaseFirst(item.interpretation.name)
  const evidenceScore = semanticEvidenceScore(
    item.source.originalText,
    proposedName,
  )
  const literalFallback = literalProductName(item.source.originalText)
  const usedLiteralFallback =
    evidenceScore < 0.72 && literalFallback.length > 0
  const name = usedLiteralFallback ? literalFallback : proposedName
  const quantity = resolveItemQuantity(item, documentKind)

  const textQuality = (item.source.legibility + documentQuality) / 2
  const interpretation = Math.min(
    evidenceScore,
    interpretationCeiling(item),
  )
  const uncertaintyPenalty = Math.min(
    item.interpretation.uncertainties.length * 0.04 +
      (quantity.conflict ? 0.12 : 0),
    0.2,
  )
  const overall = Math.max(
    0,
    Math.min(
      1,
      item.modelConfidence * 0.3 +
        textQuality * 0.3 +
        interpretation * 0.4 -
        uncertaintyPenalty,
    ),
  )
  const level = overall >= 0.8 ? 'high' : overall >= 0.55 ? 'medium' : 'low'

  const excluded = item.status === 'excluded'
  const needsReview =
    !excluded &&
    (item.status === 'needs_review' ||
      usedLiteralFallback ||
      quantity.conflict ||
      item.interpretation.interpretationKind === 'ambiguous' ||
      item.interpretation.uncertainties.length > 0 ||
      level !== 'high')

  return NormalizedDetectedProductSchema.parse({
    id: `image-${item.source.sourceImageIndex}-item-${item.itemIndex}`,
    sourceItemIndexes: [item.itemIndex],
    source: item.source,
    normalized: {
      name,
      quantity: quantity.value,
      unit: quantity.unit,
      categorySuggestionId: item.interpretation.categorySuggestionId,
    },
    match: {
      kind: 'none',
      candidateProductIds: [],
      selectedProductId: null,
    },
    confidence: {
      model: item.modelConfidence,
      textQuality,
      interpretation,
      catalogMatch: null,
      overall,
      level,
      reasons: confidenceReasons(
        item,
        evidenceScore,
        usedLiteralFallback,
        quantity,
      ),
    },
    status: excluded ? 'excluded' : needsReview ? 'needs_review' : 'ready',
  })
}

export function normalizeAIAnalysis(
  analysis: AIImageAnalysisResponse,
): NormalizedDetectedProduct[] {
  return analysis.items
    .map((item) =>
      normalizeItem(
        item,
        analysis.document.overallQuality,
        analysis.document.kind,
      ),
    )
    .filter((item): item is NormalizedDetectedProduct => item !== null)
}
