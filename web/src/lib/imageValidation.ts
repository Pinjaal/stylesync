// Shared image upload constraints + validation, used on both the client (before
// uploading to Storage) and the server (before processing bytes we downloaded).

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024 // 15 MB

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

// Extensions we allow in Storage keys — keeps arbitrary/executable extensions
// out of the object path even though the bucket is private.
const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])

export function safeImageExt(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  // Guard against a "." in a directory-like name yielding a slashed segment.
  const clean = ext.replace(/[^a-z0-9]/g, '')
  return ALLOWED_EXTS.has(clean) ? clean : 'jpg'
}

// Client-side gate. Returns an error string, or null if the file is acceptable.
export function imageFileError(file: File): string | null {
  if (file.size > MAX_IMAGE_BYTES) {
    return `Image is too large (max ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))} MB)`
  }
  // Some browsers report an empty type for HEIC; allow empty but reject clearly
  // non-image types.
  if (file.type && !file.type.startsWith('image/')) {
    return 'Only image files are allowed'
  }
  return null
}

// Server-side gate: verify size and sniff magic bytes so a spoofed
// content-type can't push arbitrary blobs through processing.
export function sniffedImageType(buf: Buffer): string | null {
  if (buf.length < 12) return null
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return 'image/png'
  }
  // WEBP: "RIFF"...."WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return 'image/webp'
  }
  // HEIC/HEIF: bytes 4..8 == "ftyp"
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    return 'image/heic'
  }
  return null
}
