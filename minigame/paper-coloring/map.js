/**
 * 纸上涂色：把照片中间一块当成身子颜色。
 * 不猜未知动物。完整四角透视对准在网页端。
 */
const { DEFAULTS } = require('../types.js')

function sampleBody(imageData) {
  if (!imageData || !imageData.data) return '#e24b4b'
  const { data, width: w, height: h } = imageData
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  const x0 = Math.floor(w * 0.3)
  const x1 = Math.floor(w * 0.7)
  const y0 = Math.floor(h * 0.35)
  const y1 = Math.floor(h * 0.7)
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * w + x) * 4
      const rr = data[i]
      const gg = data[i + 1]
      const bb = data[i + 2]
      if (rr + gg + bb > 700) continue
      r += rr
      g += gg
      b += bb
      n++
    }
  }
  if (!n) return '#e24b4b'
  const hex = (v) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0')
  return `#${hex(r / n)}${hex(g / n)}${hex(b / n)}`
}

function colorsFromPhoto(animalId, imageData) {
  const base = Object.assign({}, DEFAULTS[animalId] || {})
  base.body = sampleBody(imageData)
  return base
}

module.exports = { colorsFromPhoto, sampleBody }
