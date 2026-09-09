import {
  AIImageAnalysisResponseSchema,
  NormalizedDetectedProductSchema,
  ReviewedShoppingListItemSchema,
  type AIImageAnalysisResponse,
  type NormalizedDetectedProduct,
  type ReviewedShoppingListItem,
} from './contracts'

export interface AIAnalysisValidationContext {
  allowedCategoryIds: ReadonlySet<string>
  imageCount: number
}

export interface ContractValidationIssue {
  path: string
  message: string
}

export class ContractValidationError extends Error {
  readonly issues: ContractValidationIssue[]

  constructor(message: string, issues: ContractValidationIssue[]) {
    super(message)
    this.name = 'ContractValidationError'
    this.issues = issues
  }
}

function parseUnknownJson(input: unknown): unknown {
  if (typeof input !== 'string') return input

  try {
    return JSON.parse(input) as unknown
  } catch {
    throw new ContractValidationError('La respuesta de IA no es JSON válido', [
      { path: '', message: 'JSON mal formado' },
    ])
  }
}

function schemaIssues(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): ContractValidationIssue[] {
  return issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }))
}

/**
 * Única puerta de entrada para respuestas del proveedor de IA.
 * Además del esquema comprueba referencias que dependen de cada petición.
 */
export function parseAIImageAnalysis(
  input: unknown,
  context: AIAnalysisValidationContext,
): AIImageAnalysisResponse {
  if (!Number.isInteger(context.imageCount) || context.imageCount < 1) {
    throw new Error('imageCount debe ser un entero positivo')
  }

  const parsed = AIImageAnalysisResponseSchema.safeParse(
    parseUnknownJson(input),
  )
  if (!parsed.success) {
    throw new ContractValidationError(
      'La respuesta de IA no cumple el contrato',
      schemaIssues(parsed.error.issues),
    )
  }

  const issues: ContractValidationIssue[] = []
  parsed.data.items.forEach((item, index) => {
    if (item.source.sourceImageIndex >= context.imageCount) {
      issues.push({
        path: `items.${index}.source.sourceImageIndex`,
        message: 'La imagen de origen no existe en esta petición',
      })
    }

    const categoryId = item.interpretation.categorySuggestionId
    if (
      categoryId !== null &&
      !context.allowedCategoryIds.has(categoryId)
    ) {
      issues.push({
        path: `items.${index}.interpretation.categorySuggestionId`,
        message: 'La categoría sugerida no pertenece al catálogo permitido',
      })
    }
  })

  if (issues.length > 0) {
    throw new ContractValidationError(
      'La respuesta de IA contiene referencias no permitidas',
      issues,
    )
  }

  return parsed.data
}

export function parseNormalizedDetectedProduct(
  input: unknown,
): NormalizedDetectedProduct {
  const parsed = NormalizedDetectedProductSchema.safeParse(input)
  if (!parsed.success) {
    throw new ContractValidationError(
      'El producto normalizado no cumple el contrato',
      schemaIssues(parsed.error.issues),
    )
  }
  return parsed.data
}

/**
 * Debe ejecutarse inmediatamente antes de guardar un elemento confirmado.
 */
export function parseReviewedShoppingListItem(
  input: unknown,
): ReviewedShoppingListItem {
  const parsed = ReviewedShoppingListItemSchema.safeParse(input)
  if (!parsed.success) {
    throw new ContractValidationError(
      'El producto revisado no cumple el contrato',
      schemaIssues(parsed.error.issues),
    )
  }
  return parsed.data
}
