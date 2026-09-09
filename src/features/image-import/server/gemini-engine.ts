import {
  AI_IMAGE_ANALYSIS_JSON_SCHEMA,
  parseAIImageAnalysis,
  type AIImageAnalysisResponse,
} from '../index'
import type { PreparedImage } from './image-input'

export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-pro-preview'
export const GEMINI_TIMEOUT_MS = 90_000

export class ImageAnalysisError extends Error {
  readonly code:
    | 'PROVIDER_REJECTED'
    | 'PROVIDER_TIMEOUT'
    | 'PROVIDER_UNAVAILABLE'
    | 'EMPTY_PROVIDER_RESPONSE'
    | 'INVALID_PROVIDER_RESPONSE'

  readonly retryable: boolean

  constructor(
    code: ImageAnalysisError['code'],
    message: string,
    retryable: boolean,
  ) {
    super(message)
    this.name = 'ImageAnalysisError'
    this.code = code
    this.retryable = retryable
  }
}

export interface GeminiEngineOptions {
  apiKey: string
  model?: string
  fetchImplementation?: typeof fetch
  timeoutMs?: number
}

export const IMAGE_ANALYSIS_SYSTEM_PROMPT = `
Eres un sistema profesional y conservador de lectura de listas de compra.
Analiza visualmente todas las imágenes: orientación, perspectiva, iluminación,
columnas, texto impreso o manuscrito y tachados. No completes lo que no aparece.

REGLAS OBLIGATORIAS:
- Conserva en originalText exactamente el texto visible de cada línea.
- Corrige OCR o expande abreviaturas solo cuando el contexto lo sustente.
- "pollo" sigue siendo "Pollo"; nunca inventes corte, marca, cantidad o unidad.
- Si no hay cantidad o unidad escrita, usa null y explicit=false.
- Una cantidad o unidad solo es válida con evidenceText literal.
- Separa precios de cantidades, especialmente en tickets.
- Un tachado claro se excluye. Un posible tachado requiere revisión.
- Ante dos interpretaciones razonables, usa ambiguous/needs_review.
- categorySuggestionId siempre es null: no se ha facilitado catálogo.
- Si no es una lista o ticket, devuelve kind=not_a_list e items=[].
- Si no puede leerse con fiabilidad, devuelve kind=unreadable e items=[].
- No generes explicaciones, Markdown ni propiedades fuera del esquema.

Usa sourceImageIndex empezando en 0 e itemIndex único empezando en 0.
`.trim()

function providerJsonSchema() {
  const schema = structuredClone(AI_IMAGE_ANALYSIS_JSON_SCHEMA) as Record<
    string,
    unknown
  >
  delete schema.$schema
  return schema
}

export function buildGeminiRequest(images: readonly PreparedImage[]) {
  const parts: Array<Record<string, unknown>> = []
  images.forEach((image, index) => {
    parts.push({ text: `Imagen ${index} de ${images.length}:` })
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.base64Data,
      },
    })
  })
  parts.push({
    text: 'Analiza ahora las imágenes y devuelve únicamente el JSON validado.',
  })

  return {
    systemInstruction: {
      parts: [{ text: IMAGE_ANALYSIS_SYSTEM_PROMPT }],
    },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: providerJsonSchema(),
      mediaResolution: 'MEDIA_RESOLUTION_HIGH',
      temperature: 0.1,
      maxOutputTokens: 16_384,
    },
  }
}

function extractResponseText(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) {
    throw new ImageAnalysisError(
      'INVALID_PROVIDER_RESPONSE',
      'El proveedor devolvió una respuesta desconocida',
      false,
    )
  }

  const candidates = Reflect.get(payload, 'candidates')
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new ImageAnalysisError(
      'EMPTY_PROVIDER_RESPONSE',
      'El modelo no devolvió ningún resultado',
      true,
    )
  }

  const content = Reflect.get(candidates[0], 'content')
  const parts =
    typeof content === 'object' && content !== null
      ? Reflect.get(content, 'parts')
      : null
  if (!Array.isArray(parts)) {
    throw new ImageAnalysisError(
      'INVALID_PROVIDER_RESPONSE',
      'El modelo devolvió un resultado sin contenido',
      false,
    )
  }

  const text = parts
    .map((part) =>
      typeof part === 'object' && part !== null
        ? Reflect.get(part, 'text')
        : null,
    )
    .filter((value): value is string => typeof value === 'string')
    .join('')
    .trim()

  if (!text) {
    throw new ImageAnalysisError(
      'EMPTY_PROVIDER_RESPONSE',
      'El modelo no devolvió texto analizable',
      true,
    )
  }
  return text
}

export async function analyzePreparedImages(
  images: readonly PreparedImage[],
  options: GeminiEngineOptions,
): Promise<AIImageAnalysisResponse> {
  if (!options.apiKey) {
    throw new Error('Falta la clave del proveedor de IA')
  }
  if (images.length === 0) {
    throw new Error('No hay imágenes preparadas para analizar')
  }

  const fetchImplementation = options.fetchImplementation ?? fetch
  const model = options.model ?? DEFAULT_GEMINI_MODEL
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? GEMINI_TIMEOUT_MS,
  )

  try {
    const response = await fetchImplementation(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': options.apiKey,
        },
        body: JSON.stringify(buildGeminiRequest(images)),
        signal: controller.signal,
      },
    )

    if (!response.ok) {
      throw new ImageAnalysisError(
        response.status >= 500
          ? 'PROVIDER_UNAVAILABLE'
          : 'PROVIDER_REJECTED',
        'El proveedor de IA rechazó el análisis',
        response.status === 429 || response.status >= 500,
      )
    }

    const providerPayload: unknown = await response.json()
    const text = extractResponseText(providerPayload)
    try {
      return parseAIImageAnalysis(text, {
        allowedCategoryIds: new Set(),
        imageCount: images.length,
      })
    } catch {
      throw new ImageAnalysisError(
        'INVALID_PROVIDER_RESPONSE',
        'El resultado de IA no cumple el contrato esperado',
        true,
      )
    }
  } catch (error) {
    if (error instanceof ImageAnalysisError) throw error
    if (controller.signal.aborted) {
      throw new ImageAnalysisError(
        'PROVIDER_TIMEOUT',
        'El análisis ha superado el tiempo máximo',
        true,
      )
    }
    throw new ImageAnalysisError(
      'PROVIDER_UNAVAILABLE',
      'No se pudo contactar con el proveedor de IA',
      true,
    )
  } finally {
    clearTimeout(timeout)
  }
}
