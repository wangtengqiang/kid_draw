/**
 * 纸上涂色：可打印的官方线稿。四角对准标记，不是 AI 认动物。
 */
import { drawLineArtReady, loadOfficialArt, officialLineArtSrc, pickCardSrc } from '../child-creation/lineart'
import type { AnimalId } from '../types'
import { ANIMAL_META } from '../types'

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
    ictx.fillStyle = '#fffaf1'
    ictx.fillRect(0, 0, inner.width, inner.height)
  }
  const ox = (TEMPLATE_W - inner.width) / 2
  const oy = 88
  if (ictx) ctx.drawImage(inner, ox, oy)

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
  canvas.dataset.animal = animal
  canvas.dataset.filled = filled ? '1' : '0'
  return canvas
}

async function paintOfficialInner(canvas: HTMLCanvasElement, animal: AnimalId, filled: boolean): Promise<void> {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const inner = document.createElement('canvas')
  inner.width = 720
  inner.height = 860
  const ictx = inner.getContext('2d')
  if (!ictx) return
  ictx.fillStyle = '#fffaf1'
  ictx.fillRect(0, 0, inner.width, inner.height)
  if (filled && pickCardSrc(animal)) {
    const img = await loadOfficialArt(pickCardSrc(animal)!)
    const pad = 24
    const scale = Math.min((inner.width - pad * 2) / img.naturalWidth, (inner.height - pad * 2) / img.naturalHeight)
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    ictx.drawImage(img, (inner.width - dw) / 2, (inner.height - dh) / 2, dw, dh)
  } else {
    await drawLineArtReady(animal, ictx, inner.width, inner.height)
  }
  const ox = (TEMPLATE_W - inner.width) / 2
  const oy = 88
  ctx.drawImage(inner, ox, oy)
}

export function renderTemplate(animal: AnimalId, filled = false): HTMLCanvasElement {
  return paintCanvas(animal, filled)
}

export async function renderTemplateReady(animal: AnimalId, filled = false): Promise<HTMLCanvasElement> {
  const canvas = paintCanvas(animal, filled)
  if (officialLineArtSrc(animal) || pickCardSrc(animal)) await paintOfficialInner(canvas, animal, filled)
  return canvas
}

export function templateDataUrl(animal: AnimalId, filled = false): string {
  return renderTemplate(animal, filled).toDataURL('image/png')
}

export async function templateDataUrlReady(animal: AnimalId, filled = false): Promise<string> {
  const canvas = await renderTemplateReady(animal, filled)
  return canvas.toDataURL('image/png')
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

export async function downloadTemplateReady(animal: AnimalId, filled = false): Promise<string> {
  const url = await templateDataUrlReady(animal, filled)
  rememberLastPaper(url, animal)
  const a = document.createElement('a')
  a.href = url
  a.download = filled ? `样张-涂好的${ANIMAL_META[animal].name}.png` : `线稿-${ANIMAL_META[animal].name}.png`
  a.click()
  return url
}
