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
    const neck = colorOf(
      animal,
      animal === 'tiger' || animal === 'lion' || animal === 'fish' || animal === 'dolphin' ? 'head' : 'neck',
      painted,
    )
    ctx.fillStyle = body
    ctx.fillRect(0, 0, size, size)

    const back = ctx.createLinearGradient(0, 0, 0, size)
    back.addColorStop(0, darken(body, 0.12))
    back.addColorStop(0.4, body)
    back.addColorStop(1, body)
    ctx.fillStyle = back
    ctx.fillRect(0, 0, size, Math.round(size * 0.55))

    ctx.fillStyle = belly
    ctx.beginPath()
    ctx.ellipse(size * 0.44, size * 0.9, size * 0.44, size * 0.32, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = neck
    ctx.beginPath()
    ctx.ellipse(size * 0.68, size * 0.4, size * 0.16, size * 0.28, 0.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = head
    ctx.beginPath()
    ctx.ellipse(size * 0.86, size * 0.36, size * 0.18, size * 0.24, 0.12, 0, Math.PI * 2)
    ctx.fill()

    if (animal === 'tiger') paintTiger(ctx, size, body, painted)
    else if (animal === 'deer') paintDeer(ctx, size, painted)
    else if (animal === 'lion') paintLion(ctx, size, painted)
    else if (animal === 'fish') paintFish(ctx, size, body)
    else if (animal === 'turtle') paintTurtle(ctx, size, painted)
    else if (animal === 'dolphin') paintDolphin(ctx, size, painted)
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
  ctx.strokeStyle = darken(body, 0.5)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let i = 0; i < 12; i++) {
    const u = 0.07 + i * 0.068
    ctx.lineWidth = 8 + (i % 3) * 5
    ctx.beginPath()
    ctx.moveTo(u * size, size * 0.05)
    ctx.quadraticCurveTo(u * size + 22, size * 0.4, u * size - 8, size * 0.74)
    ctx.stroke()
  }
  ctx.strokeStyle = darken(colorOf('tiger', 'head', painted), 0.45)
  ctx.lineWidth = 8
  for (const u of [0.74, 0.82, 0.9]) {
    ctx.beginPath()
    ctx.moveTo(u * size, size * 0.14)
    ctx.quadraticCurveTo(u * size + 10, size * 0.3, u * size - 6, size * 0.46)
    ctx.stroke()
  }
}

function paintDeer(ctx: CanvasRenderingContext2D, size: number, painted: Record<string, string>): void {
  const spots: [string, number, number, number][] = [
    ['spot1', 0.3, 0.34, 20],
    ['spot2', 0.46, 0.26, 17],
    ['spot3', 0.38, 0.5, 15],
    ['spot1', 0.2, 0.44, 13],
    ['spot2', 0.54, 0.42, 14],
    ['spot3', 0.34, 0.2, 12],
    ['spot1', 0.5, 0.34, 11],
    ['spot2', 0.26, 0.28, 10],
  ]
  for (const [name, u, v, r] of spots) {
    ctx.fillStyle = colorOf('deer', name, painted)
    ctx.beginPath()
    ctx.ellipse(u * size, v * size, r, r * 0.7, 0.18, 0, Math.PI * 2)
    ctx.fill()
  }
}

function paintLion(ctx: CanvasRenderingContext2D, size: number, painted: Record<string, string>): void {
  ctx.fillStyle = colorOf('lion', 'belly', painted)
  ctx.beginPath()
  ctx.ellipse(size * 0.45, size * 0.88, size * 0.42, size * 0.24, 0, 0, Math.PI * 2)
  ctx.fill()
}

function paintFish(ctx: CanvasRenderingContext2D, size: number, body: string): void {
  ctx.strokeStyle = darken(body, 0.35)
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  for (const u of [0.32, 0.46, 0.6]) {
    ctx.beginPath()
    ctx.moveTo(u * size, size * 0.22)
    ctx.quadraticCurveTo(u * size + 12, size * 0.5, u * size, size * 0.78)
    ctx.stroke()
  }
}

function paintTurtle(ctx: CanvasRenderingContext2D, size: number, painted: Record<string, string>): void {
  ctx.fillStyle = colorOf('turtle', 'scute', painted)
  ctx.beginPath()
  ctx.ellipse(size * 0.46, size * 0.42, size * 0.22, size * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
}

function paintDolphin(ctx: CanvasRenderingContext2D, size: number, painted: Record<string, string>): void {
  ctx.fillStyle = colorOf('dolphin', 'belly', painted)
  ctx.beginPath()
  ctx.ellipse(size * 0.46, size * 0.86, size * 0.4, size * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
}

function darken(hex: string, amount: number): string {
  const n = hex.replace('#', '')
  const mix = (c: number) =>
    Math.max(0, Math.round(c * (1 - amount)))
      .toString(16)
      .padStart(2, '0')
  return `#${mix(parseInt(n.slice(0, 2), 16))}${mix(parseInt(n.slice(2, 4), 16))}${mix(parseInt(n.slice(4, 6), 16))}`
}
