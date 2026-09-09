export const MAX_IMAGE_COUNT = 4
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_TOTAL_IMAGE_BYTES = 20 * 1024 * 1024

const MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

export type SupportedImageMimeType = (typeof MIME_TYPES)[number]

export interface PreparedImage {
  mimeType: SupportedImageMimeType
  base64Data: string
  sha256: string
  byteLength: number
}

export class ImageInputError extends Error {
  readonly code:
    | 'NO_IMAGES'
    | 'TOO_MANY_IMAGES'
    | 'IMAGE_TOO_LARGE'
    | 'TOTAL_TOO_LARGE'
    | 'EMPTY_IMAGE'
    | 'UNSUPPORTED_IMAGE'

  constructor(code: ImageInputError['code'], message: string) {
    super(message)
    this.name = 'ImageInputError'
    this.code = code
  }
}

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((value, index) => bytes[index] === value)
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length))
}

export function detectImageMimeType(
  bytes: Uint8Array,
): SupportedImageMimeType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png'
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return 'image/webp'
  }

  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4).toLowerCase()
    if (brand === 'heic' || brand === 'heix' || brand === 'hevc') {
      return 'image/heic'
    }
    if (brand === 'mif1' || brand === 'msf1' || brand === 'heif') {
      return 'image/heif'
    }
  }

  return null
}

function bytesToBase64(bytes: Uint8Array) {
  const chunkSize = 32_768
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    )
  }
  return btoa(binary)
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256(bytes: Uint8Array) {
  const ownedBytes = new Uint8Array(bytes.byteLength)
  ownedBytes.set(bytes)
  const digest = await crypto.subtle.digest('SHA-256', ownedBytes.buffer)
  return bytesToHex(new Uint8Array(digest))
}

/**
 * Verifica el contenido real, conserva los bytes originales y elimina copias
 * exactas antes de invocar al modelo. Las transformaciones visuales se aplicarán
 * solo como variantes opcionales en fases posteriores.
 */
export async function prepareImageFiles(
  files: readonly File[],
): Promise<PreparedImage[]> {
  if (files.length === 0) {
    throw new ImageInputError(
      'NO_IMAGES',
      'Debes incluir al menos una imagen',
    )
  }
  if (files.length > MAX_IMAGE_COUNT) {
    throw new ImageInputError(
      'TOO_MANY_IMAGES',
      `Se admiten como máximo ${MAX_IMAGE_COUNT} imágenes`,
    )
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0)
  if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
    throw new ImageInputError(
      'TOTAL_TOO_LARGE',
      'El tamaño total de las imágenes es demasiado grande',
    )
  }

  const prepared: PreparedImage[] = []
  const seenHashes = new Set<string>()

  for (const file of files) {
    if (file.size === 0) {
      throw new ImageInputError('EMPTY_IMAGE', 'La imagen está vacía')
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new ImageInputError(
        'IMAGE_TOO_LARGE',
        `Cada imagen debe ocupar como máximo ${MAX_IMAGE_BYTES} bytes`,
      )
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const mimeType = detectImageMimeType(bytes)
    if (mimeType === null) {
      throw new ImageInputError(
        'UNSUPPORTED_IMAGE',
        'El archivo no contiene una imagen JPEG, PNG, WebP, HEIC o HEIF válida',
      )
    }

    const hash = await sha256(bytes)
    if (seenHashes.has(hash)) continue
    seenHashes.add(hash)
    prepared.push({
      mimeType,
      base64Data: bytesToBase64(bytes),
      sha256: hash,
      byteLength: bytes.byteLength,
    })
  }

  return prepared
}
