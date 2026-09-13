import type { AnimalId } from './types'
import { ANIMAL_META } from './types'

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
}

export function regionName(animal: AnimalId, id: number): string | null {
  return REGIONS[animal].find((r) => r.id === id)?.name ?? null
}

export function regionIdColor(id: number): string {
  return `rgb(${id},0,0)`
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
}

function fillRegion(ctx: Ctx, id: number, draw: () => void): void {
  ctx.save()
  ctx.fillStyle = regionIdColor(id)
  draw()
  ctx.fill()
  ctx.restore()
}

function strokeLine(ctx: Ctx, draw: () => void, width = 7): void {
  ctx.save()
  ctx.strokeStyle = '#1a120c'
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  draw()
  ctx.stroke()
  ctx.restore()
}

function face(ctx: Ctx, hx: number, hy: number, s: number): void {
  ctx.save()
  ctx.fillStyle = '#1a120c'
  ellipse(ctx, hx - s * 0.22, hy - s * 0.05, s * 0.07, s * 0.09)
  ctx.fill()
  ellipse(ctx, hx + s * 0.22, hy - s * 0.05, s * 0.07, s * 0.09)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(hx, hy + s * 0.16, s * 0.07, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.strokeStyle = '#1a120c'
  ctx.lineWidth = 5
  ctx.stroke()
  ctx.restore()
}

export function drawRegions(animal: AnimalId, ctx: Ctx, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h)
  const cx = w / 2
  if (animal === 'deer') drawDeerRegions(ctx, cx, h)
  if (animal === 'tiger') drawTigerRegions(ctx, cx, h)
  if (animal === 'lion') drawLionRegions(ctx, cx, h)
}

export function drawLineArt(animal: AnimalId, ctx: Ctx, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h)
  const cx = w / 2
  if (animal === 'deer') drawDeerLines(ctx, cx, h)
  if (animal === 'tiger') drawTigerLines(ctx, cx, h)
  if (animal === 'lion') drawLionLines(ctx, cx, h)
}

export function drawPreview(animal: AnimalId, ctx: Ctx, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fffaf1'
  ctx.fillRect(0, 0, w, h)
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
    const hex = (name && defaults[name]) || '#e7d3b0'
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
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function drawDeerRegions(ctx: Ctx, cx: number, h: number): void {
  const y = h * 0.52
  fillRegion(ctx, 16, () => ellipse(ctx, cx + 78, y - 10, 22, 14))
  fillRegion(ctx, 14, () => ellipse(ctx, cx - 38, y + 118, 16, 52))
  fillRegion(ctx, 15, () => ellipse(ctx, cx + 38, y + 118, 16, 52))
  fillRegion(ctx, 12, () => ellipse(ctx, cx - 28, y + 108, 16, 58))
  fillRegion(ctx, 13, () => ellipse(ctx, cx + 28, y + 108, 16, 58))
  fillRegion(ctx, 7, () => ellipse(ctx, cx, y + 18, 92, 78))
  fillRegion(ctx, 8, () => ellipse(ctx, cx, y + 36, 52, 42))
  fillRegion(ctx, 9, () => ellipse(ctx, cx - 28, y + 8, 12, 10))
  fillRegion(ctx, 10, () => ellipse(ctx, cx + 24, y - 4, 11, 9))
  fillRegion(ctx, 11, () => ellipse(ctx, cx + 8, y + 22, 10, 8))
  fillRegion(ctx, 6, () => ellipse(ctx, cx, y - 58, 32, 36))
  fillRegion(ctx, 3, () => ellipse(ctx, cx - 48, y - 118, 18, 26))
  fillRegion(ctx, 4, () => ellipse(ctx, cx + 48, y - 118, 18, 26))
  fillRegion(ctx, 5, () => ellipse(ctx, cx, y - 102, 52, 48))
  ctx.save()
  ctx.translate(cx - 34, y - 148)
  ctx.rotate(-0.5)
  fillRegion(ctx, 1, () => {
    ellipse(ctx, 0, 0, 10, 38)
    ellipse(ctx, -18, -18, 8, 22)
  })
  ctx.restore()
  ctx.save()
  ctx.translate(cx + 34, y - 148)
  ctx.rotate(0.5)
  fillRegion(ctx, 2, () => {
    ellipse(ctx, 0, 0, 10, 38)
    ellipse(ctx, 18, -18, 8, 22)
  })
  ctx.restore()
}

function drawDeerLines(ctx: Ctx, cx: number, h: number): void {
  const y = h * 0.52
  const line = (d: () => void) => strokeLine(ctx, d, 7)
  line(() => ellipse(ctx, cx + 78, y - 10, 22, 14))
  line(() => ellipse(ctx, cx - 38, y + 118, 16, 52))
  line(() => ellipse(ctx, cx + 38, y + 118, 16, 52))
  line(() => ellipse(ctx, cx - 28, y + 108, 16, 58))
  line(() => ellipse(ctx, cx + 28, y + 108, 16, 58))
  line(() => ellipse(ctx, cx, y + 18, 92, 78))
  line(() => ellipse(ctx, cx, y + 36, 52, 42))
  line(() => ellipse(ctx, cx - 28, y + 8, 12, 10))
  line(() => ellipse(ctx, cx + 24, y - 4, 11, 9))
  line(() => ellipse(ctx, cx + 8, y + 22, 10, 8))
  line(() => ellipse(ctx, cx, y - 58, 32, 36))
  line(() => ellipse(ctx, cx - 48, y - 118, 18, 26))
  line(() => ellipse(ctx, cx + 48, y - 118, 18, 26))
  line(() => ellipse(ctx, cx, y - 102, 52, 48))
  ctx.save()
  ctx.translate(cx - 34, y - 148)
  ctx.rotate(-0.5)
  line(() => {
    ellipse(ctx, 0, 0, 10, 38)
    ellipse(ctx, -18, -18, 8, 22)
  })
  ctx.restore()
  ctx.save()
  ctx.translate(cx + 34, y - 148)
  ctx.rotate(0.5)
  line(() => {
    ellipse(ctx, 0, 0, 10, 38)
    ellipse(ctx, 18, -18, 8, 22)
  })
  ctx.restore()
  face(ctx, cx, y - 102, 48)
}

function drawTigerRegions(ctx: Ctx, cx: number, h: number): void {
  const y = h * 0.55
  ctx.save()
  ctx.translate(cx + 88, y + 8)
  ctx.rotate(0.6)
  fillRegion(ctx, 13, () => ellipse(ctx, 0, 0, 14, 70))
  ctx.restore()
  fillRegion(ctx, 11, () => ellipse(ctx, cx - 40, y + 108, 18, 48))
  fillRegion(ctx, 12, () => ellipse(ctx, cx + 36, y + 108, 18, 48))
  fillRegion(ctx, 9, () => ellipse(ctx, cx - 22, y + 100, 18, 54))
  fillRegion(ctx, 10, () => ellipse(ctx, cx + 20, y + 100, 18, 54))
  fillRegion(ctx, 7, () => ellipse(ctx, cx, y + 12, 100, 72))
  fillRegion(ctx, 8, () => ellipse(ctx, cx, y + 28, 58, 42))
  fillRegion(ctx, 1, () => ellipse(ctx, cx - 58, y - 118, 22, 28))
  fillRegion(ctx, 2, () => ellipse(ctx, cx + 58, y - 118, 22, 28))
  fillRegion(ctx, 3, () => ellipse(ctx, cx - 58, y - 114, 12, 16))
  fillRegion(ctx, 4, () => ellipse(ctx, cx + 58, y - 114, 12, 16))
  fillRegion(ctx, 5, () => ellipse(ctx, cx, y - 88, 70, 62))
  fillRegion(ctx, 6, () => ellipse(ctx, cx, y - 64, 42, 28))
}

function drawTigerLines(ctx: Ctx, cx: number, h: number): void {
  const y = h * 0.55
  const line = (d: () => void) => strokeLine(ctx, d, 7)
  ctx.save()
  ctx.translate(cx + 88, y + 8)
  ctx.rotate(0.6)
  line(() => ellipse(ctx, 0, 0, 14, 70))
  ctx.restore()
  line(() => ellipse(ctx, cx - 40, y + 108, 18, 48))
  line(() => ellipse(ctx, cx + 36, y + 108, 18, 48))
  line(() => ellipse(ctx, cx - 22, y + 100, 18, 54))
  line(() => ellipse(ctx, cx + 20, y + 100, 18, 54))
  line(() => ellipse(ctx, cx, y + 12, 100, 72))
  line(() => ellipse(ctx, cx, y + 28, 58, 42))
  line(() => ellipse(ctx, cx - 58, y - 118, 22, 28))
  line(() => ellipse(ctx, cx + 58, y - 118, 22, 28))
  line(() => ellipse(ctx, cx, y - 88, 70, 62))
  line(() => ellipse(ctx, cx, y - 64, 42, 28))
  face(ctx, cx, y - 92, 52)
  ctx.save()
  ctx.strokeStyle = '#1a120c'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  for (const [x0, y0, x1, y1] of [
    [cx - 46, y - 8, cx - 18, y + 8],
    [cx + 46, y - 8, cx + 18, y + 8],
    [cx - 50, y + 22, cx - 16, y + 34],
    [cx + 50, y + 22, cx + 16, y + 34],
  ]) {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  }
  ctx.restore()
}

function drawLionRegions(ctx: Ctx, cx: number, h: number): void {
  const y = h * 0.54
  ctx.save()
  ctx.translate(cx + 86, y + 20)
  ctx.rotate(0.5)
  fillRegion(ctx, 12, () => ellipse(ctx, 0, 0, 12, 62))
  ctx.restore()
  fillRegion(ctx, 13, () => ellipse(ctx, cx + 118, y + 58, 18, 16))
  fillRegion(ctx, 10, () => ellipse(ctx, cx - 38, y + 112, 18, 48))
  fillRegion(ctx, 11, () => ellipse(ctx, cx + 34, y + 112, 18, 48))
  fillRegion(ctx, 8, () => ellipse(ctx, cx - 22, y + 104, 18, 54))
  fillRegion(ctx, 9, () => ellipse(ctx, cx + 18, y + 104, 18, 54))
  fillRegion(ctx, 6, () => ellipse(ctx, cx, y + 28, 92, 70))
  fillRegion(ctx, 7, () => ellipse(ctx, cx, y + 42, 52, 40))
  fillRegion(ctx, 1, () => ellipse(ctx, cx, y - 96, 108, 100))
  fillRegion(ctx, 2, () => ellipse(ctx, cx - 42, y - 132, 16, 20))
  fillRegion(ctx, 3, () => ellipse(ctx, cx + 42, y - 132, 16, 20))
  fillRegion(ctx, 4, () => ellipse(ctx, cx, y - 92, 58, 54))
  fillRegion(ctx, 5, () => ellipse(ctx, cx, y - 72, 36, 24))
}

function drawLionLines(ctx: Ctx, cx: number, h: number): void {
  const y = h * 0.54
  const line = (d: () => void) => strokeLine(ctx, d, 7)
  ctx.save()
  ctx.translate(cx + 86, y + 20)
  ctx.rotate(0.5)
  line(() => ellipse(ctx, 0, 0, 12, 62))
  ctx.restore()
  line(() => ellipse(ctx, cx + 118, y + 58, 18, 16))
  line(() => ellipse(ctx, cx - 38, y + 112, 18, 48))
  line(() => ellipse(ctx, cx + 34, y + 112, 18, 48))
  line(() => ellipse(ctx, cx - 22, y + 104, 18, 54))
  line(() => ellipse(ctx, cx + 18, y + 104, 18, 54))
  line(() => ellipse(ctx, cx, y + 28, 92, 70))
  line(() => ellipse(ctx, cx, y + 42, 52, 40))
  line(() => ellipse(ctx, cx, y - 96, 108, 100))
  line(() => ellipse(ctx, cx, y - 92, 58, 54))
  line(() => ellipse(ctx, cx, y - 72, 36, 24))
  face(ctx, cx, y - 96, 50)
}
