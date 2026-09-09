import { describe, expect, it } from 'vitest'
import {
  AIImageItemSchema,
  detectTrailingPrice,
  extractQuantityAndUnit,
  resolveItemQuantity,
} from './index'

describe('extractQuantityAndUnit', () => {
  it.each([
    ['2 leche', 2, 'unidad'],
    ['1 kg tomates', 1, 'kg'],
    ['500g arroz', 500, 'g'],
    ['12 huevos', 12, 'unidad'],
    ['2 botellas agua', 2, 'botella'],
    ['3 lat atun', 3, 'lata'],
    ['1,5 litros agua', 1.5, 'l'],
    ['4 paquetes pasta', 4, 'paquete'],
    ['2 cajas cereales', 2, 'caja'],
  ] as const)('extrae %s como %s %s', (text, value, unit) => {
    expect(extractQuantityAndUnit(text)).toMatchObject({ value, unit })
  })

  it('no crea cantidad ni unidad cuando no aparecen', () => {
    expect(extractQuantityAndUnit('pollo')).toBeNull()
  })

  it('reconoce una presentación escrita aunque no tenga cantidad', () => {
    expect(extractQuantityAndUnit('botella agua')).toMatchObject({
      value: null,
      unit: 'botella',
      source: 'unit_only',
    })
  })
})

describe('precios de ticket', () => {
  it('detecta precios decimales al final de una línea', () => {
    expect(detectTrailingPrice('LECHE ENTERA 1L    1,25')).toMatchObject({
      value: 1.25,
      evidenceText: '1,25',
    })
  })

  it('extrae el volumen anterior sin convertir el precio en cantidad', () => {
    expect(
      extractQuantityAndUnit('LECHE ENTERA 1L    1,25', 'receipt'),
    ).toMatchObject({
      value: 1,
      unit: 'l',
    })
  })

  it('corrige una cantidad del modelo que en realidad era el precio', () => {
    const item = AIImageItemSchema.parse({
      itemIndex: 0,
      source: {
        originalText: 'LECHE ENTERA 1L    1,25',
        sourceImageIndex: 0,
        region: null,
        crossedOut: 'no',
        legibility: 0.95,
      },
      interpretation: {
        name: 'Leche entera',
        interpretationKind: 'literal',
        quantity: {
          value: 1.25,
          unit: null,
          unitText: null,
          evidenceText: '1,25',
          explicit: true,
        },
        detectedPrice: {
          value: 1.25,
          currency: 'EUR',
          evidenceText: '1,25',
        },
        categorySuggestionId: null,
        isProduct: true,
        uncertainties: [],
      },
      status: 'candidate',
      exclusionReason: null,
      modelConfidence: 0.95,
    })

    expect(resolveItemQuantity(item, 'receipt')).toMatchObject({
      value: 1,
      unit: 'l',
      conflict: true,
      priceConfusionPrevented: true,
    })
  })

  it('elimina una cantidad si la única cifra es un precio', () => {
    const item = AIImageItemSchema.parse({
      itemIndex: 0,
      source: {
        originalText: 'PAN INTEGRAL    2,35',
        sourceImageIndex: 0,
        region: null,
        crossedOut: 'no',
        legibility: 0.95,
      },
      interpretation: {
        name: 'Pan integral',
        interpretationKind: 'literal',
        quantity: {
          value: 2.35,
          unit: null,
          unitText: null,
          evidenceText: '2,35',
          explicit: true,
        },
        detectedPrice: {
          value: 2.35,
          currency: 'EUR',
          evidenceText: '2,35',
        },
        categorySuggestionId: null,
        isProduct: true,
        uncertainties: [],
      },
      status: 'candidate',
      exclusionReason: null,
      modelConfidence: 0.95,
    })

    expect(resolveItemQuantity(item, 'receipt')).toMatchObject({
      value: null,
      unit: null,
      conflict: true,
      priceConfusionPrevented: true,
    })
  })
})
