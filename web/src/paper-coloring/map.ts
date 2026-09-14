/**
 * 纸上涂色：把拍到的官方线稿对准同一张模板。
 * 只认四角标记 + 用户选的小鹿/老虎/狮子。不猜测未知动物。
 */
import { drawRegions, regionName } from '../child-creation/lineart'
import type { AnimalId } from '../types'
import { MARK, TEMPLATE_H, TEMPLATE_W, markCenters, type Point } from './template'

export type Quad = { tl: Point; tr: Point; bl: Point; br: Point }

function luminance(r: number, g: number, b: number): number {
  return r * 0.3 + g * 0.59 + b * 0.11
}

function darkCentroid(
  bin: Uint8Array,
  w: number,
  h: number,
  cx: number,
  cy: number,
  radius: number,
): Point | null {
  let sx = 0
  let sy = 0
  let n = 0
  const x0 = Math.max(0, Math.floor(cx - radius))
  const y0 = Math.max(0, Math.floor(cy - radius))
  const x1 = Math.min(w - 1, Math.ceil(cx + radius))
  const y1 = Math.min(h - 1, Math.ceil(cy + radius))
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!bin[y * w + x]) continue
      sx += x
      sy += y
      n++
    }
  }
  if (n < 12) return null
  return { x: sx / n, y: sy / n }
}

export function detectMarks(image: ImageData): Quad | null {
  const w = image.width
  const h = image.height
  const bin = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const o = i * 4
    bin[i] = luminance(image.data[o], image.data[o + 1], image.data[o + 2]) < 72 ? 1 : 0
  }
  const mark = Math.max(8, Math.round(Math.min(w, h) * (MARK / TEMPLATE_W)))
  const search = mark * 2.4
  const guesses = [
    { x: mark * 0.9, y: mark * 0.9 },
    { x: w - mark * 0.9, y: mark * 0.9 },
    { x: mark * 0.9, y: h - mark * 0.9 },
    { x: w - mark * 0.9, y: h - mark * 0.9 },
  ]
  const found = guesses.map((g) => darkCentroid(bin, w, h, g.x, g.y, search))
  if (found.some((p) => !p)) return null
  const [tl, tr, bl, br] = found as Point[]
  return { tl, tr, bl, br }
}

/** 8 自由度单应：模板点 → 照片点。 */
export function homography(src: Point[], dst: Point[]): number[] | null {
  if (src.length !== 4 || dst.length !== 4) return null
  const A: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const s = src[i]!
    const d = dst[i]!
    A.push([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y])
    b.push(d.x)
    A.push([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y])
    b.push(d.y)
  }
  return solve(A, b)
}

function solve(A: number[][], b: number[]): number[] | null {
  const n = 8
  const m = A.map((row, i) => row.concat([b[i]!]))
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r]![col]!) > Math.abs(m[pivot]![col]!)) pivot = r
    }
    const swap = m[col]!
    m[col] = m[pivot]!
    m[pivot] = swap
    const diag = m[col]![col]!
    if (Math.abs(diag) < 1e-8) return null
    for (let c = col; c <= n; c++) m[col]![c]! /= diag
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = m[r]![col]!
      for (let c = col; c <= n; c++) m[r]![c]! -= f * m[col]![c]!
    }
  }
  return m.map((row) => row[n]!)
}

function applyH(H: number[], x: number, y: number): Point {
  const den = H[6]! * x + H[7]! * y + 1
  return {
    x: (H[0]! * x + H[1]! * y + H[2]!) / den,
    y: (H[3]! * x + H[4]! * y + H[5]!) / den,
  }
}

function sampleBilinear(img: ImageData, x: number, y: number): [number, number, number, number] {
  const w = img.width
  const h = img.height
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  if (x0 < 0 || y0 < 0 || x0 >= w - 1 || y0 >= h - 1) return [255, 250, 241, 255]
  const x1 = x0 + 1
  const y1 = y0 + 1
  const fx = x - x0
  const fy = y - y0
  const at = (xx: number, yy: number) => {
    const i = (yy * w + xx) * 4
    return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, img.data[i + 3]!] as const
  }
  const p00 = at(x0, y0)
  const p10 = at(x1, y0)
  const p01 = at(x0, y1)
  const p11 = at(x1, y1)
  const mix = (a: number, b: number, t: number) => a + (b - a) * t
  return [
    mix(mix(p00[0], p10[0], fx), mix(p01[0], p11[0], fx), fy),
    mix(mix(p00[1], p10[1], fx), mix(p01[1], p11[1], fx), fy),
    mix(mix(p00[2], p10[2], fx), mix(p01[2], p11[2], fx), fy),
    mix(mix(p00[3], p10[3], fx), mix(p01[3], p11[3], fx), fy),
  ]
}

function warpToTemplate(photo: ImageData, H: number[] | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = TEMPLATE_W
  canvas.height = TEMPLATE_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const out = ctx.createImageData(TEMPLATE_W, TEMPLATE_H)
  for (let y = 0; y < TEMPLATE_H; y++) {
    for (let x = 0; x < TEMPLATE_W; x++) {
      const p = H ? applyH(H, x, y) : { x: (x / TEMPLATE_W) * photo.width, y: (y / TEMPLATE_H) * photo.height }
      const [r, g, b, a] = sampleBilinear(photo, p.x, p.y)
      const i = (y * TEMPLATE_W + x) * 4
      out.data[i] = r
      out.data[i + 1] = g
      out.data[i + 2] = b
      out.data[i + 3] = a
    }
  }
  ctx.putImageData(out, 0, 0)
  return canvas
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function sampleRegionsFrom(canvas: HTMLCanvasElement, animal: AnimalId): Record<string, string> {
  const w = canvas.width
  const h = canvas.height
  const rCanvas = document.createElement('canvas')
  rCanvas.width = w
  rCanvas.height = h
  const rctx = rCanvas.getContext('2d')
  const cctx = canvas.getContext('2d')
  if (!rctx || !cctx) return {}
  drawRegions(animal, rctx, w, h)
  const map = rctx.getImageData(0, 0, w, h)
  const color = cctx.getImageData(0, 0, w, h)
  const sums: Record<number, { r: number; g: number; b: number; n: number }> = {}
  for (let i = 0; i < map.data.length; i += 4) {
    const id = map.data[i]
    if (!id || map.data[i + 3]! < 10) continue
    const acc = (sums[id] ??= { r: 0, g: 0, b: 0, n: 0 })
    acc.r += color.data[i]!
    acc.g += color.data[i + 1]!
    acc.b += color.data[i + 2]!
    acc.n++
  }
  const out: Record<string, string> = {}
  for (const [id, acc] of Object.entries(sums)) {
    const name = regionName(animal, Number(id))
    if (!name || acc.n < 8) continue
    out[name] = rgbToHex(acc.r / acc.n, acc.g / acc.n, acc.b / acc.n)
  }
  return out
}

export function mappedThumb(warped: HTMLCanvasElement, _animal: AnimalId): string {
  void _animal
  return bitmapThumb(warped)
}

function bitmapThumb(canvas: HTMLCanvasElement, maxW = 512): string {
  const scale = Math.min(1, maxW / Math.max(canvas.width, 1))
  if (scale >= 0.999) return canvas.toDataURL('image/png')
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(canvas.width * scale))
  out.height = Math.max(1, Math.round(canvas.height * scale))
  const ctx = out.getContext('2d')
  if (!ctx) return canvas.toDataURL('image/png')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(canvas, 0, 0, out.width, out.height)
  return out.toDataURL('image/png')
}

export function mapPhotoToTemplate(
  photo: ImageData,
  animal: AnimalId,
): { thumb: string; regionColors: Record<string, string>; aligned: boolean } {
  const marks = detectMarks(photo)
  const src = markCenters()
  let H: number[] | null = null
  if (marks) {
    H = homography([src.tl, src.tr, src.bl, src.br], [marks.tl, marks.tr, marks.bl, marks.br])
  }
  const warped = warpToTemplate(photo, H)
  const inner = document.createElement('canvas')
  inner.width = 720
  inner.height = 860
  const ictx = inner.getContext('2d')
  if (ictx) {
    const ox = (TEMPLATE_W - 720) / 2
    const oy = 88
    ictx.drawImage(warped, ox, oy, 720, 860, 0, 0, 720, 860)
  }
  return {
    thumb: bitmapThumb(inner),
    regionColors: sampleRegionsFrom(inner, animal),
    aligned: Boolean(H),
  }
}

export function imageDataFrom(source: CanvasImageSource, w?: number, h?: number): ImageData {
  const canvas = document.createElement('canvas')
  const sw = 'width' in source && typeof source.width === 'number' ? source.width : TEMPLATE_W
  const sh = 'height' in source && typeof source.height === 'number' ? source.height : TEMPLATE_H
  canvas.width = w || (typeof sw === 'number' ? sw : TEMPLATE_W)
  canvas.height = h || (typeof sh === 'number' ? sh : TEMPLATE_H)
  const ctx = canvas.getContext('2d')
  if (!ctx) return new ImageData(canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}
