/**
 * 儿童创作：官方线稿 + 填色分区。不是主机 3D 世界。
 * 侧视真动物轮廓，和 3D 身子同一套点，卡片里留边，不把头角裁掉。
 */
import type { AnimalId } from '../types'
import { ANIMAL_META } from '../types'
import {
  DEER_ANTLER_L_BEAM,
  DEER_ANTLER_R_BEAM,
  DEER_BELLY,
  DEER_BODY,
  DEER_EAR_L,
  DEER_EAR_R,
  DEER_HEAD,
  DEER_NECK,
  DEER_TAIL,
  FRAME,
  LION_BELLY,
  LION_BODY,
  LION_EAR_L,
  LION_EAR_R,
  LION_HEAD,
  LION_MANE,
  LION_MUZZLE,
  LION_TUFT,
  TIGER_BELLY,
  TIGER_BODY,
  TIGER_EAR_L,
  TIGER_EAR_R,
  TIGER_HEAD,
  TIGER_MUZZLE,
  sampleClosed,
  type Ring,
} from '../silhouettes'

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

function strokeLine(ctx: Ctx, draw: () => void, width = 0.03): void {
  ctx.save()
  ctx.strokeStyle = '#1a120c'
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  draw()
  ctx.stroke()
  ctx.restore()
}

function poly(ctx: Ctx, pts: Ring): void {
  const s = pts.length > 4 ? sampleClosed(pts, 56) : pts
  if (!s.length) return
  ctx.beginPath()
  ctx.moveTo(s[0]![0], s[0]![1])
  for (let i = 1; i < s.length; i++) ctx.lineTo(s[i]![0], s[i]![1])
  ctx.closePath()
}

function fillPoly(ctx: Ctx, id: number, pts: Ring): void {
  fillRegion(ctx, id, () => poly(ctx, pts))
}

function strokePoly(ctx: Ctx, pts: Ring, width = 0.03): void {
  strokeLine(ctx, () => poly(ctx, pts), width)
}

function fillStroke(ctx: Ctx, id: number, draw: () => void, width: number): void {
  ctx.save()
  ctx.strokeStyle = regionIdColor(id)
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  draw()
  ctx.stroke()
  ctx.restore()
}

function path(ctx: Ctx, pts: Ring): void {
  if (!pts.length) return
  ctx.beginPath()
  ctx.moveTo(pts[0]![0], pts[0]![1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1])
}

function face(ctx: Ctx, hx: number, hy: number, s: number): void {
  ctx.save()
  ctx.fillStyle = '#1a120c'
  ellipse(ctx, hx - s * 0.22, hy + s * 0.04, s * 0.07, s * 0.09)
  ctx.fill()
  ellipse(ctx, hx + s * 0.22, hy + s * 0.04, s * 0.07, s * 0.09)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(hx, hy - s * 0.12, s * 0.07, 1.15 * Math.PI, 1.85 * Math.PI)
  ctx.strokeStyle = '#1a120c'
  ctx.lineWidth = 0.02
  ctx.stroke()
  ctx.restore()
}

function animalFrame(ctx: Ctx, w: number, h: number, animal: AnimalId, fn: () => void): void {
  const b = FRAME[animal]
  const pad = Math.min(w, h) * 0.08
  const scale = Math.min((w - pad * 2) / (b.maxX - b.minX), (h - pad * 2) / (b.maxY - b.minY))
  const mx = (b.minX + b.maxX) / 2
  const my = (b.minY + b.maxY) / 2
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.scale(scale, -scale)
  ctx.translate(-mx, -my)
  fn()
  ctx.restore()
}

export function drawRegions(animal: AnimalId, ctx: Ctx, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h)
  animalFrame(ctx, w, h, animal, () => {
    if (animal === 'deer') drawDeerRegions(ctx)
    if (animal === 'tiger') drawTigerRegions(ctx)
    if (animal === 'lion') drawLionRegions(ctx)
  })
}

export function drawLineArt(animal: AnimalId, ctx: Ctx, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h)
  animalFrame(ctx, w, h, animal, () => {
    if (animal === 'deer') drawDeerLines(ctx)
    if (animal === 'tiger') drawTigerLines(ctx)
    if (animal === 'lion') drawLionLines(ctx)
  })
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
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function deerLegs(): { id: number; pts: Ring }[] {
  return [
    { id: 14, pts: [[-0.46, 0.62], [-0.5, 0.02]] },
    { id: 15, pts: [[-0.32, 0.62], [-0.26, 0.02]] },
    { id: 12, pts: [[0.4, 0.56], [0.48, 0.02]] },
    { id: 13, pts: [[0.52, 0.56], [0.5, 0.02]] },
  ]
}

function drawDeerRegions(ctx: Ctx): void {
  for (const leg of deerLegs()) {
    fillStroke(ctx, leg.id, () => path(ctx, leg.pts), 0.07)
  }
  fillPoly(ctx, 16, DEER_TAIL)
  fillPoly(ctx, 7, DEER_BODY)
  fillPoly(ctx, 8, DEER_BELLY)
  fillRegion(ctx, 9, () => ellipse(ctx, 0.05, 0.95, 0.06, 0.045))
  fillRegion(ctx, 10, () => ellipse(ctx, 0.28, 1.02, 0.05, 0.04))
  fillRegion(ctx, 11, () => ellipse(ctx, -0.12, 1.08, 0.05, 0.038))
  fillPoly(ctx, 6, DEER_NECK)
  fillPoly(ctx, 5, DEER_HEAD)
  fillPoly(ctx, 3, DEER_EAR_L)
  fillPoly(ctx, 4, DEER_EAR_R)
  for (const beam of DEER_ANTLER_L_BEAM) fillStroke(ctx, 1, () => path(ctx, beam), 0.05)
  for (const beam of DEER_ANTLER_R_BEAM) fillStroke(ctx, 2, () => path(ctx, beam), 0.05)
}

function drawDeerLines(ctx: Ctx): void {
  const line = (d: () => void, w = 0.03) => strokeLine(ctx, d, w)
  for (const leg of deerLegs()) line(() => path(ctx, leg.pts), 0.055)
  strokePoly(ctx, DEER_TAIL)
  strokePoly(ctx, DEER_BODY, 0.034)
  strokePoly(ctx, DEER_BELLY, 0.02)
  line(() => ellipse(ctx, 0.05, 0.95, 0.06, 0.045), 0.018)
  line(() => ellipse(ctx, 0.28, 1.02, 0.05, 0.04), 0.018)
  line(() => ellipse(ctx, -0.12, 1.08, 0.05, 0.038), 0.018)
  strokePoly(ctx, DEER_NECK, 0.024)
  strokePoly(ctx, DEER_HEAD, 0.028)
  strokePoly(ctx, DEER_EAR_L)
  strokePoly(ctx, DEER_EAR_R)
  for (const beam of DEER_ANTLER_L_BEAM) line(() => path(ctx, beam), 0.04)
  for (const beam of DEER_ANTLER_R_BEAM) line(() => path(ctx, beam), 0.04)
  face(ctx, 1.02, 1.36, 0.16)
}

function catLegs(backShift = 0): { id: number; pts: Ring }[] {
  return [
    { id: 11, pts: [[-0.52 + backShift, 0.48], [-0.56 + backShift, 0.02]] },
    { id: 12, pts: [[-0.36 + backShift, 0.48], [-0.3 + backShift, 0.02]] },
    { id: 9, pts: [[0.46, 0.44], [0.52, 0.02]] },
    { id: 10, pts: [[0.6, 0.44], [0.58, 0.02]] },
  ]
}

function drawTigerRegions(ctx: Ctx): void {
  fillStroke(ctx, 13, () => {
    ctx.beginPath()
    ctx.moveTo(-0.74, 0.72)
    ctx.quadraticCurveTo(-1.05, 0.98, -1.26, 0.48)
  }, 0.08)
  for (const leg of catLegs()) fillStroke(ctx, leg.id, () => path(ctx, leg.pts), 0.1)
  fillPoly(ctx, 7, TIGER_BODY)
  fillPoly(ctx, 8, TIGER_BELLY)
  fillPoly(ctx, 1, TIGER_EAR_L)
  fillPoly(ctx, 2, TIGER_EAR_R)
  fillRegion(ctx, 3, () => ellipse(ctx, 0.84, 1.18, 0.05, 0.06))
  fillRegion(ctx, 4, () => ellipse(ctx, 1.0, 1.16, 0.05, 0.06))
  fillPoly(ctx, 5, TIGER_HEAD)
  fillPoly(ctx, 6, TIGER_MUZZLE)
}

function drawTigerLines(ctx: Ctx): void {
  strokeLine(ctx, () => {
    ctx.beginPath()
    ctx.moveTo(-0.74, 0.72)
    ctx.quadraticCurveTo(-1.05, 0.98, -1.26, 0.48)
  }, 0.045)
  for (const leg of catLegs()) strokeLine(ctx, () => path(ctx, leg.pts), 0.07)
  strokePoly(ctx, TIGER_BODY, 0.032)
  strokePoly(ctx, TIGER_BELLY, 0.022)
  strokePoly(ctx, TIGER_EAR_L)
  strokePoly(ctx, TIGER_EAR_R)
  strokePoly(ctx, TIGER_HEAD)
  strokePoly(ctx, TIGER_MUZZLE)
  face(ctx, 1.0, 0.96, 0.22)
  ctx.save()
  ctx.strokeStyle = '#1a120c'
  ctx.lineWidth = 0.028
  ctx.lineCap = 'round'
  for (const x of [-0.4, -0.18, 0.04, 0.26, 0.44]) {
    ctx.beginPath()
    ctx.moveTo(x, 0.92)
    ctx.quadraticCurveTo(x + 0.06, 0.7, x - 0.02, 0.52)
    ctx.stroke()
  }
  ctx.restore()
}

function lionLegs(): { id: number; pts: Ring }[] {
  return [
    { id: 10, pts: [[-0.48, 0.48], [-0.52, 0.02]] },
    { id: 11, pts: [[-0.32, 0.48], [-0.26, 0.02]] },
    { id: 8, pts: [[0.4, 0.46], [0.46, 0.02]] },
    { id: 9, pts: [[0.54, 0.46], [0.52, 0.02]] },
  ]
}

function drawLionRegions(ctx: Ctx): void {
  fillStroke(ctx, 12, () => {
    ctx.beginPath()
    ctx.moveTo(-0.68, 0.72)
    ctx.quadraticCurveTo(-0.98, 0.94, -1.16, 0.62)
  }, 0.07)
  fillPoly(ctx, 13, LION_TUFT)
  for (const leg of lionLegs()) fillStroke(ctx, leg.id, () => path(ctx, leg.pts), 0.1)
  fillPoly(ctx, 6, LION_BODY)
  fillPoly(ctx, 7, LION_BELLY)
  fillPoly(ctx, 1, LION_MANE)
  fillPoly(ctx, 2, LION_EAR_L)
  fillPoly(ctx, 3, LION_EAR_R)
  fillPoly(ctx, 4, LION_HEAD)
  fillPoly(ctx, 5, LION_MUZZLE)
}

function drawLionLines(ctx: Ctx): void {
  strokeLine(ctx, () => {
    ctx.beginPath()
    ctx.moveTo(-0.68, 0.72)
    ctx.quadraticCurveTo(-0.98, 0.94, -1.16, 0.62)
  }, 0.04)
  strokePoly(ctx, LION_TUFT)
  for (const leg of lionLegs()) strokeLine(ctx, () => path(ctx, leg.pts), 0.07)
  strokePoly(ctx, LION_BODY, 0.032)
  strokePoly(ctx, LION_BELLY, 0.022)
  strokePoly(ctx, LION_MANE, 0.034)
  strokePoly(ctx, LION_HEAD)
  strokePoly(ctx, LION_MUZZLE)
  face(ctx, 0.94, 0.96, 0.2)
}
