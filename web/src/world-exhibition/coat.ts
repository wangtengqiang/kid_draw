/**
 * 把孩子的分区色烤成身上的皮毛贴图：鹿斑、虎纹、狮身。
 * 有缩略图时用孩子真正涂出来的画。
 */
import * as THREE from 'three'
import { drawPreview } from '../child-creation/lineart'
import type { AnimalId } from '../types'

export function coatTexture(
  animal: AnimalId,
  painted: Record<string, string>,
  thumb?: string,
): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#fffaf1'
    ctx.fillRect(0, 0, 512, 512)
    drawPreview(animal, ctx, 512, 512, painted)
    if (animal === 'tiger') strokeTigerStripes(ctx)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  if (thumb) {
    const img = new Image()
    img.onload = () => {
      if (!ctx) return
      ctx.drawImage(img, 0, 0, 512, 512)
      tex.needsUpdate = true
    }
    img.src = thumb
  }
  return tex
}

function strokeTigerStripes(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = 'rgba(26,18,12,0.55)'
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  for (let i = 0; i < 8; i++) {
    const x = 90 + i * 42
    ctx.beginPath()
    ctx.moveTo(x, 160)
    ctx.quadraticCurveTo(x + 18, 260, x - 10, 360)
    ctx.stroke()
  }
}
