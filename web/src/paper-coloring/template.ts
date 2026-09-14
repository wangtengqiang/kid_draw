/**
 * 纸上涂色：可打印的官方线稿。四角对准标记，不是 AI 认动物。
 */
import { drawLineArt, drawPreview, drawRegions } from '../child-creation/lineart'
import type { AnimalId } from '../types'
import { ANIMAL_META, PALETTE } from '../types'

export const TEMPLATE_W = 900
export const TEMPLATE_H = 1272
export const MARK = 56
export const MARGIN = 36

export const LAST_PAPER_KEY = 'kid-draw-last-paper-png'

export type Point = { x: number; y: number }

export function markCenters(w = TEMPLATE_W, h = TEMPLATE_H): {
  tl: Point
  tr: Point
  bl: Point
  br: Point
} {
  const r = MARK / 2
  return {
    tl: { x: MARGIN + r, y: MARGIN + r },
    tr: { x: w - MARGIN - r, y: MARGIN + r },
    bl: { x: MARGIN + r, y: h - MARGIN - r },
    br: { x: w - MARGIN - r, y: h - MARGIN - r },
  }
}

function drawMark(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const s = MARK
  ctx.fillStyle = '#1a120c'
  ctx.fillRect(cx - s / 2, cy - s / 2, s, s)
  ctx.fillStyle = '#fffaf1'
  ctx.fillRect(cx - s / 2 + 10, cy - s / 2 + 10, s - 20, s - 20)
  ctx.fillStyle = '#1a120c'
  ctx.fillRect(cx - 8, cy - 8, 16, 16)
}

function paintCanvas(animal: AnimalId, filled: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = TEMPLATE_W
  canvas.height = TEMPLATE_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.fillStyle = '#fffaf1'
  ctx.fillRect(0, 0, TEMPLATE_W, TEMPLATE_H)

  const inner = document.createElement('canvas')
  inner.width = 720
  inner.height = 860
  const ictx = inner.getContext('2d')
  if (ictx) {
    if (filled) {
      drawPreview(animal, ictx, inner.width, inner.height)
      recolorBody(ictx, animal, inner.width, inner.height)
    } else {
      ictx.fillStyle = '#fffaf1'
      ictx.fillRect(0, 0, inner.width, inner.height)
      drawLineArt(animal, ictx, inner.width, inner.height)
    }
  }
  const ox = (TEMPLATE_W - inner.width) / 2
  const oy = 88
  ctx.drawImage(inner, ox, oy)

  ctx.fillStyle = '#1a120c'
  ctx.font = '800 36px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(ANIMAL_META[animal].name, TEMPLATE_W / 2, TEMPLATE_H - 28)
  ctx.font = '22px "PingFang SC", "Noto Sans SC", sans-serif'
  ctx.fillText('对准四角黑块拍照。不要换别的动物。', TEMPLATE_W / 2, 58)

  const m = markCenters()
  drawMark(ctx, m.tl.x, m.tl.y)
  drawMark(ctx, m.tr.x, m.tr.y)
  drawMark(ctx, m.bl.x, m.bl.y)
  drawMark(ctx, m.br.x, m.br.y)
  return canvas
}

/** 示范样张：身子涂成红色，方便网页预览看出「纸上的颜色进了世界」。 */
function recolorBody(ctx: CanvasRenderingContext2D, animal: AnimalId, w: number, h: number): void {
  const region = document.createElement('canvas')
  region.width = w
  region.height = h
  const rctx = region.getContext('2d')
  if (!rctx) return
  drawRegions(animal, rctx, w, h)
  const map = rctx.getImageData(0, 0, w, h)
  const color = ctx.getImageData(0, 0, w, h)
  const bodyId = animal === 'lion' ? 6 : 7
  const rgb = hexToRgb(PALETTE[3]!.hex)
  for (let i = 0; i < map.data.length; i += 4) {
    if (map.data[i] === bodyId && map.data[i + 3] > 10) {
      color.data[i] = rgb[0]
      color.data[i + 1] = rgb[1]
      color.data[i + 2] = rgb[2]
      color.data[i + 3] = 255
    }
  }
  ctx.putImageData(color, 0, 0)
  drawLineArt(animal, ctx, w, h)
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function renderTemplate(animal: AnimalId, filled = false): HTMLCanvasElement {
  return paintCanvas(animal, filled)
}

export function templateDataUrl(animal: AnimalId, filled = false): string {
  return renderTemplate(animal, filled).toDataURL('image/png')
}

export function rememberLastPaper(dataUrl: string, animalId: AnimalId): void {
  localStorage.setItem(LAST_PAPER_KEY, JSON.stringify({ dataUrl, animalId }))
}

export function lastPaper(): { dataUrl: string; animalId: AnimalId } | null {
  try {
    const raw = localStorage.getItem(LAST_PAPER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { dataUrl: string; animalId: AnimalId }
  } catch {
    return null
  }
}

export function downloadTemplate(animal: AnimalId, filled = false): string {
  const url = templateDataUrl(animal, filled)
  rememberLastPaper(url, animal)
  const a = document.createElement('a')
  a.href = url
  a.download = filled ? `样张-涂好的${ANIMAL_META[animal].name}.png` : `线稿-${ANIMAL_META[animal].name}.png`
  a.click()
  return url
}
