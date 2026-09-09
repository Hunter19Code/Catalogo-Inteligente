import {
  ImageAnalysisError,
  analyzePreparedImages,
} from '../../../src/features/image-import/server/gemini-engine.ts'
import {
  ImageInputError,
  prepareImageFiles,
} from '../../../src/features/image-import/server/image-input.ts'
import { normalizeAIAnalysis } from '../../../src/features/image-import/interpretation.ts'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

async function verifyAuthenticatedUser(
  request: Request,
  supabaseUrl: string,
  supabaseAnonKey: string,
) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return false

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      authorization,
      apikey: supabaseAnonKey,
    },
  })
  return response.ok
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return jsonResponse(
      { error: { code: 'METHOD_NOT_ALLOWED', retryable: false } },
      405,
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  if (!supabaseUrl || !supabaseAnonKey || !geminiApiKey) {
    return jsonResponse(
      { error: { code: 'SERVER_NOT_CONFIGURED', retryable: false } },
      500,
    )
  }

  if (
    !(await verifyAuthenticatedUser(
      request,
      supabaseUrl,
      supabaseAnonKey,
    ))
  ) {
    return jsonResponse(
      { error: { code: 'UNAUTHORIZED', retryable: false } },
      401,
    )
  }

  try {
    const form = await request.formData()
    const files = form
      .getAll('images')
      .filter((value): value is File => value instanceof File)
    const images = await prepareImageFiles(files)
    const analysis = await analyzePreparedImages(images, {
      apiKey: geminiApiKey,
      model: Deno.env.get('GEMINI_MODEL') ?? undefined,
    })
    const products = normalizeAIAnalysis(analysis)

    return jsonResponse({
      analysis,
      products,
      sources: images.map(({ sha256, byteLength, mimeType }, index) => ({
        index,
        sha256,
        byteLength,
        mimeType,
      })),
    })
  } catch (error) {
    if (error instanceof ImageInputError) {
      return jsonResponse(
        { error: { code: error.code, retryable: false } },
        400,
      )
    }
    if (error instanceof ImageAnalysisError) {
      return jsonResponse(
        { error: { code: error.code, retryable: error.retryable } },
        error.retryable ? 503 : 422,
      )
    }
    return jsonResponse(
      { error: { code: 'ANALYSIS_FAILED', retryable: true } },
      500,
    )
  }
})
