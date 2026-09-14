/**
 * 儿童创作：官方线稿 + 填色分区。不是主机 3D 世界。
 * 涂色本轮廓在 coloring-book.ts，和 3D 身子分开，避免叠线。
 */
import type { AnimalId } from '../types'
import { ANIMAL_META } from '../types'
import { bookFrame, drawBookLines, drawBookRegions } from './coloring-book'

type Ctx = CanvasRenderingContext2D

interface Region {
  id: number
  name: string
}

const REGIONS: Record<AnimalId, Region[]> = {
  deer: [
    { id: 1, name: 'antlerL' },
    { id: 2, name: 'antlerR' },
    { id: 3, name: 'earL' },
    { id: 4, name: 'earR' },
    { id: 5, name: 'head' },
    { id: 6, name: 'neck' },
    { id: 7, name: 'body' },
    { id: 8, name: 'belly' },
    { id: 9, name: 'spot1' },
    { id: 10, name: 'spot2' },
    { id: 11, name: 'spot3' },
    { id: 12, name: 'legFL' },
    { id: 13, name: 'legFR' },
    { id: 14, name: 'legBL' },
    { id: 15, name: 'legBR' },
    { id: 16, name: 'tail' },
  ],
  tiger: [
    { id: 1, name: 'earL' },
    { id: 2, name: 'earR' },
    { id: 3, name: 'innerL' },
    { id: 4, name: 'innerR' },
    { id: 5, name: 'head' },
    { id: 6, name: 'muzzle' },
    { id: 7, name: 'body' },
    { id: 8, name: 'belly' },
    { id: 9, name: 'legFL' },
    { id: 10, name: 'legFR' },
    { id: 11, name: 'legBL' },
    { id: 12, name: 'legBR' },
    { id: 13, name: 'tail' },
  ],
  lion: [
    { id: 1, name: 'mane' },
    { id: 2, name: 'earL' },
    { id: 3, name: 'earR' },
    { id: 4, name: 'head' },
    { id: 5, name: 'muzzle' },
    { id: 6, name: 'body' },
    { id: 7, name: 'belly' },
    { id: 8, name: 'legFL' },
    { id: 9, name: 'legFR' },
    { id: 10, name: 'legBL' },
    { id: 11, name: 'legBR' },
    { id: 12, name: 'tail' },
    { id: 13, name: 'tuft' },
  ],
  fish: [
    { id: 1, name: 'body' },
    { id: 2, name: 'belly' },
    { id: 3, name: 'tail' },
    { id: 4, name: 'fin' },
    { id: 5, name: 'head' },
    { id: 6, name: 'stripe' },
  ],
  turtle: [
    { id: 1, name: 'shell' },
    { id: 2, name: 'scute' },
    { id: 3, name: 'head' },
    { id: 4, name: 'flipperFR' },
    { id: 5, name: 'flipperFL' },
    { id: 6, name: 'flipperBL' },
    { id: 7, name: 'flipperBR' },
    { id: 8, name: 'belly' },
  ],
  dolphin: [
    { id: 1, name: 'body' },
    { id: 2, name: 'belly' },
    { id: 3, name: 'snout' },
    { id: 4, name: 'fin' },
    { id: 5, name: 'tail' },
  ],
}

export function regionName(animal: AnimalId, id: number): string | null {
  return REGIONS[animal].find((r) => r.id === id)?.name ?? null
}

export function regionIdColor(id: number): string {
  return `rgb(${id},0,0)`
}

/** 陆地狮/鹿/虎用官方涂色本 PNG，不再画椭圆雪人。 */
export function officialLineArtSrc(animal: AnimalId): string | null {
  if (animal === 'lion' || animal === 'deer' || animal === 'tiger') return `/lineart/${animal}.png`
  return null
}

export function pickCardSrc(animal: AnimalId): string | null {
  if (animal === 'lion' || animal === 'deer' || animal === 'tiger') return `/picks/${animal}.png`
  return null
}

const artCache = new Map<string, HTMLImageElement>()

export function loadOfficialArt(src: string): Promise<HTMLImageElement> {
  const hit = artCache.get(src)
  if (hit && hit.complete && hit.naturalWidth > 0) return Promise.resolve(hit)
  return new Promise((resolve, reject) => {
    const img = hit || new Image()
    img.onload = () => {
      artCache.set(src, img)
      resolve(img)
    }
    img.onerror = () => reject(new Error('线稿打不开'))
    if (!hit) {
      artCache.set(src, img)
      img.src = src
    } else if (hit.complete && hit.naturalWidth > 0) resolve(hit)
  })
}

function fitImage(ctx: Ctx, img: CanvasImageSource, w: number, h: number): void {
  const iw = 'naturalWidth' in img && img.naturalWidth ? img.naturalWidth : (img as HTMLImageElement).width
  const ih = 'naturalHeight' in img && img.naturalHeight ? img.naturalHeight : (img as HTMLImageElement).height
  if (!iw || !ih) return
  const pad = Math.min(w, h) * 0.04
  const scale = Math.min((w - pad * 2) / iw, (h - pad * 2) / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

export function drawRegions(animal: AnimalId, ctx: Ctx, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h)
  if (officialLineArtSrc(animal)) return
  bookFrame(ctx, w, h, animal, () => drawBookRegions(animal, ctx))
}

export function drawLineArt(animal: AnimalId, ctx: Ctx, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h)
  const src = officialLineArtSrc(animal)
  if (src) {
    const img = artCache.get(src)
    if (img && img.complete && img.naturalWidth > 0) fitImage(ctx, img, w, h)
    return
  }
  bookFrame(ctx, w, h, animal, () => drawBookLines(animal, ctx))
}

export async function drawLineArtReady(animal: AnimalId, ctx: Ctx, w: number, h: number): Promise<void> {
  const src = officialLineArtSrc(animal)
  if (src) await loadOfficialArt(src).catch(() => undefined)
  drawLineArt(animal, ctx, w, h)
}

export function drawPreview(
  animal: AnimalId,
  ctx: Ctx,
  w: number,
  h: number,
  painted?: Record<string, string>,
): void {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fffaf1'
  ctx.fillRect(0, 0, w, h)
  const pick = pickCardSrc(animal)
  if (pick) {
    const img = artCache.get(pick)
    if (img && img.complete && img.naturalWidth > 0) fitImage(ctx, img, w, h)
    else {
      const src = officialLineArtSrc(animal)
      const line = src ? artCache.get(src) : undefined
      if (line && line.complete && line.naturalWidth > 0) fitImage(ctx, line, w, h)
    }
    return
  }
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const rctx = tmp.getContext('2d')
  if (!rctx) return
  drawRegions(animal, rctx, w, h)
  const data = rctx.getImageData(0, 0, w, h)
  const out = ctx.getImageData(0, 0, w, h)
  const defaults = ANIMAL_META[animal].defaults
  const list = REGIONS[animal]
  for (let i = 0; i < data.data.length; i += 4) {
    const id = data.data[i]
    if (!id || data.data[i + 3] < 10) continue
    const name = list.find((r) => r.id === id)?.name
    const hex = (name && (painted?.[name] || defaults[name])) || '#e7d3b0'
    const rgb = hexToRgb(hex)
    out.data[i] = rgb[0]
    out.data[i + 1] = rgb[1]
    out.data[i + 2] = rgb[2]
    out.data[i + 3] = 255
  }
  ctx.putImageData(out, 0, 0)
  drawLineArt(animal, ctx, w, h)
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
