/**
 * 涂色本线稿：站立侧视、闭合色块、外轮廓只描一次。
 * 不把 3D 身子的重叠分区再描一遍，避免叠线 / 透视双线 / 躺平的团子鹿。
 */
import type { AnimalId } from '../types'

export type Ring = [number, number][]

export const COLOR_FRAME: Record<AnimalId, { minX: number; maxX: number; minY: number; maxY: number }> = {
  deer: { minX: -1.08, maxX: 1.46, minY: -0.04, maxY: 2.18 },
  tiger: { minX: -1.42, maxX: 1.48, minY: -0.04, maxY: 1.58 },
  lion: { minX: -1.32, maxX: 1.46, minY: -0.04, maxY: 1.78 },
}

type Ctx = CanvasRenderingContext2D

function fillId(ctx: Ctx, id: number, draw: () => void): void {
  ctx.save()
  ctx.fillStyle = `rgb(${id},0,0)`
  draw()
  ctx.fill()
  ctx.restore()
}

function ink(ctx: Ctx, width: number, draw: () => void): void {
  ctx.save()
  ctx.strokeStyle = '#1a120c'
  ctx.fillStyle = '#1a120c'
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  draw()
  ctx.stroke()
  ctx.restore()
}

function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
}

function stadium(ctx: Ctx, x: number, y0: number, y1: number, r: number): void {
  const lo = Math.min(y0, y1)
  const hi = Math.max(y0, y1)
  ctx.beginPath()
  ctx.moveTo(x - r, lo)
  ctx.lineTo(x - r, hi)
  ctx.arc(x, hi, r, Math.PI, 0)
  ctx.lineTo(x + r, lo)
  ctx.arc(x, lo, r, 0, Math.PI)
  ctx.closePath()
}

function poly(ctx: Ctx, pts: Ring): void {
  if (!pts.length) return
  ctx.beginPath()
  ctx.moveTo(pts[0]![0], pts[0]![1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1])
  ctx.closePath()
}

function sideFace(ctx: Ctx, ex: number, ey: number, nx: number, ny: number): void {
  ctx.save()
  ctx.fillStyle = '#1a120c'
  ctx.beginPath()
  ctx.ellipse(ex, ey, 0.055, 0.07, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fffdf7'
  ctx.beginPath()
  ctx.ellipse(ex + 0.018, ey + 0.02, 0.018, 0.022, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1a120c'
  ctx.beginPath()
  ctx.ellipse(nx, ny, 0.045, 0.038, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ink(ctx, 0.022, () => {
    ctx.beginPath()
    ctx.arc(ex + 0.04, ey - 0.12, 0.1, 1.15 * Math.PI, 1.78 * Math.PI)
  })
}

/** 站立小鹿外轮廓：蹄在地上、头在右上、角朝天。一条闭合线，不叠第二层身子。 */
export const DEER_OUTLINE: Ring = [
  [1.38, 1.4],
  [1.32, 1.24],
  [1.14, 1.22],
  [0.92, 1.26],
  [0.74, 1.16],
  [0.62, 0.96],
  [0.58, 0.78],
  [0.54, 0.12],
  [0.46, 0.02],
  [0.38, 0.12],
  [0.4, 0.72],
  [0.3, 0.72],
  [0.28, 0.12],
  [0.2, 0.02],
  [0.12, 0.12],
  [0.16, 0.7],
  [-0.16, 0.68],
  [-0.22, 0.12],
  [-0.3, 0.02],
  [-0.38, 0.12],
  [-0.34, 0.72],
  [-0.46, 0.74],
  [-0.5, 0.12],
  [-0.58, 0.02],
  [-0.66, 0.12],
  [-0.58, 0.82],
  [-0.78, 0.9],
  [-0.98, 1.04],
  [-0.86, 1.16],
  [-0.62, 1.18],
  [-0.36, 1.28],
  [0.08, 1.32],
  [0.4, 1.24],
  [0.56, 1.38],
  [0.66, 1.56],
  [0.54, 1.78],
  [0.7, 1.7],
  [0.8, 1.54],
  [0.92, 1.58],
  [1.04, 1.78],
  [1.16, 1.66],
  [1.12, 1.48],
  [1.26, 1.46],
  [1.38, 1.4],
]

const DEER_ANTLER_L: Ring = [
  [0.72, 1.54],
  [0.58, 1.96],
  [0.5, 2.12],
  [0.62, 2.1],
  [0.68, 1.88],
  [0.64, 2.08],
  [0.76, 2.06],
  [0.8, 1.56],
]

const DEER_ANTLER_R: Ring = [
  [0.88, 1.56],
  [0.92, 1.98],
  [0.86, 2.14],
  [0.98, 2.12],
  [1.0, 1.9],
  [1.08, 2.08],
  [1.18, 2.04],
  [1.0, 1.56],
]

export function drawDeerRegions(ctx: Ctx): void {
  fillId(ctx, 14, () => stadium(ctx, -0.5, 0.06, 0.78, 0.055))
  fillId(ctx, 15, () => stadium(ctx, -0.3, 0.06, 0.76, 0.055))
  fillId(ctx, 12, () => stadium(ctx, 0.16, 0.06, 0.76, 0.055))
  fillId(ctx, 13, () => stadium(ctx, 0.46, 0.06, 0.78, 0.055))
  fillId(ctx, 16, () => oval(ctx, -0.86, 1.04, 0.14, 0.1))
  fillId(ctx, 7, () => oval(ctx, 0.02, 1.0, 0.58, 0.34))
  fillId(ctx, 8, () => oval(ctx, 0.04, 0.86, 0.38, 0.16))
  fillId(ctx, 9, () => oval(ctx, -0.06, 1.08, 0.07, 0.05))
  fillId(ctx, 10, () => oval(ctx, 0.18, 1.12, 0.06, 0.045))
  fillId(ctx, 11, () => oval(ctx, 0.32, 0.98, 0.055, 0.04))
  fillId(ctx, 6, () => oval(ctx, 0.58, 1.22, 0.2, 0.2))
  fillId(ctx, 5, () => oval(ctx, 1.02, 1.4, 0.28, 0.2))
  fillId(ctx, 3, () => oval(ctx, 0.66, 1.66, 0.1, 0.14))
  fillId(ctx, 4, () => oval(ctx, 1.04, 1.66, 0.1, 0.14))
  fillId(ctx, 1, () => poly(ctx, DEER_ANTLER_L))
  fillId(ctx, 2, () => poly(ctx, DEER_ANTLER_R))
}

export function drawDeerLines(ctx: Ctx): void {
  ink(ctx, 0.038, () => poly(ctx, DEER_OUTLINE))
  ink(ctx, 0.032, () => poly(ctx, DEER_ANTLER_L))
  ink(ctx, 0.032, () => poly(ctx, DEER_ANTLER_R))
  ink(ctx, 0.02, () => {
    ctx.beginPath()
    ctx.moveTo(0.38, 0.86)
    ctx.quadraticCurveTo(0.02, 0.76, -0.3, 0.86)
  })
  ink(ctx, 0.016, () => oval(ctx, -0.06, 1.08, 0.07, 0.05))
  ink(ctx, 0.016, () => oval(ctx, 0.18, 1.12, 0.06, 0.045))
  ink(ctx, 0.016, () => oval(ctx, 0.32, 0.98, 0.055, 0.04))
  sideFace(ctx, 1.08, 1.42, 1.32, 1.36)
}

/** 老虎：圆头、竖耳、四条腿落地，条纹只画在肚子里面。 */
export const TIGER_OUTLINE: Ring = [
  [1.4, 0.98],
  [1.28, 0.82],
  [1.08, 0.86],
  [0.86, 0.84],
  [0.7, 0.7],
  [0.66, 0.12],
  [0.56, 0.02],
  [0.46, 0.12],
  [0.5, 0.66],
  [0.38, 0.66],
  [0.36, 0.12],
  [0.26, 0.02],
  [0.16, 0.12],
  [0.2, 0.66],
  [-0.28, 0.64],
  [-0.32, 0.12],
  [-0.42, 0.02],
  [-0.52, 0.12],
  [-0.48, 0.66],
  [-0.6, 0.66],
  [-0.64, 0.12],
  [-0.74, 0.02],
  [-0.84, 0.12],
  [-0.76, 0.72],
  [-0.98, 0.82],
  [-1.28, 0.7],
  [-1.34, 0.86],
  [-1.08, 1.02],
  [-0.82, 1.08],
  [-0.4, 1.16],
  [0.1, 1.18],
  [0.48, 1.12],
  [0.7, 1.18],
  [0.78, 1.4],
  [0.66, 1.5],
  [0.8, 1.48],
  [0.9, 1.22],
  [1.02, 1.48],
  [1.16, 1.46],
  [1.08, 1.16],
  [1.28, 1.12],
  [1.4, 0.98],
]

export function drawTigerRegions(ctx: Ctx): void {
  fillId(ctx, 11, () => stadium(ctx, -0.7, 0.06, 0.72, 0.06))
  fillId(ctx, 12, () => stadium(ctx, -0.42, 0.06, 0.7, 0.06))
  fillId(ctx, 9, () => stadium(ctx, 0.22, 0.06, 0.7, 0.06))
  fillId(ctx, 10, () => stadium(ctx, 0.56, 0.06, 0.72, 0.06))
  fillId(ctx, 13, () => {
    ctx.beginPath()
    ctx.moveTo(-0.82, 0.86)
    ctx.quadraticCurveTo(-1.2, 1.05, -1.32, 0.78)
    ctx.quadraticCurveTo(-1.18, 0.62, -0.9, 0.78)
    ctx.closePath()
  })
  fillId(ctx, 7, () => oval(ctx, -0.02, 0.92, 0.72, 0.28))
  fillId(ctx, 8, () => oval(ctx, 0.04, 0.8, 0.42, 0.14))
  fillId(ctx, 1, () => oval(ctx, 0.76, 1.4, 0.1, 0.14))
  fillId(ctx, 2, () => oval(ctx, 1.06, 1.38, 0.1, 0.14))
  fillId(ctx, 3, () => oval(ctx, 0.76, 1.36, 0.045, 0.06))
  fillId(ctx, 4, () => oval(ctx, 1.06, 1.34, 0.045, 0.06))
  fillId(ctx, 5, () => oval(ctx, 1.02, 1.02, 0.3, 0.24))
  fillId(ctx, 6, () => oval(ctx, 1.24, 0.92, 0.16, 0.12))
}

export function drawTigerLines(ctx: Ctx): void {
  ink(ctx, 0.038, () => poly(ctx, TIGER_OUTLINE))
  ink(ctx, 0.02, () => {
    ctx.beginPath()
    ctx.moveTo(0.42, 0.8)
    ctx.quadraticCurveTo(0.0, 0.7, -0.38, 0.8)
  })
  ctx.save()
  ctx.strokeStyle = '#1a120c'
  ctx.lineWidth = 0.026
  ctx.lineCap = 'round'
  for (const x of [-0.28, -0.08, 0.12, 0.3]) {
    ctx.beginPath()
    ctx.moveTo(x, 1.02)
    ctx.quadraticCurveTo(x + 0.05, 0.88, x - 0.02, 0.76)
    ctx.stroke()
  }
  ctx.restore()
  sideFace(ctx, 1.08, 1.04, 1.34, 0.94)
}

/** 狮子：鬃毛一大团在头后面，身子和腿不再叠描。 */
export const LION_OUTLINE: Ring = [
  [1.18, 1.0],
  [1.08, 0.86],
  [0.86, 0.86],
  [0.68, 0.72],
  [0.64, 0.12],
  [0.54, 0.02],
  [0.44, 0.12],
  [0.48, 0.66],
  [0.36, 0.66],
  [0.34, 0.12],
  [0.24, 0.02],
  [0.14, 0.12],
  [0.18, 0.66],
  [-0.22, 0.64],
  [-0.26, 0.12],
  [-0.36, 0.02],
  [-0.46, 0.12],
  [-0.42, 0.66],
  [-0.54, 0.66],
  [-0.58, 0.12],
  [-0.68, 0.02],
  [-0.78, 0.12],
  [-0.7, 0.72],
  [-0.92, 0.82],
  [-1.18, 0.7],
  [-1.22, 0.86],
  [-0.98, 1.0],
  [-0.72, 1.06],
  [-0.3, 1.14],
  [0.16, 1.16],
  [0.48, 1.08],
  [0.62, 1.12],
  [0.7, 0.98],
  [0.92, 1.02],
  [1.18, 1.0],
]

const LION_MANE: Ring = [
  [0.58, 0.92],
  [0.48, 1.18],
  [0.52, 1.48],
  [0.72, 1.68],
  [1.0, 1.74],
  [1.26, 1.62],
  [1.4, 1.34],
  [1.38, 1.04],
  [1.22, 0.86],
  [0.94, 0.82],
  [0.7, 0.86],
]

export function drawLionRegions(ctx: Ctx): void {
  fillId(ctx, 10, () => stadium(ctx, -0.64, 0.06, 0.72, 0.06))
  fillId(ctx, 11, () => stadium(ctx, -0.36, 0.06, 0.7, 0.06))
  fillId(ctx, 8, () => stadium(ctx, 0.2, 0.06, 0.7, 0.06))
  fillId(ctx, 9, () => stadium(ctx, 0.54, 0.06, 0.72, 0.06))
  fillId(ctx, 12, () => {
    ctx.beginPath()
    ctx.moveTo(-0.78, 0.84)
    ctx.quadraticCurveTo(-1.12, 1.0, -1.2, 0.78)
    ctx.quadraticCurveTo(-1.04, 0.64, -0.84, 0.76)
    ctx.closePath()
  })
  fillId(ctx, 13, () => oval(ctx, -1.16, 0.78, 0.08, 0.07))
  fillId(ctx, 6, () => oval(ctx, -0.02, 0.9, 0.64, 0.26))
  fillId(ctx, 7, () => oval(ctx, 0.04, 0.78, 0.38, 0.13))
  fillId(ctx, 1, () => poly(ctx, LION_MANE))
  fillId(ctx, 2, () => oval(ctx, 0.78, 1.48, 0.09, 0.12))
  fillId(ctx, 3, () => oval(ctx, 1.12, 1.46, 0.09, 0.12))
  fillId(ctx, 4, () => oval(ctx, 1.0, 1.18, 0.24, 0.22))
  fillId(ctx, 5, () => oval(ctx, 1.16, 1.04, 0.14, 0.1))
}

export function drawLionLines(ctx: Ctx): void {
  ink(ctx, 0.038, () => poly(ctx, LION_OUTLINE))
  ink(ctx, 0.034, () => poly(ctx, LION_MANE))
  ink(ctx, 0.028, () => oval(ctx, 1.0, 1.18, 0.24, 0.22))
  ink(ctx, 0.02, () => {
    ctx.beginPath()
    ctx.moveTo(0.38, 0.78)
    ctx.quadraticCurveTo(0.0, 0.68, -0.32, 0.78)
  })
  sideFace(ctx, 1.04, 1.2, 1.26, 1.04)
}

export function drawBookRegions(animal: AnimalId, ctx: Ctx): void {
  if (animal === 'deer') drawDeerRegions(ctx)
  else if (animal === 'tiger') drawTigerRegions(ctx)
  else drawLionRegions(ctx)
}

export function drawBookLines(animal: AnimalId, ctx: Ctx): void {
  if (animal === 'deer') drawDeerLines(ctx)
  else if (animal === 'tiger') drawTigerLines(ctx)
  else drawLionLines(ctx)
}

export function bookFrame(ctx: Ctx, w: number, h: number, animal: AnimalId, fn: () => void): void {
  const b = COLOR_FRAME[animal]
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
