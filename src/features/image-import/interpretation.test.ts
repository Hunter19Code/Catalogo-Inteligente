import { describe, expect, it } from 'vitest'
import {
  AIImageAnalysisResponseSchema,
  normalizeAIAnalysis,
  semanticEvidenceScore,
} from './index'

type InterpretationKind =
  | 'literal'
  | 'expanded_abbreviation'
  | 'corrected_ocr'
  | 'ambiguous'

interface ExampleOptions {
  original: string
  proposed: string
  kind?: InterpretationKind
  value?: number | null
  unit?: 'kg' | 'g' | 'l' | 'ml' | 'lata' | null
  status?: 'candidate' | 'needs_review' | 'excluded'
  crossedOut?: 'no' | 'possible' | 'clear'
  legibility?: number
  documentQuality?: number
  modelConfidence?: number
  uncertainties?: Array<
    | 'name'
    | 'quantity'
    | 'unit'
    | 'category'
    | 'price_vs_quantity'
    | 'crossed_out'
    | 'multiple_products'
  >
}

function example(options: ExampleOptions) {
  const value = options.value ?? null
  const unit = options.unit ?? null
  const explicit = value !== null || unit !== null
  const evidenceText = explicit
    ? options.original.match(/\d+(?:[.,]\d+)?\s*\p{L}*/u)?.[0] ?? null
    : null
  const status = options.status ?? 'candidate'

  return AIImageAnalysisResponseSchema.parse({
    schemaVersion: '1.0',
    document: {
      kind: 'handwritten_list',
      language: 'es',
      overallQuality: options.documentQuality ?? 0.9,
      qualityIssues: [],
    },
    items: [
      {
        itemIndex: 0,
        source: {
          originalText: options.original,
          sourceImageIndex: 0,
          region: null,
          crossedOut: options.crossedOut ?? 'no',
          legibility: options.legibility ?? 0.9,
        },
        interpretation: {
          name: options.proposed,
          interpretationKind: options.kind ?? 'literal',
          quantity: {
            value,
            unit,
            unitText: unit === null ? null : evidenceText,
            evidenceText,
            explicit,
          },
          detectedPrice: null,
          categorySuggestionId: null,
          isProduct: true,
          uncertainties: options.uncertainties ?? [],
        },
        status,
        exclusionReason:
          status === 'excluded' ? 'crossed_out' : null,
        modelConfidence: options.modelConfidence ?? 0.95,
      },
    ],
  })
}

describe('evidencia semántica', () => {
  it('reconoce abreviaturas sustentadas por prefijos', () => {
    expect(semanticEvidenceScore('6 yog nat', 'Yogur natural')).toBeGreaterThan(
      0.85,
    )
    expect(semanticEvidenceScore('tom 1kg', 'Tomate')).toBeGreaterThan(0.85)
  })

  it('reconoce errores OCR pequeños y sustituciones numéricas', () => {
    expect(semanticEvidenceScore('lech3', 'Leche')).toBe(1)
  })

  it('penaliza detalles que no aparecen en el original', () => {
    expect(semanticEvidenceScore('pollo', 'Pechuga de pollo')).toBeLessThan(
      0.72,
    )
  })
})

describe('normalización conservadora', () => {
  it.each([
    ['6 yog nat', 'Yogur natural', 'expanded_abbreviation'],
    ['tom 1kg', 'Tomate', 'expanded_abbreviation'],
    ['3 lat atun', 'Atún', 'expanded_abbreviation'],
    ['2x coca cola', 'Coca-Cola', 'literal'],
    ['lech3', 'Leche', 'corrected_ocr'],
  ] as const)('interpreta %s como %s sin añadir detalles', (original, name, kind) => {
    const [product] = normalizeAIAnalysis(
      example({ original, proposed: name, kind }),
    )

    expect(product.normalized.name).toBe(name)
    expect(product.source.originalText).toBe(original)
  })

  it('revierte una especialización inventada al texto literal', () => {
    const [product] = normalizeAIAnalysis(
      example({
        original: 'pollo',
        proposed: 'Pechuga de pollo',
        kind: 'expanded_abbreviation',
      }),
    )

    expect(product.normalized.name).toBe('Pollo')
    expect(product.normalized.quantity).toBeNull()
    expect(product.normalized.unit).toBeNull()
    expect(product.status).toBe('needs_review')
    expect(product.confidence.reasons).toContain('ambiguous_name')
  })

  it('conserva cantidades y unidades explícitas sin crear valores por defecto', () => {
    const [withQuantity] = normalizeAIAnalysis(
      example({
        original: 'tom 1kg',
        proposed: 'Tomate',
        kind: 'expanded_abbreviation',
        value: 1,
        unit: 'kg',
      }),
    )
    const [withoutQuantity] = normalizeAIAnalysis(
      example({ original: 'pollo', proposed: 'Pollo' }),
    )

    expect(withQuantity.normalized).toMatchObject({
      quantity: 1,
      unit: 'kg',
    })
    expect(withoutQuantity.normalized).toMatchObject({
      quantity: null,
      unit: null,
    })
  })

  it('no confía en un porcentaje alto si la imagen es deficiente', () => {
    const [product] = normalizeAIAnalysis(
      example({
        original: 'leche',
        proposed: 'Leche',
        legibility: 0.1,
        documentQuality: 0.1,
        modelConfidence: 0.99,
      }),
    )

    expect(product.confidence.level).not.toBe('high')
    expect(product.status).toBe('needs_review')
    expect(product.confidence.reasons).toContain('poor_image_quality')
  })

  it('mantiene excluido un producto claramente tachado', () => {
    const [product] = normalizeAIAnalysis(
      example({
        original: 'pan',
        proposed: 'Pan',
        status: 'excluded',
        crossedOut: 'clear',
      }),
    )

    expect(product.status).toBe('excluded')
  })
})
