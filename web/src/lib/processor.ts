export interface ProcessedImage {
  cleanedImage: Buffer    // the background-removed PNG
  embedding: number[]     // 512-dim CLIP vector
}

export async function processImage(
  rawImage: Buffer,
  filename = 'item.jpg',
): Promise<ProcessedImage> {
  // Read env vars at call time — safer for module loading order
  const url = process.env.PROCESSOR_URL
  const secret = process.env.PROCESSOR_SECRET
  if (!url || !secret) {
    throw new Error('PROCESSOR_URL or PROCESSOR_SECRET is not set')
  }

  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(rawImage)]), filename)

  const response = await fetch(`${url}/process`, {
    method: 'POST',
    headers: {
      // Header name matches the processor service (processor/app.py).
      'x-processor-secret': secret,
    },
    body: formData,
    // A cold HF Space can be slow, but never let it hang the whole function.
    signal: AbortSignal.timeout(50_000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Processor returned ${response.status}: ${text.slice(0, 200)}`)
  }

  const data = (await response.json()) as {
    cleaned_image_b64: string
    embedding: number[]
  }

  return {
    cleanedImage: Buffer.from(data.cleaned_image_b64, 'base64'),
    embedding: data.embedding,
  }
}

export async function embedText(text: string): Promise<number[]> {
  const url = process.env.PROCESSOR_URL
  const secret = process.env.PROCESSOR_SECRET
  if (!url || !secret) {
    throw new Error('PROCESSOR_URL or PROCESSOR_SECRET is not set')
  }

  const response = await fetch(`${url}/embed_text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-processor-secret': secret,
    },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(50_000),
  })

  if (!response.ok) {
    const t = await response.text()
    throw new Error(`Processor /embed_text returned ${response.status}: ${t.slice(0, 200)}`)
  }

  const data = (await response.json()) as { embedding: number[] }
  return data.embedding
}