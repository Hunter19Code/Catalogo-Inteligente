import { describe, expect, it, vi } from 'vitest'
import {
  ImageAnalysisError,
  analyzePreparedImages,
  buildGeminiRequest,
} from './gemini-engine'
import {
  ImageInputError,
  detectImageMimeType,
  prepareImageFiles,
  type PreparedImage,
} from './image-input'

const pngHeader = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
])

function preparedImage(): PreparedImage {
  return {
    mimeType: 'image/png',
    base64Data: 'iVBORw0KGgoA',
    sha256: 'hash',
    byteLength: pngHeader.byteLength,
  }
}

function validProviderResponse() {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                schemaVersion: '1.0',
                document: {
                  kind: 'not_a_list',
                  language: null,
                  overallQuality: 0.9,
                  qualityIssues: [],
                },
                items: [],
              }),
            },
          ],
        },
      },
    ],
  }
}

describe('preparación de imágenes', () => {
  it('comprueba el contenido real y no confía en la extensión', () => {
    expect(detectImageMimeType(pngHeader)).toBe('image/png')
    expect(
      detectImageMimeType(new TextEncoder().encode('no es una imagen')),
    ).toBeNull()
  })

  it('conserva los bytes y elimina imágenes exactamente duplicadas', async () => {
    const first = new File([pngHeader], 'lista.png', { type: 'image/png' })
    const duplicate = new File([pngHeader], 'otra.jpg', {
      type: 'image/jpeg',
    })

    const result = await prepareImageFiles([first, duplicate])

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      mimeType: 'image/png',
      byteLength: pngHeader.byteLength,
    })
    expect(result[0].sha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rechaza archivos que simulan ser imágenes', async () => {
    const fake = new File(['texto'], 'falsa.png', { type: 'image/png' })

    await expect(prepareImageFiles([fake])).rejects.toMatchObject<
      Partial<ImageInputError>
    >({
      code: 'UNSUPPORTED_IMAGE',
    })
  })
})

describe('motor Gemini', () => {
  it('envía originales a resolución alta con un JSON Schema estricto', () => {
    const request = buildGeminiRequest([preparedImage()])

    expect(request.generationConfig).toMatchObject({
      responseMimeType: 'application/json',
      mediaResolution: 'MEDIA_RESOLUTION_HIGH',
      temperature: 0.1,
    })
    expect(request.generationConfig.responseJsonSchema).toMatchObject({
      type: 'object',
      additionalProperties: false,
    })
    expect(JSON.stringify(request)).toContain('inlineData')
    expect(JSON.stringify(request)).toContain('categorySuggestionId siempre es null')
  })

  it('valida el JSON del proveedor antes de devolverlo', async () => {
    let capturedRequest: RequestInit | undefined
    const fetchMock: typeof fetch = async (_input, request) => {
      capturedRequest = request
      return new Response(JSON.stringify(validProviderResponse()), {
        status: 200,
      })
    }

    const result = await analyzePreparedImages([preparedImage()], {
      apiKey: 'server-secret',
      fetchImplementation: fetchMock,
      timeoutMs: 1_000,
    })

    expect(result.document.kind).toBe('not_a_list')
    expect(capturedRequest?.headers).toMatchObject({
      'x-goog-api-key': 'server-secret',
    })
  })

  it('rechaza respuestas estructuralmente inválidas del proveedor', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: '{"productos":["inventado"]}' }] } },
          ],
        }),
        { status: 200 },
      ),
    )

    await expect(
      analyzePreparedImages([preparedImage()], {
        apiKey: 'server-secret',
        fetchImplementation: fetchMock as typeof fetch,
        timeoutMs: 1_000,
      }),
    ).rejects.toMatchObject<Partial<ImageAnalysisError>>({
      code: 'INVALID_PROVIDER_RESPONSE',
      retryable: true,
    })
  })

  it('marca como reintentables los fallos temporales del proveedor', async () => {
    const fetchMock = vi.fn(
      async () => new Response('unavailable', { status: 503 }),
    )

    await expect(
      analyzePreparedImages([preparedImage()], {
        apiKey: 'server-secret',
        fetchImplementation: fetchMock as typeof fetch,
        timeoutMs: 1_000,
      }),
    ).rejects.toMatchObject<Partial<ImageAnalysisError>>({
      code: 'PROVIDER_UNAVAILABLE',
      retryable: true,
    })
  })
})
