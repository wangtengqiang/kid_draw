import type { AnimalId, ToolId } from './types'
import { drawLineArt, drawRegions, regionName } from './animals2d'

export class PaintSurface {
  readonly wrap: HTMLElement
  readonly color: HTMLCanvasElement
  readonly lines: HTMLCanvasElement
  readonly region: HTMLCanvasElement
  animal: AnimalId
  tool: ToolId = 'fill'
  colorHex = '#e24b4b'
  brush = 36
  private drawing = false
  private last: { x: number; y: number } | null = null
  private undoStack: ImageData[] = []
  private regionData: ImageData | null = null
  private onChange: () => void

  constructor(animal: AnimalId, onChange: () => void) {
    this.animal = animal
    this.onChange = onChange
    this.wrap = document.createElement('div')
    this.wrap.className = 'paint-stage'
    this.color = document.createElement('canvas')
    this.lines = document.createElement('canvas')
    this.region = document.createElement('canvas')
    this.color.className = 'paint-color'
    this.lines.className = 'paint-lines'
    this.wrap.append(this.color, this.lines)

    const size = 720
    for (const c of [this.color, this.lines, this.region]) {
      c.width = size
      c.height = Math.round(size * 1.15)
    }
    this.rebuild()
    this.bind()
  }

  rebuild(): void {
    const w = this.color.width
    const h = this.color.height
    const cctx = this.color.getContext('2d')
    const lctx = this.lines.getContext('2d')
    const rctx = this.region.getContext('2d')
    if (!cctx || !lctx || !rctx) return
    cctx.fillStyle = '#fffdf7'
    cctx.fillRect(0, 0, w, h)
    drawRegions(this.animal, rctx, w, h)
    this.regionData = rctx.getImageData(0, 0, w, h)
    drawLineArt(this.animal, lctx, w, h)
    this.undoStack = []
    this.snapshot()
    this.onChange()
  }

  setAnimal(animal: AnimalId): void {
    this.animal = animal
    this.rebuild()
  }

  private snapshot(): void {
    const ctx = this.color.getContext('2d')
    if (!ctx) return
    this.undoStack.push(ctx.getImageData(0, 0, this.color.width, this.color.height))
    if (this.undoStack.length > 16) this.undoStack.shift()
  }

  undo(): void {
    if (this.undoStack.length < 2) return
    this.undoStack.pop()
    const prev = this.undoStack[this.undoStack.length - 1]
    const ctx = this.color.getContext('2d')
    if (ctx && prev) ctx.putImageData(prev, 0, 0)
    this.onChange()
  }

  private local(e: PointerEvent): { x: number; y: number } {
    const r = this.color.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * this.color.width,
      y: ((e.clientY - r.top) / r.height) * this.color.height,
    }
  }

  private bind(): void {
    this.color.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      this.color.setPointerCapture(e.pointerId)
      const p = this.local(e)
      this.snapshot()
      if (this.tool === 'fill') {
        this.fillAt(p.x, p.y)
        this.drawing = false
        this.last = null
        this.onChange()
        return
      }
      this.drawing = true
      this.last = p
      this.stamp(p.x, p.y)
    })
    this.color.addEventListener('pointermove', (e) => {
      if (!this.drawing || !this.last) return
      const p = this.local(e)
      this.stroke(this.last, p)
      this.last = p
    })
    const stop = () => {
      if (this.drawing) this.onChange()
      this.drawing = false
      this.last = null
    }
    this.color.addEventListener('pointerup', stop)
    this.color.addEventListener('pointercancel', stop)
  }

  private stamp(x: number, y: number): void {
    const ctx = this.color.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.globalCompositeOperation = this.tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.fillStyle = this.colorHex
    ctx.beginPath()
    ctx.arc(x, y, this.brush, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    if (this.tool === 'eraser') {
      ctx.fillStyle = '#fffdf7'
      ctx.beginPath()
      ctx.arc(x, y, this.brush, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private stroke(a: { x: number; y: number }, b: { x: number; y: number }): void {
    const dist = Math.hypot(b.x - a.x, b.y - a.y)
    const step = Math.max(2, this.brush * 0.35)
    const n = Math.ceil(dist / step)
    for (let i = 0; i <= n; i++) {
      const t = i / Math.max(n, 1)
      this.stamp(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
    }
  }

  private fillAt(x: number, y: number): void {
    if (!this.regionData) return
    const ctx = this.color.getContext('2d')
    if (!ctx) return
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const w = this.color.width
    const idx = (iy * w + ix) * 4
    const rid = this.regionData.data[idx]
    const alpha = this.regionData.data[idx + 3]
    if (!rid || alpha < 10) return
    const rgb = hexToRgb(this.colorHex)
    const color = ctx.getImageData(0, 0, w, this.color.height)
    const r = this.regionData.data
    for (let i = 0; i < r.length; i += 4) {
      if (r[i] === rid && r[i + 3] > 10) {
        color.data[i] = rgb[0]
        color.data[i + 1] = rgb[1]
        color.data[i + 2] = rgb[2]
        color.data[i + 3] = 255
      }
    }
    ctx.putImageData(color, 0, 0)
  }

  sampleRegions(): Record<string, string> {
    if (!this.regionData) return {}
    const ctx = this.color.getContext('2d')
    if (!ctx) return {}
    const color = ctx.getImageData(0, 0, this.color.width, this.color.height)
    const sums: Record<number, { r: number; g: number; b: number; n: number }> = {}
    const r = this.regionData.data
    for (let i = 0; i < r.length; i += 4) {
      const id = r[i]
      if (!id || r[i + 3] < 10) continue
      const acc = (sums[id] ??= { r: 0, g: 0, b: 0, n: 0 })
      acc.r += color.data[i]
      acc.g += color.data[i + 1]
      acc.b += color.data[i + 2]
      acc.n++
    }
    const out: Record<string, string> = {}
    for (const [id, acc] of Object.entries(sums)) {
      const name = regionName(this.animal, Number(id))
      if (!name || acc.n < 8) continue
      out[name] = rgbToHex(acc.r / acc.n, acc.g / acc.n, acc.b / acc.n)
    }
    return out
  }

  thumb(): string {
    const out = document.createElement('canvas')
    out.width = 360
    out.height = 414
    const ctx = out.getContext('2d')
    if (!ctx) return ''
    ctx.fillStyle = '#fffaf1'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(this.color, 0, 0, out.width, out.height)
    ctx.drawImage(this.lines, 0, 0, out.width, out.height)
    return out.toDataURL('image/png')
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
