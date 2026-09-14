/**
 * 儿童创作：官方线稿 + 填色分区。不是主机 3D 世界。
 */
import type { AnimalId } from '../types'
import { ANIMAL_META } from '../types'

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
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function drawDeerRegions(ctx: Ctx, cx: number, h: number): void {
  const y = h * 0.56
  fillRegion(ctx, 14, () => ellipse(ctx, cx - 78, y + 100, 11, 60))
  fillRegion(ctx, 15, () => ellipse(ctx, cx - 48, y + 108, 11, 54))
  fillRegion(ctx, 12, () => ellipse(ctx, cx + 42, y + 104, 10, 58))
  fillRegion(ctx, 13, () => ellipse(ctx, cx + 70, y + 94, 10, 64))
  fillRegion(ctx, 16, () => ellipse(ctx, cx - 118, y - 6, 18, 12))
  fillRegion(ctx, 7, () => ellipse(ctx, cx - 8, y + 10, 122, 54))
  fillRegion(ctx, 8, () => ellipse(ctx, cx + 6, y + 32, 72, 30))
  fillRegion(ctx, 9, () => ellipse(ctx, cx - 36, y - 2, 11, 9))
  fillRegion(ctx, 10, () => ellipse(ctx, cx + 8, y - 10, 10, 8))
  fillRegion(ctx, 11, () => ellipse(ctx, cx + 40, y + 8, 9, 7))
  ctx.save()
  ctx.translate(cx + 78, y - 36)
  ctx.rotate(-0.75)
  fillRegion(ctx, 6, () => ellipse(ctx, 0, 0, 20, 52))
  ctx.restore()
  fillRegion(ctx, 3, () => ellipse(ctx, cx + 92, y - 124, 12, 24))
  fillRegion(ctx, 4, () => ellipse(ctx, cx + 114, y - 128, 12, 22))
  ctx.save()
  ctx.translate(cx + 118, y - 88)
  ctx.rotate(-0.28)
  fillRegion(ctx, 5, () => ellipse(ctx, 0, 0, 46, 28))
  ctx.restore()
  ctx.save()
  ctx.translate(cx + 96, y - 132)
  fillRegion(ctx, 1, () => {
    ellipse(ctx, -6, -28, 7, 36)
    ellipse(ctx, -26, -44, 6, 20)
    ellipse(ctx, 6, -52, 5, 18)
  })
  ctx.restore()
  ctx.save()
  ctx.translate(cx + 116, y - 134)
  fillRegion(ctx, 2, () => {
    ellipse(ctx, 10, -30, 7, 38)
    ellipse(ctx, 28, -48, 6, 20)
    ellipse(ctx, 6, -54, 5, 16)
  })
  ctx.restore()
}

function drawDeerLines(ctx: Ctx, cx: number, h: number): void {
  const y = h * 0.56
  const line = (d: () => void) => strokeLine(ctx, d, 7)
  line(() => ellipse(ctx, cx - 78, y + 100, 11, 60))
  line(() => ellipse(ctx, cx - 48, y + 108, 11, 54))
  line(() => ellipse(ctx, cx + 42, y + 104, 10, 58))
  line(() => ellipse(ctx, cx + 70, y + 94, 10, 64))
  line(() => ellipse(ctx, cx - 118, y - 6, 18, 12))
  line(() => ellipse(ctx, cx - 8, y + 10, 122, 54))
  line(() => ellipse(ctx, cx + 6, y + 32, 72, 30))
  ctx.save()
  ctx.translate(cx + 78, y - 36)
  ctx.rotate(-0.75)
  line(() => ellipse(ctx, 0, 0, 20, 52))
  ctx.restore()
  line(() => ellipse(ctx, cx + 92, y - 124, 12, 24))
  line(() => ellipse(ctx, cx + 114, y - 128, 12, 22))
  ctx.save()
  ctx.translate(cx + 118, y - 88)
  ctx.rotate(-0.28)
  line(() => ellipse(ctx, 0, 0, 46, 28))
  ctx.restore()
  ctx.save()
  ctx.translate(cx + 96, y - 132)
  line(() => {
    ellipse(ctx, -6, -28, 7, 36)
    ellipse(ctx, -26, -44, 6, 20)
    ellipse(ctx, 6, -52, 5, 18)
  })
  ctx.restore()
  ctx.save()
  ctx.translate(cx + 116, y - 134)
  line(() => {
    ellipse(ctx, 10, -30, 7, 38)
    ellipse(ctx, 28, -48, 6, 20)
    ellipse(ctx, 6, -54, 5, 16)
  })
  ctx.restore()
  face(ctx, cx + 122, y - 92, 36)
}

function drawTigerRegions(ctx: Ctx, cx: number, h: number): void {
  const y = h * 0.58
  ctx.save()
  ctx.translate(cx - 120, y + 8)
  ctx.rotate(-0.9)
  fillRegion(ctx, 13, () => ellipse(ctx, 0, 0, 12, 72))
  ctx.restore()
  fillRegion(ctx, 11, () => ellipse(ctx, cx - 70, y + 100, 16, 52))
  fillRegion(ctx, 12, () => ellipse(ctx, cx - 38, y + 108, 16, 48))
  fillRegion(ctx, 9, () => ellipse(ctx, cx + 48, y + 102, 16, 54))
  fillRegion(ctx, 10, () => ellipse(ctx, cx + 78, y + 94, 16, 58))
  fillRegion(ctx, 7, () => ellipse(ctx, cx, y + 16, 130, 58))
  fillRegion(ctx, 8, () => ellipse(ctx, cx + 10, y + 36, 78, 34))
  fillRegion(ctx, 1, () => ellipse(ctx, cx + 108, y - 108, 18, 26))
  fillRegion(ctx, 2, () => ellipse(ctx, cx + 138, y - 104, 18, 26))
  fillRegion(ctx, 3, () => ellipse(ctx, cx + 108, y - 104, 10, 14))
  fillRegion(ctx, 4, () => ellipse(ctx, cx + 138, y - 100, 10, 14))
  fillRegion(ctx, 5, () => ellipse(ctx, cx + 122, y - 70, 58, 52))
  fillRegion(ctx, 6, () => ellipse(ctx, cx + 148, y - 52, 32, 22))
}

function drawTigerLines(ctx: Ctx, cx: number, h: number): void {
  const y = h * 0.58
  const line = (d: () => void) => strokeLine(ctx, d, 7)
  ctx.save()
  ctx.translate(cx - 120, y + 8)
  ctx.rotate(-0.9)
  line(() => ellipse(ctx, 0, 0, 12, 72))
  ctx.restore()
  line(() => ellipse(ctx, cx - 70, y + 100, 16, 52))
  line(() => ellipse(ctx, cx - 38, y + 108, 16, 48))
  line(() => ellipse(ctx, cx + 48, y + 102, 16, 54))
  line(() => ellipse(ctx, cx + 78, y + 94, 16, 58))
  line(() => ellipse(ctx, cx, y + 16, 130, 58))
  line(() => ellipse(ctx, cx + 10, y + 36, 78, 34))
  line(() => ellipse(ctx, cx + 108, y - 108, 18, 26))
  line(() => ellipse(ctx, cx + 138, y - 104, 18, 26))
  line(() => ellipse(ctx, cx + 122, y - 70, 58, 52))
  line(() => ellipse(ctx, cx + 148, y - 52, 32, 22))
  face(ctx, cx + 128, y - 74, 44)
  ctx.save()
  ctx.strokeStyle = '#1a120c'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  for (const [x0, y0, x1, y1] of [
    [cx - 40, y - 8, cx - 20, y + 18],
    [cx - 8, y - 16, cx + 8, y + 20],
    [cx + 24, y - 10, cx + 36, y + 16],
    [cx + 52, y - 4, cx + 60, y + 18],
  ]) {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo((x0 + x1) / 2 + 8, (y0 + y1) / 2, x1, y1)
    ctx.stroke()
  }
  ctx.restore()
}

function drawLionRegions(ctx: Ctx, cx: number, h: number): void {
  const y = h * 0.56
  ctx.save()
  ctx.translate(cx - 118, y + 24)
  ctx.rotate(-0.7)
  fillRegion(ctx, 12, () => ellipse(ctx, 0, 0, 12, 64))
  ctx.restore()
  fillRegion(ctx, 13, () => ellipse(ctx, cx - 148, y + 70, 22, 16))
  fillRegion(ctx, 10, () => ellipse(ctx, cx - 64, y + 108, 16, 50))
  fillRegion(ctx, 11, () => ellipse(ctx, cx - 32, y + 114, 16, 46))
  fillRegion(ctx, 8, () => ellipse(ctx, cx + 36, y + 106, 16, 52))
  fillRegion(ctx, 9, () => ellipse(ctx, cx + 64, y + 98, 16, 56))
  fillRegion(ctx, 6, () => ellipse(ctx, cx - 8, y + 28, 108, 58))
  fillRegion(ctx, 7, () => ellipse(ctx, cx, y + 46, 64, 32))
  fillRegion(ctx, 1, () => {
    ellipse(ctx, cx + 108, y - 78, 92, 88)
    ellipse(ctx, cx + 70, y - 110, 36, 36)
    ellipse(ctx, cx + 148, y - 108, 34, 34)
    ellipse(ctx, cx + 108, y - 140, 40, 28)
  })
  fillRegion(ctx, 2, () => ellipse(ctx, cx + 88, y - 128, 14, 18))
  fillRegion(ctx, 3, () => ellipse(ctx, cx + 126, y - 128, 14, 18))
  fillRegion(ctx, 4, () => ellipse(ctx, cx + 108, y - 78, 48, 44))
  fillRegion(ctx, 5, () => ellipse(ctx, cx + 128, y - 58, 28, 20))
}

function drawLionLines(ctx: Ctx, cx: number, h: number): void {
  const y = h * 0.56
  const line = (d: () => void) => strokeLine(ctx, d, 7)
  ctx.save()
  ctx.translate(cx - 118, y + 24)
  ctx.rotate(-0.7)
  line(() => ellipse(ctx, 0, 0, 12, 64))
  ctx.restore()
  line(() => ellipse(ctx, cx - 148, y + 70, 22, 16))
  line(() => ellipse(ctx, cx - 64, y + 108, 16, 50))
  line(() => ellipse(ctx, cx - 32, y + 114, 16, 46))
  line(() => ellipse(ctx, cx + 36, y + 106, 16, 52))
  line(() => ellipse(ctx, cx + 64, y + 98, 16, 56))
  line(() => ellipse(ctx, cx - 8, y + 28, 108, 58))
  line(() => ellipse(ctx, cx, y + 46, 64, 32))
  line(() => {
    ellipse(ctx, cx + 108, y - 78, 92, 88)
    ellipse(ctx, cx + 70, y - 110, 36, 36)
    ellipse(ctx, cx + 148, y - 108, 34, 34)
    ellipse(ctx, cx + 108, y - 140, 40, 28)
  })
  line(() => ellipse(ctx, cx + 108, y - 78, 48, 44))
  line(() => ellipse(ctx, cx + 128, y - 58, 28, 20))
  face(ctx, cx + 112, y - 82, 42)
}
