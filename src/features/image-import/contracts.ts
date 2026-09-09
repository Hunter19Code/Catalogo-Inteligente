import { z } from 'zod'

const boundedText = (max: number) => z.string().trim().min(1).max(max)
const nullableBoundedText = (max: number) => boundedText(max).nullable()
const confidenceScore = z.number().min(0).max(1)

export const CANONICAL_UNITS = [
  'unidad',
  'kg',
  'g',
  'l',
  'ml',
  'paquete',
  'caja',
  'botella',
  'lata',
  'bolsa',
  'bandeja',
  'tarro',
  'docena',
] as const

export const CanonicalUnitSchema = z.enum(CANONICAL_UNITS)

export const ImageRegionSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .strict()
  .refine(
    ({ x, width }) => x + width <= 1,
    'La región excede el ancho de la imagen',
  )
  .refine(
    ({ y, height }) => y + height <= 1,
    'La región excede el alto de la imagen',
  )

export const SourceEvidenceSchema = z
  .object({
    originalText: boundedText(500),
    sourceImageIndex: z.number().int().nonnegative(),
    region: ImageRegionSchema.nullable(),
    crossedOut: z.enum(['no', 'possible', 'clear']),
    legibility: confidenceScore,
  })
  .strict()

export const QuantityInterpretationSchema = z
  .object({
    value: z.number().positive().max(100_000).nullable(),
    unit: CanonicalUnitSchema.nullable(),
    unitText: nullableBoundedText(50),
    evidenceText: nullableBoundedText(100),
    explicit: z.boolean(),
  })
  .strict()
  .superRefine((quantity, context) => {
    if (
      !quantity.explicit &&
      (quantity.value !== null ||
        quantity.unit !== null ||
        quantity.unitText !== null ||
        quantity.evidenceText !== null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Una cantidad no explícita no puede contener valores inferidos',
      })
    }

    if (
      quantity.unit !== null &&
      (quantity.unitText === null || quantity.evidenceText === null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Toda unidad normalizada necesita evidencia textual',
      })
    }

    if (quantity.value !== null && quantity.evidenceText === null) {
      context.addIssue({
        code: 'custom',
        message: 'Toda cantidad necesita evidencia textual',
      })
    }
  })

export const PriceInterpretationSchema = z
  .object({
    value: z.number().nonnegative().max(1_000_000),
    currency: z.enum(['EUR', 'unknown']),
    evidenceText: boundedText(100),
  })
  .strict()

export const AIProductInterpretationSchema = z
  .object({
    name: nullableBoundedText(200),
    interpretationKind: z.enum([
      'literal',
      'expanded_abbreviation',
      'corrected_ocr',
      'ambiguous',
      'not_a_product',
    ]),
    quantity: QuantityInterpretationSchema,
    detectedPrice: PriceInterpretationSchema.nullable(),
    categorySuggestionId: nullableBoundedText(100),
    isProduct: z.boolean(),
    uncertainties: z
      .array(
        z.enum([
          'name',
          'quantity',
          'unit',
          'category',
          'price_vs_quantity',
          'crossed_out',
          'multiple_products',
        ]),
      )
      .max(7),
  })
  .strict()

export const AIImageItemSchema = z
  .object({
    itemIndex: z.number().int().nonnegative(),
    source: SourceEvidenceSchema,
    interpretation: AIProductInterpretationSchema,
    status: z.enum(['candidate', 'needs_review', 'excluded']),
    exclusionReason: z
      .enum(['crossed_out', 'irrelevant_text', 'not_a_product'])
      .nullable(),
    modelConfidence: confidenceScore,
  })
  .strict()
  .superRefine((item, context) => {
    if (item.status === 'excluded' && item.exclusionReason === null) {
      context.addIssue({
        code: 'custom',
        message: 'Un elemento excluido necesita un motivo',
      })
    }

    if (item.status !== 'excluded' && item.exclusionReason !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Un elemento no excluido no puede tener motivo de exclusión',
      })
    }

    if (
      item.status !== 'excluded' &&
      (!item.interpretation.isProduct || item.interpretation.name === null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Un candidato debe ser un producto con nombre',
      })
    }

    if (
      item.source.crossedOut === 'clear' &&
      (item.status !== 'excluded' || item.exclusionReason !== 'crossed_out')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Un producto claramente tachado debe quedar excluido',
      })
    }

    if (
      item.source.crossedOut === 'possible' &&
      item.status === 'candidate'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Un posible tachado debe requerir revisión',
      })
    }
  })

export const AIImageAnalysisResponseSchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    document: z
      .object({
        kind: z.enum([
          'handwritten_list',
          'printed_list',
          'receipt',
          'screenshot',
          'mixed',
          'not_a_list',
          'unreadable',
        ]),
        language: nullableBoundedText(20),
        overallQuality: confidenceScore,
        qualityIssues: z
          .array(
            z.enum([
              'blur',
              'low_light',
              'glare',
              'low_contrast',
              'perspective',
              'rotation',
              'small_text',
              'cropped',
              'multiple_columns',
              'difficult_handwriting',
            ]),
          )
          .max(10),
      })
      .strict(),
    items: z.array(AIImageItemSchema).max(200),
  })
  .strict()
  .superRefine((response, context) => {
    if (
      (response.document.kind === 'not_a_list' ||
        response.document.kind === 'unreadable') &&
      response.items.length > 0
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Una imagen sin lista legible no puede producir productos',
      })
    }

    const itemIndexes = new Set(response.items.map((item) => item.itemIndex))
    if (itemIndexes.size !== response.items.length) {
      context.addIssue({
        code: 'custom',
        message: 'Los índices de elementos deben ser únicos',
      })
    }
  })

export const CONFIDENCE_REASONS = [
  'clear_text',
  'poor_image_quality',
  'difficult_handwriting',
  'corrected_ocr',
  'expanded_abbreviation',
  'ambiguous_name',
  'ambiguous_quantity',
  'ambiguous_unit',
  'price_quantity_conflict',
  'unique_catalog_match',
  'ambiguous_catalog_match',
  'possible_crossed_out',
] as const

export const ConfidenceAssessmentSchema = z
  .object({
    model: confidenceScore,
    textQuality: confidenceScore,
    interpretation: confidenceScore,
    catalogMatch: confidenceScore.nullable(),
    overall: confidenceScore,
    level: z.enum(['high', 'medium', 'low']),
    reasons: z.array(z.enum(CONFIDENCE_REASONS)).max(12),
  })
  .strict()

export const CatalogMatchSchema = z
  .object({
    kind: z.enum(['none', 'unique', 'ambiguous']),
    candidateProductIds: z.array(boundedText(100)).max(10),
    selectedProductId: nullableBoundedText(100),
  })
  .strict()
  .superRefine((match, context) => {
    if (match.kind === 'none' && match.candidateProductIds.length > 0) {
      context.addIssue({
        code: 'custom',
        message: 'Una coincidencia vacía no puede incluir candidatos',
      })
    }
    if (match.kind !== 'unique' && match.selectedProductId !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Solo una coincidencia única puede preseleccionarse',
      })
    }
    if (
      match.kind === 'unique' &&
      (match.candidateProductIds.length !== 1 ||
        match.selectedProductId !== match.candidateProductIds[0])
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Una coincidencia única debe señalar su único candidato',
      })
    }
  })

export const NormalizedDetectedProductSchema = z
  .object({
    id: boundedText(100),
    sourceItemIndexes: z.array(z.number().int().nonnegative()).min(1),
    source: SourceEvidenceSchema,
    normalized: z
      .object({
        name: boundedText(200),
        quantity: z.number().positive().max(100_000).nullable(),
        unit: CanonicalUnitSchema.nullable(),
        categorySuggestionId: nullableBoundedText(100),
      })
      .strict(),
    match: CatalogMatchSchema,
    confidence: ConfidenceAssessmentSchema,
    status: z.enum(['ready', 'needs_review', 'excluded']),
  })
  .strict()

export const ReviewedShoppingListItemSchema = z
  .object({
    id: boundedText(100),
    sourceDetectedItemIds: z.array(boundedText(100)).min(1),
    name: boundedText(200),
    quantity: z.number().positive().max(100_000).nullable(),
    unit: CanonicalUnitSchema.nullable(),
    categoryId: nullableBoundedText(100),
    productId: nullableBoundedText(100),
    confirmed: z.literal(true),
  })
  .strict()

export const AI_IMAGE_ANALYSIS_SCHEMA_VERSION = '1.0' as const

export type CanonicalUnit = z.infer<typeof CanonicalUnitSchema>
export type SourceEvidence = z.infer<typeof SourceEvidenceSchema>
export type AIImageItem = z.infer<typeof AIImageItemSchema>
export type AIImageAnalysisResponse = z.infer<
  typeof AIImageAnalysisResponseSchema
>
export type NormalizedDetectedProduct = z.infer<
  typeof NormalizedDetectedProductSchema
>
export type ReviewedShoppingListItem = z.infer<
  typeof ReviewedShoppingListItemSchema
>
