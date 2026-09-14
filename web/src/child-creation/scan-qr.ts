/**
 * 从主机二维码读出房号。摄像头或选一张图片都可以。
 */
export function parseJoinFromQr(text: string): string | null {
  const raw = text.trim()
  if (!raw) return null
  try {
    const url = new URL(raw, 'http://local.invalid')
    const join = url.searchParams.get('join') || url.searchParams.get('room')
    if (join && /^[0-9A-Za-z]{3,12}$/.test(join)) return join
  } catch {
    /* not a URL */
  }
  const m = raw.match(/(?:join|room)=([0-9A-Za-z]{3,12})/i)
  if (m?.[1]) return m[1]
  if (/^\d{4}$/.test(raw)) return raw
  return null
}

export async function decodeQrFromImageData(data: ImageData): Promise<string | null> {
  const detector = (globalThis as { BarcodeDetector?: new (opts: { formats: string[] }) => {
    detect: (source: ImageBitmap | HTMLCanvasElement | ImageData) => Promise<{ rawValue: string }[]>
  } }).BarcodeDetector
  if (detector) {
    try {
      const det = new detector({ formats: ['qr_code'] })
      const found = await det.detect(data)
      const text = found[0]?.rawValue
      if (text) return text
    } catch {
      /* fall through to jsQR */
    }
  }
  const mod = (await import('jsqr')) as { default?: typeof import('jsqr') } & typeof import('jsqr')
  const jsQR = mod.default ?? mod
  const code = typeof jsQR === 'function' ? jsQR(data.data, data.width, data.height) : null
  return code && 'data' in code ? String(code.data) : null
}

export async function decodeQrFromFile(file: File): Promise<string | null> {
  const bmp = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bmp.width
  canvas.height = bmp.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bmp, 0, 0)
  return decodeQrFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height))
}
