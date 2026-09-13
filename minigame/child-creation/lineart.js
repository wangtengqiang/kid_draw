/**
 * 儿童创作：2D 线稿。不是主机世界。
 */
const { DEFAULTS } = require('../types.js')

function regionsOf(animalId) {
  if (animalId === 'deer') return ['antler', 'head', 'body', 'belly', 'leg']
  if (animalId === 'tiger') return ['head', 'body', 'belly', 'leg']
  return ['mane', 'head', 'body', 'belly', 'leg']
}

function colorsOf(animalId, painted) {
  const base = DEFAULTS[animalId] || {}
  const out = {}
  regionsOf(animalId).forEach((k) => {
    out[k] = (painted && painted[k]) || base[k] || '#e7d3b0'
  })
  return out
}

/** 在矩形里画一只动物。hitAt 为 true 时返回点中的分区名。 */
function drawAnimal(ctx, animalId, painted, box, hitAt) {
  const c = colorsOf(animalId, painted)
  const x = box.x + box.w / 2
  const y = box.y + box.h * 0.55
  const s = Math.min(box.w, box.h) * 0.42
  const parts = []

  function blob(name, bx, by, bw, bh) {
    parts.push({ name: name, x: bx - bw / 2, y: by - bh / 2, w: bw, h: bh })
    ctx.fillStyle = c[name] || '#ccc'
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

  if (!hitAt) return null
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]
    const cx = p.x + p.w / 2
    const cy = p.y + p.h / 2
    const nx = (hitAt.x - cx) / (p.w / 2)
    const ny = (hitAt.y - cy) / (p.h / 2)
    if (nx * nx + ny * ny <= 1) return p.name
  }
  return null
}

module.exports = { drawAnimal, regionsOf, colorsOf }
