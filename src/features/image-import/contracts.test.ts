import { describe, expect, it } from 'vitest'
import {
  ContractValidationError,
  parseAIImageAnalysis,
  parseNormalizedDetectedProduct,
  parseReviewedShoppingListItem,
} from './index'
import type { AIImageAnalysisResponse } from './index'

function validResponse(): AIImageAnalysisResponse {
  return {
    schemaVersion: '1.0',
    document: {
      kind: 'handwritten_list',
      language: 'es',
      overallQuality: 0.82,
      qualityIssues: ['difficult_handwriting'],
    },
    items: [
      {
        itemIndex: 0,
        source: {
          originalText: '6 yog nat',
          sourceImageIndex: 0,
          region: { x: 0.1, y: 0.2, width: 0.4, height: 0.08 },
          crossedOut: 'no',
          legibility: 0.78,
        },
        interpretation: {
          name: 'Yogur natural',
          interpretationKind: 'expanded_abbreviation',
          quantity: {
            value: 6,
            unit: 'unidad',
            unitText: '6',
            evidenceText: '6',
            explicit: true,
          },
          detectedPrice: null,
          categorySuggestionId: 'cat-comida',
          isProduct: true,
          uncertainties: [],
        },
        status: 'candidate',
        exclusionReason: null,
        modelConfidence: 0.94,
      },
    ],
  }
}

const validationContext = {
  allowedCategoryIds: new Set(['cat-comida']),
  imageCount: 1,
}

describe('parseAIImageAnalysis', () => {
  it('acepta JSON estricto y conserva evidencia e interpretación separadas', () => {
    const parsed = parseAIImageAnalysis(
      JSON.stringify(validResponse()),
      validationContext,
    )

    expect(parsed.items[0].source.originalText).toBe('6 yog nat')
    expect(parsed.items[0].interpretation.name).toBe('Yogur natural')
    expect(parsed.items[0].interpretation.quantity).toMatchObject({
      value: 6,
      unit: 'unidad',
      explicit: true,
    })
  })

  it('rechaza propiedades libres aunque el resto sea válido', () => {
    const response = {
      ...validResponse(),
      explanation: 'texto libre no contratado',
    }

    expect(() =>
      parseAIImageAnalysis(response, validationContext),
    ).toThrow(ContractValidationError)
  })

  it('impide inventar cantidades marcadas como no explícitas', () => {
    const response = validResponse()
    response.items[0].interpretation.quantity = {
      value: 1,
      unit: 'unidad',
      unitText: null,
      evidenceText: null,
      explicit: false,
    }

    expect(() =>
      parseAIImageAnalysis(response, validationContext),
    ).toThrow(/no cumple el contrato/)
  })

  it('rechaza categorías que no estaban disponibles en la petición', () => {
    const response = validResponse()
    response.items[0].interpretation.categorySuggestionId = 'cat-ajena'

    expect(() =>
      parseAIImageAnalysis(response, validationContext),
    ).toThrow(/referencias no permitidas/)
  })

  it('obliga a excluir los productos claramente tachados', () => {
    const response = validResponse()
    response.items[0].source.crossedOut = 'clear'

    expect(() =>
      parseAIImageAnalysis(response, validationContext),
    ).toThrow(/no cumple el contrato/)
  })

  it('no admite productos en una imagen clasificada como ilegible', () => {
    const response = validResponse()
    response.document.kind = 'unreadable'

    expect(() =>
      parseAIImageAnalysis(response, validationContext),
    ).toThrow(/no cumple el contrato/)
  })

  it('mantiene el precio separado de la cantidad en tickets', () => {
    const response = validResponse()
    response.document.kind = 'receipt'
    response.items[0].source.originalText = 'LECHE ENTERA 1L  1,25'
    response.items[0].interpretation.name = 'Leche entera'
    response.items[0].interpretation.quantity = {
      value: 1,
      unit: 'l',
      unitText: '1L',
      evidenceText: '1L',
      explicit: true,
    }
    response.items[0].interpretation.detectedPrice = {
      value: 1.25,
      currency: 'EUR',
      evidenceText: '1,25',
    }

    const parsed = parseAIImageAnalysis(response, validationContext)

    expect(parsed.items[0].interpretation.quantity.value).toBe(1)
    expect(parsed.items[0].interpretation.detectedPrice?.value).toBe(1.25)
  })
})

describe('contratos posteriores a la IA', () => {
  it('no preselecciona una coincidencia ambigua', () => {
    const normalized = {
      id: 'detected-1',
      sourceItemIndexes: [0],
      source: validResponse().items[0].source,
      normalized: {
        name: 'Leche',
        quantity: null,
        unit: null,
        categorySuggestionId: 'cat-comida',
      },
      match: {
        kind: 'ambiguous',
        candidateProductIds: ['leche-entera', 'leche-desnatada'],
        selectedProductId: 'leche-entera',
      },
      confidence: {
        model: 0.8,
        textQuality: 0.9,
        interpretation: 0.6,
        catalogMatch: 0.5,
        overall: 0.6,
        level: 'medium',
        reasons: ['ambiguous_catalog_match'],
      },
      status: 'needs_review',
    }

    expect(() => parseNormalizedDetectedProduct(normalized)).toThrow(
      ContractValidationError,
    )
  })

  it('solo acepta como final un elemento confirmado explícitamente', () => {
    const reviewed = {
      id: 'reviewed-1',
      sourceDetectedItemIds: ['detected-1'],
      name: 'Pollo',
      quantity: null,
      unit: null,
      categoryId: 'cat-comida',
      productId: null,
      confirmed: false,
    }

    expect(() => parseReviewedShoppingListItem(reviewed)).toThrow(
      ContractValidationError,
    )
    expect(
      parseReviewedShoppingListItem({ ...reviewed, confirmed: true }).name,
    ).toBe('Pollo')
  })
})
