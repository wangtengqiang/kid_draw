/**
 * 儿童创作：只负责涂。不进主机森林、不写云。
 * 笔宽按画纸短边换算，细 / 中 / 粗差一截，不是同一颗点。
 */
const { PALETTE } = require('../types.js')
const { colorsOf, regionsOf } = require('./lineart.js')

const PAPER = '#fffdf7'
const REF = 360

const BRUSH_SIZES = [
  { name: '针', size: 3 },
  { name: '细', size: 8 },
  { name: '中', size: 18 },
  { name: '粗', size: 36 },
]

function PaintSurface(animalId) {
  this.animalId = animalId
  this.colorHex = PALETTE[3].hex
  this.brush = 8
  this.tool = 'brush'
  this.strokes = []
  this.current = null
}

PaintSurface.prototype.widthOf = function (brush) {
  return Math.max(1, Number(brush) || this.brush)
}

PaintSurface.prototype.brushAt = function (nx, ny) {
  const x = Math.max(0, Math.min(1, nx))
  const y = Math.max(0, Math.min(1, ny))
  const hex = this.tool === 'eraser' ? PAPER : this.colorHex
  const width = this.widthOf(this.brush)
  if (!this.current || this.current.hex !== hex || this.current.width !== width) {
    this.current = { hex: hex, width: width, points: [{ x: x, y: y }] }
    this.strokes.push(this.current)
  } else {
    const last = this.current.points[this.current.points.length - 1]
    const dist = Math.hypot(x - last.x, y - last.y)
    if (dist < 0.002) return
    this.current.points.push({ x: x, y: y })
  }
  if (this.strokes.length > 80) this.strokes = this.strokes.slice(-50)
}

PaintSurface.prototype.endStroke = function () {
  this.current = null
}

PaintSurface.prototype.drawOnto = function (ctx, box) {
  ctx.fillStyle = PAPER
  ctx.fillRect(box.x, box.y, box.w, box.h)
  const s = Math.min(box.w, box.h)
  const scale = s / REF
  this.strokes.forEach((stroke) => {
    if (stroke.points && stroke.points.length) {
      ctx.strokeStyle = stroke.hex
      ctx.fillStyle = stroke.hex
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = Math.max(1, stroke.width * scale)
      ctx.beginPath()
      stroke.points.forEach((p, i) => {
        const px = box.x + p.x * box.w
        const py = box.y + p.y * box.h
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      if (stroke.points.length === 1) {
        const p = stroke.points[0]
        ctx.beginPath()
        ctx.arc(box.x + p.x * box.w, box.y + p.y * box.h, ctx.lineWidth / 2, 0, Math.PI * 2)
        ctx.fill()
      } else ctx.stroke()
      return
    }
    if (stroke.x == null) return
    ctx.fillStyle = stroke.hex
    ctx.beginPath()
    ctx.arc(box.x + stroke.x * box.w, box.y + stroke.y * box.h, Math.max(1, (stroke.r || 0.02) * s), 0, Math.PI * 2)
    ctx.fill()
  })
}

PaintSurface.prototype.sampleRegions = function () {
  const out = colorsOf(this.animalId, {})
  const ink = []
  this.strokes.forEach((stroke) => {
    if (stroke.hex === PAPER) return
    if (stroke.points) {
      stroke.points.forEach((p) => ink.push({ hex: stroke.hex, x: p.x, y: p.y }))
    } else if (stroke.hex) ink.push(stroke)
  })
  if (!ink.length) return out
  let r = 0
  let g = 0
  let b = 0
  ink.forEach((d) => {
    const h = String(d.hex || '').replace('#', '')
    r += parseInt(h.slice(0, 2), 16) || 0
    g += parseInt(h.slice(2, 4), 16) || 0
    b += parseInt(h.slice(4, 6), 16) || 0
  })
  const n = ink.length
  const hex = rgbToHex(r / n, g / n, b / n)
  const light = rgbToHex(Math.min(255, r / n + 40), Math.min(255, g / n + 36), Math.min(255, b / n + 28))
  regionsOf(this.animalId).forEach((k) => {
    out[k] = k === 'belly' || k === 'muzzle' ? light : hex
  })
  return out
}

PaintSurface.prototype.averagePaintHex = function () {
  const out = this.sampleRegions()
  return out.body || out.head || null
}

PaintSurface.prototype.thumb = function () {
  return JSON.stringify({ animalId: this.animalId, strokes: this.strokes.slice() })
}

function rgbToHex(r, g, b) {
  const c = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

module.exports = { BRUSH_SIZES, PaintSurface, REF }
