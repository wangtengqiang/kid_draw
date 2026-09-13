/**
 * 世界观展：把已送出的分区色画成 2D 动物。
 * 不读涂色画布。网页 3D 低模在 web/src/world-exhibition/models.ts。
 */
const { DEFAULTS } = require('../types.js')

function colorsOf(animalId, painted) {
  const base = DEFAULTS[animalId] || {}
  const out = {}
  Object.keys(base).forEach((k) => {
    out[k] = (painted && painted[k]) || base[k]
  })
  return out
}

function drawAnimal(ctx, animalId, painted, box) {
  const c = colorsOf(animalId, painted)
  const x = box.x + box.w / 2
  const y = box.y + box.h * 0.55
  const s = Math.min(box.w, box.h) * 0.42

  function blob(name, bx, by, bw, bh) {
    ctx.fillStyle = c[name] || '#e7d3b0'
    ctx.beginPath()
    ctx.ellipse(bx, by, bw / 2, bh / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#1a120c'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  if (animalId === 'deer') {
    blob('antler', x - s * 0.35, y - s * 1.15, s * 0.25, s * 0.7)
    blob('antler', x + s * 0.35, y - s * 1.15, s * 0.25, s * 0.7)
    blob('head', x, y - s * 0.7, s * 0.7, s * 0.55)
    blob('body', x, y, s * 1.3, s * 0.9)
    blob('belly', x, y + s * 0.1, s * 0.8, s * 0.5)
    blob('leg', x - s * 0.35, y + s * 0.7, s * 0.22, s * 0.7)
    blob('leg', x + s * 0.35, y + s * 0.7, s * 0.22, s * 0.7)
  } else if (animalId === 'tiger') {
    blob('head', x, y - s * 0.65, s * 0.85, s * 0.7)
    blob('body', x, y, s * 1.4, s * 0.85)
    blob('belly', x, y + s * 0.05, s * 0.85, s * 0.45)
    blob('leg', x - s * 0.4, y + s * 0.65, s * 0.28, s * 0.65)
    blob('leg', x + s * 0.4, y + s * 0.65, s * 0.28, s * 0.65)
  } else {
    blob('mane', x, y - s * 0.55, s * 1.15, s * 0.95)
    blob('head', x, y - s * 0.55, s * 0.7, s * 0.6)
    blob('body', x, y + s * 0.1, s * 1.25, s * 0.85)
    blob('belly', x, y + s * 0.15, s * 0.75, s * 0.45)
    blob('leg', x - s * 0.35, y + s * 0.7, s * 0.26, s * 0.6)
    blob('leg', x + s * 0.35, y + s * 0.7, s * 0.26, s * 0.6)
  }
}

module.exports = { drawAnimal }
