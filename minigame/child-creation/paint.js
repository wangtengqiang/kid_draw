/**
 * 儿童创作：只负责涂。不进主机森林、不写云。
 * 自由蜡笔：在纸上任意位置拖着画。颜色来自 PALETTE。
 */
const { PALETTE } = require('../types.js')
const { colorsOf, regionsOf } = require('./lineart.js')

const PAPER = '#fffdf7'

function PaintSurface(animalId) {
  this.animalId = animalId
  this.colorHex = PALETTE[3].hex
  this.brush = 28
  this.tool = 'brush'
  this.strokes = []
  this.last = null
}

PaintSurface.prototype.brushAt = function (nx, ny) {
  const x = Math.max(0, Math.min(1, nx))
  const y = Math.max(0, Math.min(1, ny))
  const r = this.brush / 420
  const hex = this.tool === 'eraser' ? PAPER : this.colorHex
  if (this.last) {
    const dx = x - this.last.x
    const dy = y - this.last.y
    const dist = Math.hypot(dx, dy)
    const step = Math.max(0.012, r * 0.45)
    const n = Math.max(1, Math.ceil(dist / step))
    for (let i = 1; i <= n; i++) {
      const t = i / n
      this.strokes.push({ x: this.last.x + dx * t, y: this.last.y + dy * t, r: r, hex: hex })
    }
  } else {
    this.strokes.push({ x: x, y: y, r: r, hex: hex })
  }
  this.last = { x: x, y: y }
  if (this.strokes.length > 4500) this.strokes = this.strokes.slice(-3200)
}

PaintSurface.prototype.endStroke = function () {
  this.last = null
}

PaintSurface.prototype.drawOnto = function (ctx, box) {
  ctx.fillStyle = PAPER
  ctx.fillRect(box.x, box.y, box.w, box.h)
  const s = Math.min(box.w, box.h)
  this.strokes.forEach((dot) => {
    ctx.fillStyle = dot.hex
    ctx.beginPath()
    ctx.arc(box.x + dot.x * box.w, box.y + dot.y * box.h, dot.r * s, 0, Math.PI * 2)
    ctx.fill()
  })
}

PaintSurface.prototype.sampleRegions = function () {
  const out = colorsOf(this.animalId, {})
  const ink = this.strokes.filter((d) => d.hex !== PAPER)
  if (!ink.length) return out
  let r = 0
  let g = 0
  let b = 0
  ink.forEach((d) => {
    const h = d.hex.replace('#', '')
    r += parseInt(h.slice(0, 2), 16)
    g += parseInt(h.slice(2, 4), 16)
    b += parseInt(h.slice(4, 6), 16)
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
  const ink = this.strokes.filter((d) => d.hex !== PAPER)
  if (!ink.length) return null
  let r = 0
  let g = 0
  let b = 0
  ink.forEach((d) => {
    const h = d.hex.replace('#', '')
    r += parseInt(h.slice(0, 2), 16)
    g += parseInt(h.slice(2, 4), 16)
    b += parseInt(h.slice(4, 6), 16)
  })
  return rgbToHex(r / ink.length, g / ink.length, b / ink.length)
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

module.exports = { PaintSurface }
