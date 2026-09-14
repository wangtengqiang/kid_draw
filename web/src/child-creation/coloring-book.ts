/**
 * 涂色本线稿：小朋友一眼能认出的站立侧视动物。
 * 外轮廓只描一次；头、耳、纹、鬣是几何形，不再把粗多边形平滑成兔子。
 */
import type { AnimalId } from '../types'

export type Ring = [number, number][]

export const COLOR_FRAME: Record<AnimalId, { minX: number; maxX: number; minY: number; maxY: number }> = {
  deer: { minX: -1.12, maxX: 1.62, minY: -0.04, maxY: 2.32 },
  tiger: { minX: -1.62, maxX: 1.68, minY: -0.04, maxY: 1.72 },
  lion: { minX: -1.48, maxX: 1.68, minY: -0.04, maxY: 1.86 },
  fish: { minX: -1.42, maxX: 1.48, minY: -0.22, maxY: 1.32 },
  turtle: { minX: -1.28, maxX: 1.52, minY: -0.12, maxY: 1.32 },
  dolphin: { minX: -1.52, maxX: 1.62, minY: -0.28, maxY: 1.38 },
}

/** 老虎圆脑袋：侧视猫科，不是竖耳兔子。 */
export const TIGER_HEAD_CIRCLE = { cx: 1.14, cy: 1.04, r: 0.42 }
/** 耳尖只高出头顶一点点。 */
export const TIGER_EAR_TIP_Y = 1.58

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

function tri(ctx: Ctx, a: Ring[0], b: Ring[0], c: Ring[0]): void {
  poly(ctx, [a, b, c])
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
}

function arcDeg(cx: number, cy: number, r: number, from: number, to: number, n: number): Ring {
  const pts: Ring = []
  for (let i = 0; i <= n; i++) {
    const d = from + ((to - from) * i) / n
    pts.push(polar(cx, cy, r, d))
  }
  return pts
}

function scallop(cx: number, cy: number, r: number, from: number, to: number, bumps: number, amp: number): Ring {
  const steps = bumps * 6
  const pts: Ring = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const d = from + (to - from) * t
    const rr = r * (1 + amp * Math.sin(t * bumps * Math.PI * 2))
    pts.push(polar(cx, cy, rr, d))
  }
  return pts
}

/** 腿的外轮廓：从上往下绕过蹄/爪再上来。顺时针绕整只动物时用。 */
function pawLoop(x: number, yTop: number, half: number): Ring {
  return [
    [x + half, yTop],
    [x + half, 0.14],
    [x + half + 0.05, 0.05],
    [x + 0.02, 0.0],
    [x - half - 0.05, 0.05],
    [x - half, 0.14],
    [x - half, yTop],
  ]
}

function catEye(ctx: Ctx, ex: number, ey: number, nx: number, ny: number): void {
  ctx.save()
  ctx.fillStyle = '#1a120c'
  ctx.beginPath()
  ctx.ellipse(ex, ey, 0.07, 0.085, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fffdf7'
  ctx.beginPath()
  ctx.ellipse(ex + 0.022, ey + 0.024, 0.022, 0.026, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1a120c'
  ctx.beginPath()
  ctx.ellipse(nx, ny, 0.05, 0.04, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function whiskers(ctx: Ctx, x: number, y: number): void {
  ink(ctx, 0.016, () => {
    ctx.beginPath()
    ctx.moveTo(x, y + 0.06)
    ctx.quadraticCurveTo(x + 0.16, y + 0.12, x + 0.28, y + 0.1)
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + 0.18, y + 0.02, x + 0.3, y)
    ctx.moveTo(x, y - 0.06)
    ctx.quadraticCurveTo(x + 0.16, y - 0.1, x + 0.26, y - 0.12)
  })
}

const HX = TIGER_HEAD_CIRCLE.cx
const HY = TIGER_HEAD_CIRCLE.cy
const HR = TIGER_HEAD_CIRCLE.r

const TIGER_EAR_REAR: Ring = [
  polar(HX, HY, HR - 0.02, 125),
  [0.78, 1.56],
  [0.96, 1.5],
  polar(HX, HY, HR - 0.02, 108),
]

const TIGER_EAR_FRONT: Ring = [
  polar(HX, HY, HR - 0.02, 72),
  [1.22, 1.58],
  [1.36, 1.48],
  polar(HX, HY, HR - 0.02, 48),
]

/**
 * 老虎外轮廓：大圆头 + 小三角耳 + 长纹尾。不走 Catmull 平滑，免得耳被拉成兔子。
 */
export const TIGER_OUTLINE: Ring = [
  polar(HX, HY, HR + 0.08, 18),
  polar(HX, HY, HR + 0.1, 8),
  polar(HX, HY, HR + 0.06, -8),
  polar(HX, HY, HR, -28),
  ...arcDeg(HX, HY, HR, -40, -130, 8),
  [0.78, 0.72],
  ...pawLoop(0.58, 0.7, 0.08),
  [0.4, 0.68],
  ...pawLoop(0.3, 0.68, 0.075),
  [0.12, 0.64],
  [-0.18, 0.62],
  ...pawLoop(-0.4, 0.68, 0.08),
  [-0.56, 0.68],
  ...pawLoop(-0.72, 0.7, 0.08),
  [-0.86, 0.82],
  [-0.94, 0.96],
  [-1.08, 1.14],
  [-1.22, 1.24],
  [-1.38, 1.26],
  [-1.52, 1.14],
  [-1.56, 0.96],
  [-1.52, 0.74],
  [-1.42, 0.56],
  [-1.28, 0.5],
  [-1.2, 0.66],
  [-1.26, 0.88],
  [-1.16, 1.06],
  [-0.98, 1.02],
  [-0.7, 1.16],
  [-0.28, 1.24],
  [0.18, 1.26],
  [0.55, 1.22],
  [0.78, 1.34],
  TIGER_EAR_REAR[0]!,
  TIGER_EAR_REAR[1]!,
  TIGER_EAR_REAR[2]!,
  TIGER_EAR_REAR[3]!,
  ...arcDeg(HX, HY, HR, 108, 78, 5),
  TIGER_EAR_FRONT[0]!,
  TIGER_EAR_FRONT[1]!,
  TIGER_EAR_FRONT[2]!,
  TIGER_EAR_FRONT[3]!,
  ...arcDeg(HX, HY, HR, 48, 22, 4),
]

export function drawTigerRegions(ctx: Ctx): void {
  fillId(ctx, 11, () => stadium(ctx, -0.72, 0.04, 0.78, 0.075))
  fillId(ctx, 12, () => stadium(ctx, -0.4, 0.04, 0.76, 0.075))
  fillId(ctx, 9, () => stadium(ctx, 0.3, 0.04, 0.76, 0.07))
  fillId(ctx, 10, () => stadium(ctx, 0.58, 0.04, 0.78, 0.075))
  fillId(ctx, 13, () => {
    ctx.beginPath()
    ctx.moveTo(-0.86, 0.92)
    ctx.quadraticCurveTo(-1.22, 1.28, -1.52, 1.08)
    ctx.quadraticCurveTo(-1.58, 0.72, -1.4, 0.54)
    ctx.quadraticCurveTo(-1.2, 0.7, -1.22, 0.96)
    ctx.quadraticCurveTo(-1.04, 1.14, -0.86, 0.92)
    ctx.closePath()
  })
  fillId(ctx, 7, () => oval(ctx, 0.02, 0.9, 0.78, 0.36))
  fillId(ctx, 8, () => oval(ctx, 0.08, 0.74, 0.46, 0.16))
  fillId(ctx, 5, () => oval(ctx, HX, HY, HR, HR))
  fillId(ctx, 6, () => oval(ctx, 1.42, 0.94, 0.2, 0.16))
  fillId(ctx, 1, () => tri(ctx, TIGER_EAR_REAR[0]!, TIGER_EAR_REAR[1]!, TIGER_EAR_REAR[2]!))
  fillId(ctx, 2, () => tri(ctx, TIGER_EAR_FRONT[0]!, TIGER_EAR_FRONT[1]!, TIGER_EAR_FRONT[2]!))
  fillId(ctx, 3, () => tri(ctx, [0.84, 1.38], [0.86, 1.5], [0.94, 1.42]))
  fillId(ctx, 4, () => tri(ctx, [1.2, 1.4], [1.24, 1.52], [1.32, 1.42]))
}

function tigerStripes(ctx: Ctx): void {
  ink(ctx, 0.03, () => {
    ctx.beginPath()
    const body: [number, number, number][] = [
      [-0.48, 1.14, 0.7],
      [-0.28, 1.18, 0.68],
      [-0.08, 1.2, 0.66],
      [0.12, 1.18, 0.66],
      [0.32, 1.14, 0.7],
      [0.48, 1.08, 0.74],
    ]
    for (const [x, y0, y1] of body) {
      ctx.moveTo(x, y0)
      ctx.quadraticCurveTo(x + 0.06, (y0 + y1) / 2, x - 0.02, y1)
    }
  })
  ink(ctx, 0.028, () => {
    ctx.beginPath()
    for (const [x0, y0, x1, y1] of [
      [-1.08, 1.16, -1.02, 0.98],
      [-1.28, 1.2, -1.22, 0.92],
      [-1.44, 1.08, -1.4, 0.78],
      [-1.5, 0.88, -1.42, 0.6],
    ] as const) {
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
    }
  })
}

export function drawTigerLines(ctx: Ctx): void {
  ink(ctx, 0.04, () => poly(ctx, TIGER_OUTLINE))
  ink(ctx, 0.022, () => {
    ctx.beginPath()
    ctx.moveTo(0.42, 0.78)
    ctx.quadraticCurveTo(0.02, 0.66, -0.4, 0.78)
  })
  tigerStripes(ctx)
  catEye(ctx, 1.22, 1.1, 1.5, 0.96)
  whiskers(ctx, 1.4, 0.92)
}

const DEER_ANTLER_L: Ring = [
  [0.72, 1.66],
  [0.58, 1.98],
  [0.44, 2.2],
  [0.56, 2.22],
  [0.66, 2.02],
  [0.62, 2.18],
  [0.74, 2.2],
  [0.78, 2.0],
  [0.86, 1.68],
]

const DEER_ANTLER_R: Ring = [
  [0.94, 1.68],
  [0.96, 2.04],
  [0.9, 2.24],
  [1.04, 2.26],
  [1.08, 2.04],
  [1.16, 2.2],
  [1.28, 2.16],
  [1.12, 1.9],
  [1.06, 1.66],
]

/** 小鹿：细腿、尖吻、分叉角、斑点。 */
export const DEER_OUTLINE: Ring = [
  [1.56, 1.38],
  [1.5, 1.26],
  [1.28, 1.22],
  [1.08, 1.28],
  [0.92, 1.22],
  [0.78, 1.02],
  [0.7, 0.82],
  ...pawLoop(0.52, 0.8, 0.042),
  [0.38, 0.78],
  ...pawLoop(0.22, 0.78, 0.04),
  [0.06, 0.76],
  [-0.22, 0.76],
  ...pawLoop(-0.4, 0.8, 0.042),
  [-0.54, 0.8],
  ...pawLoop(-0.7, 0.82, 0.044),
  [-0.82, 0.96],
  [-1.02, 1.08],
  [-0.92, 1.2],
  [-0.7, 1.18],
  [-0.36, 1.32],
  [0.08, 1.38],
  [0.42, 1.32],
  [0.58, 1.42],
  [0.68, 1.62],
  [0.62, 1.78],
  [0.74, 1.74],
  [0.84, 1.58],
  [0.96, 1.62],
  [1.02, 1.8],
  [1.16, 1.74],
  [1.1, 1.54],
  [1.28, 1.5],
  [1.48, 1.44],
]

export function drawDeerRegions(ctx: Ctx): void {
  fillId(ctx, 14, () => stadium(ctx, -0.7, 0.04, 0.86, 0.042))
  fillId(ctx, 15, () => stadium(ctx, -0.4, 0.04, 0.84, 0.04))
  fillId(ctx, 12, () => stadium(ctx, 0.22, 0.04, 0.84, 0.04))
  fillId(ctx, 13, () => stadium(ctx, 0.52, 0.04, 0.86, 0.042))
  fillId(ctx, 16, () => oval(ctx, -0.94, 1.1, 0.16, 0.1))
  fillId(ctx, 7, () => oval(ctx, -0.02, 1.04, 0.62, 0.36))
  fillId(ctx, 8, () => oval(ctx, 0.04, 0.88, 0.36, 0.16))
  fillId(ctx, 9, () => oval(ctx, -0.18, 1.12, 0.08, 0.06))
  fillId(ctx, 10, () => oval(ctx, 0.08, 1.18, 0.07, 0.055))
  fillId(ctx, 11, () => oval(ctx, 0.22, 1.02, 0.065, 0.05))
  fillId(ctx, 6, () => oval(ctx, 0.62, 1.22, 0.22, 0.24))
  fillId(ctx, 5, () => oval(ctx, 1.18, 1.4, 0.34, 0.2))
  fillId(ctx, 3, () => oval(ctx, 0.7, 1.68, 0.1, 0.14))
  fillId(ctx, 4, () => oval(ctx, 1.06, 1.68, 0.1, 0.14))
  fillId(ctx, 1, () => poly(ctx, DEER_ANTLER_L))
  fillId(ctx, 2, () => poly(ctx, DEER_ANTLER_R))
}

export function drawDeerLines(ctx: Ctx): void {
  ink(ctx, 0.038, () => poly(ctx, DEER_OUTLINE))
  ink(ctx, 0.03, () => poly(ctx, DEER_ANTLER_L))
  ink(ctx, 0.03, () => poly(ctx, DEER_ANTLER_R))
  ink(ctx, 0.02, () => {
    ctx.beginPath()
    ctx.moveTo(0.34, 0.9)
    ctx.quadraticCurveTo(0.0, 0.78, -0.32, 0.9)
  })
  ink(ctx, 0.016, () => oval(ctx, -0.18, 1.12, 0.08, 0.06))
  ink(ctx, 0.016, () => oval(ctx, 0.08, 1.18, 0.07, 0.055))
  ink(ctx, 0.016, () => oval(ctx, 0.22, 1.02, 0.065, 0.05))
  ink(ctx, 0.016, () => oval(ctx, -0.04, 1.0, 0.05, 0.04))
  ink(ctx, 0.016, () => oval(ctx, 0.28, 1.16, 0.045, 0.035))
  catEye(ctx, 1.22, 1.44, 1.5, 1.34)
}

const LION_MANE_C = { cx: 1.06, cy: 1.12, r: 0.52 }
const LION_FACE_C = { cx: 1.12, cy: 1.1, r: 0.28 }

const LION_EAR_L: Ring = [
  polar(LION_MANE_C.cx, LION_MANE_C.cy, LION_MANE_C.r * 0.82, 118),
  [0.82, 1.78],
  [1.0, 1.7],
]
const LION_EAR_R: Ring = [
  polar(LION_MANE_C.cx, LION_MANE_C.cy, LION_MANE_C.r * 0.82, 68),
  [1.18, 1.82],
  [1.34, 1.7],
]

/** 狮子：身体接在鬃毛圈后面；脸画在圈里。 */
export const LION_OUTLINE: Ring = [
  polar(LION_FACE_C.cx, LION_FACE_C.cy, LION_FACE_C.r + 0.04, 20),
  polar(LION_FACE_C.cx, LION_FACE_C.cy, LION_FACE_C.r + 0.02, -20),
  ...scallop(LION_MANE_C.cx, LION_MANE_C.cy, LION_MANE_C.r, -28, -105, 4, 0.06),
  [0.62, 0.8],
  [0.58, 0.76],
  ...pawLoop(0.5, 0.76, 0.075),
  [0.34, 0.72],
  ...pawLoop(0.22, 0.72, 0.07),
  [0.04, 0.66],
  [-0.22, 0.64],
  ...pawLoop(-0.4, 0.7, 0.075),
  [-0.56, 0.7],
  ...pawLoop(-0.72, 0.72, 0.078),
  [-0.86, 0.84],
  [-1.08, 0.92],
  [-1.28, 0.78],
  [-1.4, 0.86],
  [-1.36, 1.02],
  [-1.18, 1.08],
  [-0.92, 0.98],
  [-0.62, 1.08],
  [-0.28, 1.16],
  [0.16, 1.18],
  polar(LION_MANE_C.cx, LION_MANE_C.cy, LION_MANE_C.r, 168),
  LION_EAR_L[0]!,
  LION_EAR_L[1]!,
  LION_EAR_L[2]!,
  ...scallop(LION_MANE_C.cx, LION_MANE_C.cy, LION_MANE_C.r, 112, 72, 3, 0.06),
  LION_EAR_R[0]!,
  LION_EAR_R[1]!,
  LION_EAR_R[2]!,
  ...scallop(LION_MANE_C.cx, LION_MANE_C.cy, LION_MANE_C.r, 62, 18, 3, 0.06),
]

export function drawLionRegions(ctx: Ctx): void {
  fillId(ctx, 10, () => stadium(ctx, -0.72, 0.04, 0.8, 0.075))
  fillId(ctx, 11, () => stadium(ctx, -0.4, 0.04, 0.78, 0.072))
  fillId(ctx, 8, () => stadium(ctx, 0.22, 0.04, 0.78, 0.07))
  fillId(ctx, 9, () => stadium(ctx, 0.5, 0.04, 0.8, 0.075))
  fillId(ctx, 12, () => {
    ctx.beginPath()
    ctx.moveTo(-0.86, 0.88)
    ctx.quadraticCurveTo(-1.12, 1.08, -1.32, 0.9)
    ctx.quadraticCurveTo(-1.2, 0.74, -0.92, 0.82)
    ctx.closePath()
  })
  fillId(ctx, 13, () => oval(ctx, -1.32, 0.9, 0.12, 0.1))
  fillId(ctx, 6, () => oval(ctx, -0.08, 0.9, 0.66, 0.3))
  fillId(ctx, 7, () => oval(ctx, 0.0, 0.76, 0.4, 0.14))
  fillId(ctx, 1, () => oval(ctx, LION_MANE_C.cx, LION_MANE_C.cy, LION_MANE_C.r, LION_MANE_C.r * 0.96))
  fillId(ctx, 2, () => tri(ctx, LION_EAR_L[0]!, LION_EAR_L[1]!, LION_EAR_L[2]!))
  fillId(ctx, 3, () => tri(ctx, LION_EAR_R[0]!, LION_EAR_R[1]!, LION_EAR_R[2]!))
  fillId(ctx, 4, () => oval(ctx, LION_FACE_C.cx, LION_FACE_C.cy, LION_FACE_C.r, LION_FACE_C.r * 0.96))
  fillId(ctx, 5, () => oval(ctx, 1.32, 1.0, 0.16, 0.12))
}

export function drawLionLines(ctx: Ctx): void {
  ink(ctx, 0.04, () => poly(ctx, LION_OUTLINE))
  ink(ctx, 0.03, () => oval(ctx, LION_FACE_C.cx, LION_FACE_C.cy, LION_FACE_C.r, LION_FACE_C.r * 0.96))
  ink(ctx, 0.02, () => {
    ctx.beginPath()
    ctx.moveTo(0.32, 0.78)
    ctx.quadraticCurveTo(-0.02, 0.66, -0.36, 0.78)
  })
  ink(ctx, 0.022, () => oval(ctx, -1.32, 0.9, 0.12, 0.1))
  catEye(ctx, 1.18, 1.16, 1.4, 1.02)
  whiskers(ctx, 1.32, 0.98)
}

const FISH_TAIL: Ring = [
  [-0.72, 0.52],
  [-1.28, 0.92],
  [-1.22, 0.52],
  [-1.32, 0.12],
]

export const FISH_OUTLINE: Ring = [
  [1.38, 0.52],
  [1.28, 0.34],
  [1.04, 0.22],
  [0.62, 0.16],
  [0.12, 0.18],
  [-0.28, 0.28],
  [-0.62, 0.42],
  ...FISH_TAIL,
  [-0.58, 0.62],
  [-0.22, 0.78],
  [0.18, 0.88],
  [0.42, 1.12],
  [0.62, 1.08],
  [0.52, 0.86],
  [0.92, 0.82],
  [1.22, 0.7],
]

export function drawFishRegions(ctx: Ctx): void {
  fillId(ctx, 3, () => poly(ctx, FISH_TAIL))
  fillId(ctx, 4, () => {
    ctx.beginPath()
    ctx.moveTo(0.28, 0.82)
    ctx.lineTo(0.48, 1.14)
    ctx.lineTo(0.68, 0.8)
    ctx.closePath()
  })
  fillId(ctx, 1, () => oval(ctx, 0.28, 0.52, 0.82, 0.34))
  fillId(ctx, 2, () => oval(ctx, 0.32, 0.38, 0.5, 0.16))
  fillId(ctx, 5, () => oval(ctx, 1.08, 0.54, 0.28, 0.22))
  fillId(ctx, 6, () => oval(ctx, 0.08, 0.58, 0.08, 0.2))
}

export function drawFishLines(ctx: Ctx): void {
  ink(ctx, 0.04, () => poly(ctx, FISH_OUTLINE))
  ink(ctx, 0.022, () => {
    ctx.beginPath()
    ctx.moveTo(0.7, 0.42)
    ctx.quadraticCurveTo(0.2, 0.3, -0.28, 0.42)
  })
  ink(ctx, 0.026, () => {
    ctx.beginPath()
    for (const x of [-0.08, 0.16, 0.4]) {
      ctx.moveTo(x, 0.72)
      ctx.quadraticCurveTo(x + 0.06, 0.52, x, 0.32)
    }
  })
  catEye(ctx, 1.12, 0.58, 1.32, 0.48)
}

const TURTLE_SHELL: Ring = [
  [0.72, 0.42],
  [0.62, 0.82],
  [0.28, 1.12],
  [-0.18, 1.18],
  [-0.58, 0.98],
  [-0.78, 0.62],
  [-0.62, 0.28],
  [-0.18, 0.14],
  [0.36, 0.18],
  [0.68, 0.28],
]

export const TURTLE_OUTLINE: Ring = [
  [1.42, 0.58],
  [1.36, 0.42],
  [1.12, 0.38],
  [0.88, 0.46],
  [0.72, 0.32],
  [0.78, 0.08],
  [0.58, 0.0],
  [0.42, 0.16],
  [0.28, 0.22],
  [0.22, 0.04],
  [0.02, 0.0],
  [-0.08, 0.2],
  [-0.42, 0.22],
  [-0.52, 0.04],
  [-0.72, 0.0],
  [-0.78, 0.2],
  [-0.92, 0.28],
  [-1.12, 0.12],
  [-1.22, 0.28],
  [-0.98, 0.48],
  [-0.82, 0.7],
  [-0.58, 1.08],
  [-0.12, 1.24],
  [0.36, 1.18],
  [0.7, 0.88],
  [0.82, 0.62],
  [0.98, 0.72],
  [1.18, 0.7],
  [1.28, 0.82],
  [1.38, 0.7],
]

export function drawTurtleRegions(ctx: Ctx): void {
  fillId(ctx, 4, () => stadium(ctx, 0.58, 0.04, 0.38, 0.1))
  fillId(ctx, 5, () => stadium(ctx, 0.12, 0.02, 0.28, 0.09))
  fillId(ctx, 6, () => stadium(ctx, -0.62, 0.02, 0.3, 0.1))
  fillId(ctx, 7, () => stadium(ctx, -1.02, 0.08, 0.36, 0.1))
  fillId(ctx, 1, () => poly(ctx, TURTLE_SHELL))
  fillId(ctx, 2, () => oval(ctx, -0.02, 0.68, 0.32, 0.28))
  fillId(ctx, 8, () => oval(ctx, 0.02, 0.36, 0.36, 0.12))
  fillId(ctx, 3, () => oval(ctx, 1.16, 0.58, 0.26, 0.2))
}

export function drawTurtleLines(ctx: Ctx): void {
  ink(ctx, 0.04, () => poly(ctx, TURTLE_OUTLINE))
  ink(ctx, 0.028, () => poly(ctx, TURTLE_SHELL))
  ink(ctx, 0.02, () => oval(ctx, -0.02, 0.68, 0.32, 0.28))
  ink(ctx, 0.018, () => {
    ctx.beginPath()
    ctx.moveTo(-0.02, 0.4)
    ctx.lineTo(-0.02, 0.96)
    ctx.moveTo(-0.28, 0.52)
    ctx.lineTo(0.24, 0.84)
    ctx.moveTo(-0.28, 0.84)
    ctx.lineTo(0.24, 0.52)
  })
  catEye(ctx, 1.18, 0.64, 1.36, 0.54)
}

export const DOLPHIN_OUTLINE: Ring = [
  [1.52, 0.48],
  [1.42, 0.34],
  [1.18, 0.28],
  [0.72, 0.18],
  [0.2, 0.16],
  [-0.28, 0.22],
  [-0.72, 0.34],
  [-1.08, 0.28],
  [-1.42, 0.08],
  [-1.38, 0.42],
  [-1.46, 0.72],
  [-1.08, 0.58],
  [-0.72, 0.62],
  [-0.28, 0.72],
  [0.08, 1.12],
  [0.28, 1.08],
  [0.18, 0.78],
  [0.62, 0.7],
  [1.08, 0.62],
  [1.36, 0.58],
]

export function drawDolphinRegions(ctx: Ctx): void {
  fillId(ctx, 5, () => {
    ctx.beginPath()
    ctx.moveTo(-0.92, 0.48)
    ctx.lineTo(-1.44, 0.08)
    ctx.lineTo(-1.48, 0.72)
    ctx.closePath()
  })
  fillId(ctx, 4, () => {
    ctx.beginPath()
    ctx.moveTo(-0.02, 0.7)
    ctx.lineTo(0.12, 1.14)
    ctx.lineTo(0.32, 0.68)
    ctx.closePath()
  })
  fillId(ctx, 1, () => oval(ctx, 0.12, 0.48, 0.92, 0.3))
  fillId(ctx, 2, () => oval(ctx, 0.18, 0.34, 0.58, 0.14))
  fillId(ctx, 3, () => oval(ctx, 1.28, 0.44, 0.26, 0.16))
}

export function drawDolphinLines(ctx: Ctx): void {
  ink(ctx, 0.04, () => poly(ctx, DOLPHIN_OUTLINE))
  ink(ctx, 0.022, () => {
    ctx.beginPath()
    ctx.moveTo(0.72, 0.36)
    ctx.quadraticCurveTo(0.2, 0.24, -0.32, 0.36)
  })
  catEye(ctx, 1.12, 0.52, 1.42, 0.42)
  ink(ctx, 0.018, () => {
    ctx.beginPath()
    ctx.arc(1.28, 0.4, 0.12, 1.05 * Math.PI, 1.85 * Math.PI)
  })
}

export function drawBookRegions(animal: AnimalId, ctx: Ctx): void {
  if (animal === 'deer') drawDeerRegions(ctx)
  else if (animal === 'tiger') drawTigerRegions(ctx)
  else if (animal === 'lion') drawLionRegions(ctx)
  else if (animal === 'fish') drawFishRegions(ctx)
  else if (animal === 'turtle') drawTurtleRegions(ctx)
  else drawDolphinRegions(ctx)
}

export function drawBookLines(animal: AnimalId, ctx: Ctx): void {
  if (animal === 'deer') drawDeerLines(ctx)
  else if (animal === 'tiger') drawTigerLines(ctx)
  else if (animal === 'lion') drawLionLines(ctx)
  else if (animal === 'fish') drawFishLines(ctx)
  else if (animal === 'turtle') drawTurtleLines(ctx)
  else drawDolphinLines(ctx)
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
