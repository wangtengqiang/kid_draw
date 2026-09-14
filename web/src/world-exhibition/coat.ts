/**
 * 孩子的分区色烤进 UV 皮毛：沿身子 U（尾→吻）V（腹→背）。
 * 不把整张涂鸦画糊在盒子上。
 */
import * as THREE from 'three'
import type { AnimalId } from '../types'
import { ANIMAL_META } from '../types'

function colorOf(animal: AnimalId, region: string, painted: Record<string, string>): string {
  return painted[region] || ANIMAL_META[animal].defaults[region] || '#d9b48a'
}

export function coatTexture(animal: AnimalId, painted: Record<string, string>): THREE.CanvasTexture {
  const size = 512
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  if (ctx) {
    const body = colorOf(animal, 'body', painted)
    const belly = colorOf(animal, 'belly', painted)
    const head = colorOf(animal, 'head', painted)
    const neck = colorOf(animal, animal === 'tiger' || animal === 'lion' ? 'head' : 'neck', painted)
    ctx.fillStyle = body
    ctx.fillRect(0, 0, size, size)

    const back = ctx.createLinearGradient(0, 0, 0, size)
    back.addColorStop(0, darken(body, 0.18))
    back.addColorStop(0.45, body)
    back.addColorStop(1, body)
    ctx.fillStyle = back
    ctx.fillRect(0, 0, size, Math.round(size * 0.55))

    ctx.fillStyle = belly
    ctx.beginPath()
    ctx.ellipse(size * 0.42, size * 0.92, size * 0.42, size * 0.28, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = neck
    ctx.fillRect(Math.round(size * 0.58), Math.round(size * 0.18), Math.round(size * 0.18), Math.round(size * 0.5))

    ctx.fillStyle = head
    ctx.beginPath()
    ctx.ellipse(size * 0.86, size * 0.38, size * 0.16, size * 0.22, 0.15, 0, Math.PI * 2)
    ctx.fill()

    if (animal === 'tiger') paintTiger(ctx, size, body, painted)
    else if (animal === 'deer') paintDeer(ctx, size, painted)
    else paintLion(ctx, size, painted)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

function paintTiger(ctx: CanvasRenderingContext2D, size: number, body: string, painted: Record<string, string>): void {
  ctx.strokeStyle = darken(body, 0.55)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let i = 0; i < 11; i++) {
    const u = 0.08 + i * 0.07
    ctx.lineWidth = 10 + (i % 3) * 4
    ctx.beginPath()
    ctx.moveTo(u * size, size * 0.06)
    ctx.quadraticCurveTo(u * size + 28, size * 0.42, u * size - 10, size * 0.72)
    ctx.stroke()
  }
  ctx.strokeStyle = darken(colorOf('tiger', 'head', painted), 0.5)
  ctx.lineWidth = 9
  for (const u of [0.74, 0.82, 0.9]) {
    ctx.beginPath()
    ctx.moveTo(u * size, size * 0.16)
    ctx.quadraticCurveTo(u * size + 12, size * 0.32, u * size - 8, size * 0.48)
    ctx.stroke()
  }
}

function paintDeer(ctx: CanvasRenderingContext2D, size: number, painted: Record<string, string>): void {
  const spots: [string, number, number, number][] = [
    ['spot1', 0.32, 0.38, 18],
    ['spot2', 0.48, 0.28, 16],
    ['spot3', 0.4, 0.52, 14],
    ['spot1', 0.22, 0.46, 12],
    ['spot2', 0.54, 0.44, 13],
    ['spot3', 0.36, 0.22, 11],
  ]
  for (const [name, u, v, r] of spots) {
    ctx.fillStyle = colorOf('deer', name, painted)
    ctx.beginPath()
    ctx.ellipse(u * size, v * size, r, r * 0.72, 0.2, 0, Math.PI * 2)
    ctx.fill()
  }
}

function paintLion(ctx: CanvasRenderingContext2D, size: number, painted: Record<string, string>): void {
  ctx.fillStyle = colorOf('lion', 'belly', painted)
  ctx.fillRect(0, Math.round(size * 0.7), size, Math.round(size * 0.3))
}

function darken(hex: string, amount: number): string {
  const n = hex.replace('#', '')
  const mix = (c: number) =>
    Math.max(0, Math.round(c * (1 - amount)))
      .toString(16)
      .padStart(2, '0')
  return `#${mix(parseInt(n.slice(0, 2), 16))}${mix(parseInt(n.slice(2, 4), 16))}${mix(parseInt(n.slice(4, 6), 16))}`
}
